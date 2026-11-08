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
//   POST /api/avatar {avatar}           -> profile                             (auth; avatar = card id, 0 = none)
//   GET  /api/player?pid=               -> public profile (+ friend relation when signed in)
//   GET  /api/search?q=                 -> [{ pid, name, rating, avatar, games }]  (players by name, max 10)
//   POST /api/friends                   -> { friends, incoming, outgoing }     (auth)
//   POST /api/friends/request|accept|remove {pid} -> { rel }                   (auth; rel = none|friends|pending_out|pending_in)
//   POST /api/challenge {act:'send',pid}  -> { id, code }                      (auth; friends only; the sender hosts the room `code`)
//   POST /api/challenge {act:'poll',id?}  -> { incoming:[{id,pid,name,avatar,rating}], out:{st} }  (auth; st = pending|accepted|declined|gone)
//   POST /api/challenge {act:'accept'|'decline',id} -> { code, opp } | { ok }  (auth; decline also cancels your own challenge)
// Auth = "Authorization: Bearer <uid>.<key>" (HTTP) or uid/key inside the join message (WebSocket).
import { DurableObject } from 'cloudflare:workers';

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const CH_MS = 35000, START = 1000, WAIT_ABORT = 100000, SINGLE_REPORT_MS = 120000, EXPIRE_MS = 900000, PAIR_LIMIT = 100;
const rnd = (n, set) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => set[x % set.length]).join(''); };
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    const cors = { 'access-control-allow-origin': env.ALLOW_ORIGIN || '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-max-age': '86400' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) return new Response('RE:Joltance matchmaking server', { headers: cors });
    if (env.ALLOW_ORIGIN && env.ALLOW_ORIGIN !== '*' && req.headers.get('upgrade') === 'websocket') {
      const o = req.headers.get('origin'); if (o && o !== env.ALLOW_ORIGIN) return new Response('forbidden', { status: 403 });
    }
    const hub = env.HUB.get(env.HUB.idFromName('main'));
    const res = await hub.fetch(req);
    if (res.status === 101 || url.pathname.startsWith('/auth/')) return res;
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
        CREATE TABLE IF NOT EXISTS regs(ip TEXT, day INTEGER, n INTEGER, PRIMARY KEY(ip, day));
        CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, uid TEXT NOT NULL, created INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS sess_uid ON sessions(uid, created);
        CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY, uid TEXT, nh TEXT NOT NULL, created INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS otc(code TEXT PRIMARY KEY, uid TEXT NOT NULL, nh TEXT NOT NULL, mode TEXT NOT NULL, created INTEGER NOT NULL);`);
      const cols = this.all('PRAGMA table_info(accounts)').map(c => c.name);
      if (!cols.includes('discord_id')) this.sql.exec('ALTER TABLE accounts ADD COLUMN discord_id TEXT');
      if (!cols.includes('discord_name')) this.sql.exec('ALTER TABLE accounts ADD COLUMN discord_name TEXT');
      this.sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS acc_discord ON accounts(discord_id) WHERE discord_id IS NOT NULL');
      if (!cols.includes('avatar')) this.sql.exec('ALTER TABLE accounts ADD COLUMN avatar INTEGER NOT NULL DEFAULT 0');
      if (!cols.includes('pid')) this.sql.exec('ALTER TABLE accounts ADD COLUMN pid TEXT');   // public id: used in profile links and friends, never works as a login
      for (const r of this.all('SELECT uid FROM accounts WHERE pid IS NULL')) this.sql.exec('UPDATE accounts SET pid=? WHERE uid=?', this.newPid(), r.uid);
      this.sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS acc_pid ON accounts(pid)');
      this.sql.exec(`CREATE TABLE IF NOT EXISTS friends(a TEXT NOT NULL, b TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(a,b));
        CREATE INDEX IF NOT EXISTS fr_b ON friends(b);
        CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT NOT NULL, code TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS ch_b ON challenges(b, status);`);
    });
  }
  newPid() { let p; do { p = rnd(10, 'abcdefghjkmnpqrstuvwxyz23456789'); } while (this.one('SELECT 1 x FROM accounts WHERE pid=?', p)); return p; }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  all(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  limited(ip, max) { const m = Math.floor(Date.now() / 60000), e = this.rate.get(ip); if (!e || e.m !== m) { this.rate.set(ip, { m, n: 1 }); if (this.rate.size > 5000) this.rate.clear(); return false; } return ++e.n > max; }
  async auth(uid, key) {
    if (typeof uid !== 'string' || typeof key !== 'string' || uid.length > 12 || key.length > 64) return null;
    const a = this.one('SELECT * FROM accounts WHERE uid=?', uid); if (!a) return null;
    const h = await sha(key);
    if (h === a.hash) return a;
    return this.one('SELECT 1 x FROM sessions WHERE hash=? AND uid=?', h, uid) ? a : null;
  }
  async authHdr(req) { const m = /^Bearer ([^.]+)\.(.+)$/.exec(req.headers.get('authorization') || ''); return m ? this.auth(m[1], m[2]) : null; }
  rankOf(a) { return a.games > 0 ? 1 + this.one('SELECT COUNT(*) c FROM accounts WHERE games>0 AND rating>?', a.rating).c : null; }
  prof(a) { return { uid: a.uid, pid: a.pid, avatar: a.avatar || 0, name: a.name, rating: a.rating, games: a.games, wins: a.wins, losses: a.losses, draws: a.draws, rank: this.rankOf(a), discord: a.discord_name || null, created: a.created || null, last: a.last || null }; }

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
      if (p === '/api/ping') { const q = this.counts(); return json({ ok: 1, v: 1, ranked: q.ranked, casual: q.casual, discord: this.dcOn(), needDiscord: this.env.REQUIRE_DISCORD === '1' }); }
      if (p === '/api/register' && req.method === 'POST') return await this.register(req, ip);
      if (p === '/auth/discord/callback') return await this.dcCallback(url);
      if (p === '/api/discord/begin' && req.method === 'POST') return await this.dcBegin(req, url);
      if (p === '/api/discord/claim' && req.method === 'POST') return await this.dcClaim(req);
      if (p === '/api/player') return json(await this.player(req, url.searchParams.get('pid')));
      if (p === '/api/search') return json(this.search(url.searchParams.get('q')));
      if (p === '/api/leaderboard') return json(this.board(Math.min(100, Math.max(1, +url.searchParams.get('limit') || 50))));
      const a = await this.authHdr(req); if (!a) return json({ error: 'auth' }, 401);
      this.sql.exec('UPDATE accounts SET last=? WHERE uid=?', Date.now(), a.uid);
      if (p === '/api/me') return json(this.prof(a));
      if (p === '/api/rename' && req.method === 'POST') {
        const n = cleanName((await req.json()).name); if (!n) return json({ error: 'name' }, 400);
        this.sql.exec('UPDATE accounts SET name=? WHERE uid=?', n, a.uid); this.lbCache = null; return json(this.prof({ ...a, name: n }));
      }
      if (p === '/api/avatar' && req.method === 'POST') {
        const v = Math.floor(+(await req.json()).avatar); if (!(v >= 0 && v <= 5000)) return json({ error: 'avatar' }, 400);
        this.sql.exec('UPDATE accounts SET avatar=? WHERE uid=?', v, a.uid); this.lbCache = null; return json(this.prof({ ...a, avatar: v }));
      }
      if (p === '/api/friends') return json(this.friendList(a));
      if (p.startsWith('/api/friends/') && req.method === 'POST') return json(this.friendAct(a, p.slice(13), String((await req.json()).pid || '')));
      if (p === '/api/challenge' && req.method === 'POST') return json(this.challengeAct(a, await req.json()));
      if (p === '/api/delete' && req.method === 'POST') return json(this.destroyAccount(a));
      if (p === '/api/report' && req.method === 'POST') return json(this.report(a, await req.json()));
      if (p === '/api/match') return json(this.matchInfo(a, url.searchParams.get('id')));
    } catch (e) { return json({ error: 'bad request' }, 400); }
    return json({ error: 'not found' }, 404);
  }

  // ---------- Discord login (OAuth2 code flow, scope "identify") ----------
  // begin -> browser goes to Discord -> Discord redirects to /auth/discord/callback -> we redirect to GAME_URL#dc=<one-time code> -> the game claims it.
  // The client keeps a random nonce in its localStorage; the code can only be claimed with that nonce, so a link started by someone else is useless.
  dcOn() { const e = this.env; return !!(e.DISCORD_CLIENT_ID && e.DISCORD_CLIENT_SECRET && e.GAME_URL); }
  async dcBegin(req, url) {
    if (!this.dcOn()) return json({ error: 'Discord login is not configured on the server.' }, 501);
    const e = this.env, n = String((await req.json()).n || '');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(n)) return json({ error: 'bad request' }, 400);
    let uid = null;
    if (req.headers.get('authorization')) { const a = await this.authHdr(req); if (!a) return json({ error: 'auth' }, 401); uid = a.uid; }   // signed in: LINK, otherwise: LOGIN
    const state = rnd(32, B64), now = Date.now();
    this.sql.exec('DELETE FROM oauth WHERE created<?', now - 600000);
    this.sql.exec('INSERT INTO oauth(state,uid,nh,created) VALUES(?,?,?,?)', state, uid, await sha(n), now);
    const q = new URLSearchParams({ client_id: e.DISCORD_CLIENT_ID, response_type: 'code', scope: 'identify', redirect_uri: (e.PUBLIC_URL || url.origin) + '/auth/discord/callback', state, prompt: 'none' });
    return json({ url: (e.DISCORD_AUTH || 'https://discord.com/oauth2/authorize') + '?' + q, mode: uid ? 'link' : 'login' });
  }
  async dcCallback(url) {
    const e = this.env; if (!this.dcOn()) return new Response('Discord login is not configured.', { status: 501 });
    const back = p => new Response(null, { status: 302, headers: { location: e.GAME_URL + '#' + p, 'cache-control': 'no-store' } });
    const state = url.searchParams.get('state') || '', code = url.searchParams.get('code');
    const st = this.one('SELECT * FROM oauth WHERE state=?', state); this.sql.exec('DELETE FROM oauth WHERE state=?', state);
    if (!st || Date.now() - st.created > 600000) return back('dcerr=state');
    if (!code) return back('dcerr=denied');
    let du, api = e.DISCORD_API || 'https://discord.com/api';
    try {
      const tr = await fetch(api + '/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: e.DISCORD_CLIENT_ID, client_secret: e.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: (e.PUBLIC_URL || url.origin) + '/auth/discord/callback' }) });
      if (!tr.ok) return back('dcerr=failed');
      const tok = (await tr.json()).access_token;
      const ur = await fetch(api + '/users/@me', { headers: { authorization: 'Bearer ' + tok } });
      if (!ur.ok) return back('dcerr=failed'); du = await ur.json();
    } catch (x) { return back('dcerr=failed'); }
    if (!du || !du.id) return back('dcerr=failed');
    const did = String(du.id), dname = cleanName(du.global_name || du.username) || 'Player', now = Date.now();
    const owner = this.one('SELECT uid FROM accounts WHERE discord_id=?', did); let uid = st.uid;
    if (uid) {   // LINK this Discord account to the signed-in game account
      if (owner && owner.uid !== uid) return back('dcerr=taken');
      if (!this.one('SELECT 1 x FROM accounts WHERE uid=?', uid)) return back('dcerr=failed');
      this.sql.exec('UPDATE accounts SET discord_id=?, discord_name=? WHERE uid=?', did, dname, uid);
    } else if (owner) {   // LOGIN to the existing account
      uid = owner.uid; this.sql.exec('UPDATE accounts SET discord_name=? WHERE uid=?', dname, uid);
    } else {   // LOGIN, first time: create the account (its old-style key is random and unknown to everybody; devices get session keys)
      do { uid = rnd(8, 'abcdefghjkmnpqrstuvwxyz23456789'); } while (this.one('SELECT 1 x FROM accounts WHERE uid=?', uid));
      this.sql.exec('INSERT INTO accounts(uid,hash,name,rating,created,last,discord_id,discord_name,pid) VALUES(?,?,?,?,?,?,?,?,?)', uid, await sha(rnd(40, B64)), dname, START, now, now, did, dname, this.newPid());
    }
    const otc = rnd(32, B64); this.sql.exec('DELETE FROM otc WHERE created<?', now - 120000);
    this.sql.exec('INSERT INTO otc(code,uid,nh,mode,created) VALUES(?,?,?,?,?)', otc, uid, st.nh, st.uid ? 'link' : 'login', now);
    this.lbCache = null;
    return back('dc=' + otc);
  }
  async dcClaim(req) {
    const b = await req.json(), code = String(b.code || ''), n = String(b.n || '');
    const row = this.one('SELECT * FROM otc WHERE code=?', code); this.sql.exec('DELETE FROM otc WHERE code=?', code);
    if (!row || Date.now() - row.created > 120000 || row.nh !== await sha(n)) return json({ error: 'invalid' }, 400);
    const a = this.one('SELECT * FROM accounts WHERE uid=?', row.uid); if (!a) return json({ error: 'invalid' }, 400);
    let key = null;
    if (row.mode === 'login') {   // a fresh key for this device; the account's other devices keep working
      key = rnd(32, B64); this.sql.exec('INSERT INTO sessions(hash,uid,created) VALUES(?,?,?)', await sha(key), a.uid, Date.now());
      this.sql.exec('DELETE FROM sessions WHERE uid=? AND hash NOT IN (SELECT hash FROM sessions WHERE uid=? ORDER BY created DESC LIMIT 10)', a.uid, a.uid);
    }
    return json({ ...this.prof(a), key, mode: row.mode });
  }
  destroyAccount(a) {
    for (const w of this.ctx.getWebSockets()) { const t = w.deserializeAttachment(); if (t && t.uid === a.uid) { try { w.close(1000, 'deleted'); } catch (e) {} } }
    this.sql.exec("UPDATE matches SET status='void' WHERE status='open' AND (p1=? OR p2=?)", a.uid, a.uid);
    for (const q of ['DELETE FROM sessions WHERE uid=?', 'DELETE FROM oauth WHERE uid=?', 'DELETE FROM otc WHERE uid=?', 'DELETE FROM accounts WHERE uid=?']) this.sql.exec(q, a.uid);
    this.sql.exec('DELETE FROM friends WHERE a=? OR b=?', a.uid, a.uid);
    this.sql.exec('DELETE FROM challenges WHERE a=? OR b=?', a.uid, a.uid);
    this.lbCache = null; return { ok: 1 };
  }

  async register(req, ip) {
    const day = Math.floor(Date.now() / 86400000), r = this.one('SELECT n FROM regs WHERE ip=? AND day=?', ip, day);
    if (r && r.n >= 8) return json({ error: 'Too many accounts created from this network today.' }, 429);
    const name = cleanName((await req.json()).name) || 'Player' + rnd(4, '0123456789');
    let uid; do { uid = rnd(8, 'abcdefghjkmnpqrstuvwxyz23456789'); } while (this.one('SELECT 1 x FROM accounts WHERE uid=?', uid));
    const key = rnd(32, B64), now = Date.now();
    this.sql.exec('INSERT INTO accounts(uid,hash,name,rating,created,last,pid) VALUES(?,?,?,?,?,?,?)', uid, await sha(key), name, START, now, now, this.newPid());
    this.sql.exec('INSERT INTO regs(ip,day,n) VALUES(?,?,1) ON CONFLICT(ip,day) DO UPDATE SET n=n+1', ip, day);
    this.sql.exec('DELETE FROM regs WHERE day<?', day - 2);
    return json({ uid, key, name, rating: START });
  }
  board(limit) {
    if (!this.lbCache || Date.now() - this.lbCache.t > 20000) {
      const rows = this.all('SELECT pid,name,avatar,rating,games,wins,losses FROM accounts WHERE games>0 ORDER BY rating DESC, games DESC LIMIT 100');
      this.lbCache = { t: Date.now(), rows: rows.map((r, i) => ({ ...r, rank: i + 1 })) };
    }
    return this.lbCache.rows.slice(0, limit);
  }

  // ---------- public profiles, search, friends ----------
  rel(uid, other) {
    const r = this.one('SELECT * FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)', uid, other, other, uid);
    return !r ? 'none' : r.status === 'accepted' ? 'friends' : r.a === uid ? 'pending_out' : 'pending_in';
  }
  pub(x) { return { pid: x.pid, name: x.name, avatar: x.avatar || 0, rating: x.rating, games: x.games, wins: x.wins, losses: x.losses, draws: x.draws, rank: this.rankOf(x), created: x.created, last: x.last }; }
  async player(req, pid) {
    const x = this.one('SELECT * FROM accounts WHERE pid=?', String(pid || '').slice(0, 12)); if (!x) return { error: 'not found' };
    const me = req.headers.get('authorization') ? await this.authHdr(req) : null;
    return { ...this.pub(x), self: !!me && me.uid === x.uid, rel: me && me.uid !== x.uid ? this.rel(me.uid, x.uid) : null };
  }
  search(q) {
    q = String(q || '').replace(/[%_\\]/g, '').trim().slice(0, 16); if (q.length < 2) return [];
    return this.all('SELECT pid,name,avatar,rating,games FROM accounts WHERE name LIKE ? ORDER BY games DESC, rating DESC LIMIT 10', q + '%');
  }
  friendList(a) {
    const rows = this.all('SELECT f.a fa, f.status st, x.* FROM friends f JOIN accounts x ON x.uid = CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY x.last DESC', a.uid, a.uid, a.uid);
    const out = { friends: [], incoming: [], outgoing: [] };
    for (const r of rows) {
      const o = { pid: r.pid, name: r.name, avatar: r.avatar || 0, rating: r.rating, games: r.games, last: r.last };
      if (r.st === 'accepted') out.friends.push(o); else if (r.fa === a.uid) out.outgoing.push(o); else out.incoming.push(o);
    }
    return out;
  }
  friendAct(a, act, pid) {
    const x = this.one('SELECT uid FROM accounts WHERE pid=?', pid.slice(0, 12)); if (!x || x.uid === a.uid) return { error: 'not found' };
    const rel = this.rel(a.uid, x.uid), now = Date.now();
    if (act === 'request') {
      if (rel === 'pending_in') act = 'accept';
      else if (rel !== 'none') return { rel };
      else {
        if (this.one("SELECT COUNT(*) c FROM friends WHERE a=? AND status='pending'", a.uid).c >= 30) return { error: 'Too many pending requests.', rel };
        if (this.one("SELECT COUNT(*) c FROM friends WHERE (a=? OR b=?) AND status='accepted'", a.uid, a.uid).c >= 100) return { error: 'Your friends list is full.', rel };
        this.sql.exec("INSERT INTO friends(a,b,status,created) VALUES(?,?,'pending',?)", a.uid, x.uid, now); return { rel: 'pending_out' };
      }
    }
    if (act === 'accept') { if (rel !== 'pending_in') return { rel }; this.sql.exec("UPDATE friends SET status='accepted' WHERE a=? AND b=?", x.uid, a.uid); return { rel: 'friends' }; }
    if (act === 'remove') { this.sql.exec('DELETE FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)', a.uid, x.uid, x.uid, a.uid); return { rel: 'none' }; }   // unfriend / decline / cancel
    return { error: 'bad request' };
  }

  // ---------- friend challenges (HTTP polling; the game itself is still peer-to-peer, the sender hosts the room code) ----------
  challengeAct(a, m) {
    const now = Date.now(), act = String(m.act || ''), id = String(m.id || '').slice(0, 16);
    this.sql.exec('DELETE FROM challenges WHERE created<?', now - 120000);
    if (act === 'send') {
      const x = this.one('SELECT * FROM accounts WHERE pid=?', String(m.pid || '').slice(0, 12));
      if (!x || x.uid === a.uid) return { error: 'Player not found.' };
      if (this.rel(a.uid, x.uid) !== 'friends') return { error: 'You can only challenge friends.' };
      if (this.one('SELECT COUNT(*) c FROM challenges WHERE a=? AND created>?', a.uid, now - 60000).c >= 6) return { error: 'Too many challenges - wait a moment.' };
      this.sql.exec('DELETE FROM challenges WHERE a=?', a.uid);
      const cid = rnd(10, B64), code = rnd(5, ALPH);
      this.sql.exec("INSERT INTO challenges(id,a,b,code,status,created) VALUES(?,?,?,?,'pending',?)", cid, a.uid, x.uid, code, now);
      return { id: cid, code };
    }
    if (act === 'poll') {
      const incoming = this.all("SELECT c.id id, x.pid pid, x.name name, x.avatar avatar, x.rating rating FROM challenges c JOIN accounts x ON x.uid=c.a WHERE c.b=? AND c.status='pending' AND c.created>? ORDER BY c.created DESC LIMIT 5", a.uid, now - CH_MS);
      let out = null;
      if (id) {
        const r = this.one('SELECT status, created FROM challenges WHERE id=? AND a=?', id, a.uid);
        out = { st: !r ? 'gone' : r.status === 'pending' && r.created < now - CH_MS ? 'gone' : r.status };
      }
      return { incoming, out };
    }
    if (act === 'accept') {
      const r = this.one("SELECT c.*, x.name xn, x.rating xr FROM challenges c JOIN accounts x ON x.uid=c.a WHERE c.id=? AND c.b=? AND c.status='pending' AND c.created>?", id, a.uid, now - CH_MS);
      if (!r) return { error: 'This challenge has expired.' };
      this.sql.exec("UPDATE challenges SET status='accepted' WHERE id=?", id);
      return { code: r.code, opp: { name: r.xn, rating: r.xr } };
    }
    if (act === 'decline') {
      const r = this.one('SELECT a, b FROM challenges WHERE id=?', id);
      if (r && r.a === a.uid) this.sql.exec('DELETE FROM challenges WHERE id=?', id);
      else if (r && r.b === a.uid) this.sql.exec("UPDATE challenges SET status='declined' WHERE id=?", id);
      return { ok: 1 };
    }
    return { error: 'bad request' };
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
    if (mode === 'ranked' && this.env.REQUIRE_DISCORD === '1' && !a.discord_id) { ws.send(JSON.stringify({ t: 'err', code: 'discord', msg: 'Ranked games require a linked Discord account (main menu > Profile).' })); return ws.close(1008, 'discord'); }
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
