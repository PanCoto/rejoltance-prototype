// RE:Joltance matchmaking + ranking server (Cloudflare Workers, free plan).
// Everything lives in ONE Durable Object ("Hub", SQLite storage): accounts, Elo ratings, the matchmaking queues (WebSockets with hibernation),
// match records and the leaderboard. The game itself is still peer-to-peer (PeerJS); this server only pairs players, hands them a room code
// and records the agreed result.
//
//   GET  /api/ping                      -> { ok, v, ranked, casual }          (health check + how many players are searching)
//   POST /api/register {name}           -> { uid, key, name, rating }         (creates an account; "key" is the secret, store it)
//   POST /api/me                        -> profile + rank                      (auth)
//   POST /api/rename {name}             -> profile                             (auth)
//   GET  /api/leaderboard?limit=50      -> [{ name, rating, games, wins, losses, rank }]
//   POST /api/report {id, r, turns}     -> { st, delta, rating }              (auth; r = win | loss | draw | abort)
//   GET  /api/match?id=                 -> { st, delta, rating }              (auth; poll after reporting)
//   WS   /api/queue                     -> first message {t:'join',uid,key,mode:'ranked'|'casual',v}; server answers {t:'match',...}
// Auth = "Authorization: Bearer <uid>.<key>" (HTTP) or uid/key inside the join message (WebSocket).
import { DurableObject } from 'cloudflare:workers';

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const START = 1000, WAIT_ABORT = 100000, SINGLE_REPORT_MS = 120000, EXPIRE_MS = 900000, PAIR_LIMIT = 3;
const rnd = (n, set) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => set[x % set.length]).join(''); };
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    const cors = { 'access-control-allow-origin': env.ALLOW_ORIGIN || '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-max-age': '86400' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return new Response('RE:Joltance matchmaking server', { headers: cors });
    if (env.ALLOW_ORIGIN && env.ALLOW_ORIGIN !== '*' && req.headers.get('upgrade') === 'websocket') {
      const o = req.headers.get('origin'); if (o && o !== env.ALLOW_ORIGIN) return new Response('forbidden', { status: 403 });
    }
    const hub = env.HUB.get(env.HUB.idFromName('main'));
    const res = await hub.fetch(req);
    if (res.status === 101) return res;
    const r = new Response(res.body, res); for (const k in cors) r.headers.set(k, cors[k]); return r;
  }
};

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.rate = new Map(); this.lbCache = null;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts(uid TEXT PRIMARY KEY, hash TEXT NOT NULL, name TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT ${START},
        games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0, created INTEGER, last INTEGER);
        CREATE INDEX IF NOT EXISTS acc_rating ON accounts(rating DESC);
        CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, p1 TEXT NOT NULL, p2 TEXT NOT NULL, created INTEGER NOT NULL, r1 TEXT, r2 TEXT, t1 INTEGER, t2 INTEGER,
        status TEXT NOT NULL DEFAULT 'open', d1 INTEGER, d2 INTEGER);
        CREATE INDEX IF NOT EXISTS m_status ON matches(status, created);
        CREATE TABLE IF NOT EXISTS regs(ip TEXT, day INTEGER, n INTEGER, PRIMARY KEY(ip, day));`);
    });
  }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  all(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  limited(ip, max) { const m = Math.floor(Date.now() / 60000), e = this.rate.get(ip); if (!e || e.m !== m) { this.rate.set(ip, { m, n: 1 }); if (this.rate.size > 5000) this.rate.clear(); return false; } return ++e.n > max; }
  async auth(uid, key) {
    if (typeof uid !== 'string' || typeof key !== 'string' || uid.length > 12 || key.length > 64) return null;
    const a = this.one('SELECT * FROM accounts WHERE uid=?', uid); if (!a) return null;
    return (await sha(key)) === a.hash ? a : null;
  }
  async authHdr(req) { const m = /^Bearer ([^.]+)\.(.+)$/.exec(req.headers.get('authorization') || ''); return m ? this.auth(m[1], m[2]) : null; }
  rankOf(a) { return a.games > 0 ? 1 + this.one('SELECT COUNT(*) c FROM accounts WHERE games>0 AND rating>?', a.rating).c : null; }
  prof(a) { return { uid: a.uid, name: a.name, rating: a.rating, games: a.games, wins: a.wins, losses: a.losses, draws: a.draws, rank: this.rankOf(a) }; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, ip = req.headers.get('cf-connecting-ip') || 'x';
    if (p === '/api/queue') {
      if (req.headers.get('upgrade') !== 'websocket') return json({ error: 'websocket expected' }, 426);
      const pair = new WebSocketPair(), [cl, sv] = Object.values(pair);
      this.ctx.acceptWebSocket(sv); sv.serializeAttachment({ at: Date.now() }); this.schedule();
      return new Response(null, { status: 101, webSocket: cl });
    }
    if (this.limited(ip, 120)) return json({ error: 'rate limited' }, 429);
    try {
      if (p === '/api/ping') { const q = this.counts(); return json({ ok: 1, v: 1, ranked: q.ranked, casual: q.casual }); }
      if (p === '/api/register' && req.method === 'POST') return await this.register(req, ip);
      if (p === '/api/leaderboard') return json(this.board(Math.min(100, Math.max(1, +url.searchParams.get('limit') || 50))));
      const a = await this.authHdr(req); if (!a) return json({ error: 'auth' }, 401);
      this.sql.exec('UPDATE accounts SET last=? WHERE uid=?', Date.now(), a.uid);
      if (p === '/api/me') return json(this.prof(a));
      if (p === '/api/rename' && req.method === 'POST') {
        const n = cleanName((await req.json()).name); if (!n) return json({ error: 'name' }, 400);
        this.sql.exec('UPDATE accounts SET name=? WHERE uid=?', n, a.uid); this.lbCache = null; return json(this.prof({ ...a, name: n }));
      }
      if (p === '/api/report' && req.method === 'POST') return json(this.report(a, await req.json()));
      if (p === '/api/match') return json(this.matchInfo(a, url.searchParams.get('id')));
    } catch (e) { return json({ error: 'bad request' }, 400); }
    return json({ error: 'not found' }, 404);
  }

  async register(req, ip) {
    const day = Math.floor(Date.now() / 86400000), r = this.one('SELECT n FROM regs WHERE ip=? AND day=?', ip, day);
    if (r && r.n >= 8) return json({ error: 'Too many accounts created from this network today.' }, 429);
    const name = cleanName((await req.json()).name) || 'Player' + rnd(4, '0123456789');
    let uid; do { uid = rnd(8, 'abcdefghjkmnpqrstuvwxyz23456789'); } while (this.one('SELECT 1 x FROM accounts WHERE uid=?', uid));
    const key = rnd(32, B64), now = Date.now();
    this.sql.exec('INSERT INTO accounts(uid,hash,name,rating,created,last) VALUES(?,?,?,?,?,?)', uid, await sha(key), name, START, now, now);
    this.sql.exec('INSERT INTO regs(ip,day,n) VALUES(?,?,1) ON CONFLICT(ip,day) DO UPDATE SET n=n+1', ip, day);
    this.sql.exec('DELETE FROM regs WHERE day<?', day - 2);
    return json({ uid, key, name, rating: START });
  }
  board(limit) {
    if (!this.lbCache || Date.now() - this.lbCache.t > 20000) {
      const rows = this.all('SELECT name,rating,games,wins,losses FROM accounts WHERE games>0 ORDER BY rating DESC, games DESC LIMIT 100');
      this.lbCache = { t: Date.now(), rows: rows.map((r, i) => ({ ...r, rank: i + 1 })) };
    }
    return this.lbCache.rows.slice(0, limit);
  }

  // ---------- queue (WebSocket, hibernation API) ----------
  counts() { const c = { ranked: 0, casual: 0 }; for (const w of this.ctx.getWebSockets()) { const t = w.deserializeAttachment(); if (t && t.mode) c[t.mode]++; } return c; }
  async webSocketMessage(ws, msg) {
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (m.t === 'leave') return ws.close(1000, 'left');
    if (m.t !== 'join') return;
    const mode = m.mode === 'ranked' ? 'ranked' : 'casual', v = String(m.v || '').slice(0, 24);
    const a = await this.auth(m.uid, m.key);
    if (!a) { ws.send(JSON.stringify({ t: 'err', code: 'auth', msg: 'Account not recognised.' })); return ws.close(1008, 'auth'); }
    for (const o of this.ctx.getWebSockets()) { const t = o.deserializeAttachment(); if (o !== ws && t && t.uid === a.uid) { try { o.send(JSON.stringify({ t: 'err', code: 'dup', msg: 'You started searching somewhere else.' })); o.close(1000, 'dup'); } catch (e) {} } }
    ws.serializeAttachment({ uid: a.uid, name: a.name, rating: a.rating, mode, v, since: Date.now() });
    ws.send(JSON.stringify({ t: 'queued', mode, rating: a.rating }));
    this.pairAll(); this.schedule();
  }
  async webSocketClose(ws) { try { ws.close(); } catch (e) {} }
  async webSocketError(ws) { try { ws.close(); } catch (e) {} }
  win(w) { return 75 + 20 * w; }   // rating window (points) grows with seconds waited: after ~60 s anybody can be matched
  pairAll() {
    const now = Date.now(), groups = {};
    for (const w of this.ctx.getWebSockets()) { const t = w.deserializeAttachment(); if (t && t.mode) (groups[t.mode + '|' + t.v] ||= []).push({ w, t }); }
    for (const g of Object.values(groups)) {
      g.sort((x, y) => x.t.since - y.t.since); const used = new Set();
      for (const A of g) {
        if (used.has(A)) continue; let best = null, bd = 1e9;
        for (const B of g) {
          if (B === A || used.has(B)) continue; const d = Math.abs(A.t.rating - B.t.rating);
          if (A.t.mode === 'ranked') { const lim = Math.max(this.win((now - A.t.since) / 1000), this.win((now - B.t.since) / 1000)); if (d > lim) continue; }
          if (d < bd) { bd = d; best = B; }
        }
        if (best) { used.add(A); used.add(best); this.makeMatch(A, best); }
      }
    }
  }
  makeMatch(A, B) {
    const mode = A.t.mode, id = rnd(12, B64), code = rnd(5, ALPH), now = Date.now(), aHost = Math.random() < .5;
    if (mode === 'ranked') this.sql.exec('INSERT INTO matches(id,p1,p2,created) VALUES(?,?,?,?)', id, A.t.uid, B.t.uid, now);
    const send = (X, Y, host) => { try { X.w.send(JSON.stringify({ t: 'match', id: mode === 'ranked' ? id : '', mode, code, role: host ? 'host' : 'guest', opp: { name: Y.t.name, rating: Y.t.rating } })); X.w.close(1000, 'matched'); } catch (e) {} };
    send(A, B, aHost); send(B, A, !aHost);
  }

  // ---------- results ----------
  matchInfo(a, id) {
    const m = this.one('SELECT * FROM matches WHERE id=?', String(id || '')); if (!m || (m.p1 !== a.uid && m.p2 !== a.uid)) return { st: 'none' };
    const me = m.p1 === a.uid ? 1 : 2, d = me === 1 ? m.d1 : m.d2, acc = this.one('SELECT rating FROM accounts WHERE uid=?', a.uid);
    return { st: m.status, delta: d == null ? 0 : d, rating: acc.rating };
  }
  report(a, b) {
    const m = this.one('SELECT * FROM matches WHERE id=?', String(b.id || '')); if (!m || (m.p1 !== a.uid && m.p2 !== a.uid)) return { st: 'none' };
    const me = m.p1 === a.uid ? 1 : 2, r = b.r, now = Date.now();
    if (m.status !== 'open') return this.matchInfo(a, m.id);
    if (r === 'abort') { if (now - m.created < WAIT_ABORT && !m.r1 && !m.r2) this.sql.exec("UPDATE matches SET status='void' WHERE id=?", m.id); return this.matchInfo(a, m.id); }
    if (!['win', 'loss', 'draw'].includes(r)) return { st: 'none' };
    if (m[me === 1 ? 'r1' : 'r2']) return this.matchInfo(a, m.id);
    this.sql.exec(`UPDATE matches SET r${me}=?, t${me}=? WHERE id=?`, r, now, m.id);
    const f = this.one('SELECT * FROM matches WHERE id=?', m.id);
    if (f.r1 && f.r2) this.resolve(f, false); else this.schedule();
    return this.matchInfo(a, m.id);
  }
  // outcome from p1's point of view, derived from each side's own report; null = the two reports contradict each other
  outcome(m, lone) {
    const s = r => r === 'win' ? 1 : r === 'loss' ? 0 : r === 'draw' ? .5 : null;
    const x1 = s(m.r1), x2 = m.r2 ? 1 - s(m.r2) : null;
    if (lone) return x1 != null ? x1 : x2;
    return x1 === x2 ? x1 : null;
  }
  resolve(m, lone) {
    const o = this.outcome(m, lone);
    if (o == null) return this.sql.exec("UPDATE matches SET status='void' WHERE id=?", m.id);
    const recent = this.one("SELECT COUNT(*) c FROM matches WHERE status='done' AND created>? AND ((p1=? AND p2=?) OR (p1=? AND p2=?))", Date.now() - 86400000, m.p1, m.p2, m.p2, m.p1).c;
    if (recent >= PAIR_LIMIT) return this.sql.exec("UPDATE matches SET status='unrated', d1=0, d2=0 WHERE id=?", m.id);
    const A = this.one('SELECT * FROM accounts WHERE uid=?', m.p1), B = this.one('SELECT * FROM accounts WHERE uid=?', m.p2);
    const E = 1 / (1 + Math.pow(10, (B.rating - A.rating) / 400)), K = x => x.games < 10 ? 40 : 24;
    const d1 = Math.round(K(A) * (o - E)), d2 = Math.round(K(B) * ((1 - o) - (1 - E)));
    const up = (x, d, s) => this.sql.exec('UPDATE accounts SET rating=MAX(100,rating+?), games=games+1, wins=wins+?, losses=losses+?, draws=draws+? WHERE uid=?', d, s === 1 ? 1 : 0, s === 0 ? 1 : 0, s === .5 ? 1 : 0, x.uid);
    up(A, d1, o); up(B, d2, 1 - o);
    this.sql.exec("UPDATE matches SET status='done', d1=?, d2=? WHERE id=?", d1, d2, m.id); this.lbCache = null;
  }

  // ---------- alarm: queue re-evaluation (windows widen over time) + finishing matches with one report ----------
  schedule() {
    const now = Date.now(); let t = Infinity, ws = this.ctx.getWebSockets(), q = 0;
    for (const w of ws) { const a = w.deserializeAttachment(); if (a && a.mode) q++; else if (a) t = Math.min(t, a.at + 12000); }
    if (q >= 2) t = Math.min(t, now + 3000);
    const open = this.one("SELECT MIN(COALESCE(MIN(t1,t2), t1, t2)) a, MIN(created) c FROM matches WHERE status='open'");
    if (open && open.a != null) t = Math.min(t, open.a + SINGLE_REPORT_MS);
    if (open && open.c != null) t = Math.min(t, open.c + EXPIRE_MS);
    if (t < Infinity) this.ctx.storage.setAlarm(Math.max(now + 500, t));
  }
  async alarm() {
    const now = Date.now();
    for (const w of this.ctx.getWebSockets()) { const a = w.deserializeAttachment(); if (a && !a.mode && now - a.at > 10000) { try { w.close(1008, 'idle'); } catch (e) {} } }
    this.pairAll();
    for (const m of this.all("SELECT * FROM matches WHERE status='open'")) {
      const rep = [m.t1, m.t2].filter(Boolean), first = rep.length ? Math.min(...rep) : null;
      if (first && now - first >= SINGLE_REPORT_MS) this.resolve(m, true);
      else if (!first && now - m.created >= EXPIRE_MS) this.sql.exec("UPDATE matches SET status='void' WHERE id=?", m.id);
    }
    this.schedule();
  }
}
