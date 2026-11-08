#!/usr/bin/env node
'use strict';
// calibrate.js - closed-loop search for FAIR card stats, verified on games the search never saw.
//
//   node tools/calibrate.js --rounds 3 --games 24000 --out results/cal1 [--live start_patch.json] [--margin 1.5]
//
// Diagnosis alone (card_effects.js) says WHICH cards are off. This tool also finds the EDITS, by experiment rather than by guessing
// how much +1 attack is worth:
//   round r:
//     1. BASE    measure every card's effect (card_effects.js, curve design, first-move balanced, anchored to the design scale).
//     2. FLAG    cards whose effect is beyond +/-margin of their cost peers with 90% confidence (OVER / UNDER).
//                Round 1 only: a stronger second pilot must agree on the direction (otherwise the "problem" may just be a bot that
//                plays the card badly - such cards are reported as PILOT-DEPENDENT and are NOT edited).
//     3. BRANCH  one universe per lever (cost, attack, health, effect amount): every flagged card gets a ONE-STEP edit in the
//                corrective direction (nerf OVER, buff UNDER) with that lever, all flagged cards at once, and the effects are
//                re-measured. This is a direct measurement of what each edit does to each card.
//     4. PICK    per card, the lever whose measured effect lands closest to its peers. With --select minimax (default) the second pilot's
//                deviation is carried along (its base deviation + the shift the edit caused in the main pilot) and the lever with the smallest
//                WORST-CASE deviation over both pilots wins, so a card one bot underplays is not pushed into overpowered territory for the other.
//     5. CHECK   next round's BASE already contains the edits; an edit that made its card significantly worse is reverted and the
//                card is frozen.
//   FINAL: the original and the edited card set are measured again on FRESH seeds (never used for any decision), same protocol,
//   so the before/after comparison is not distorted by regression to the mean (cards were picked because they looked extreme).
//   Optional: the same before/after with the second pilot.
// Output: patch_final.json (cards-live format: use it with --live in every lab tool, or merge it into cards.js), report.txt, calibration.json.
// Each universe is a separate card_effects.js process, so every universe sees its own patched card pool.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const CE = require('./card_effects'), PL = require('./lib_pilot'), S = require('./lib_stats');

const A = CE.parseArgs(process.argv.slice(2));
const ROUNDS = +A.rounds || 3, N = +A.games || 24000, N_FINAL = +A['final-games'] || 40000, MARGIN = A.margin ? +A.margin : 1.5;
const PILOT = A.pilot || 'basic', AUDIT = A.audit === undefined ? 'classic' : (A.audit === 'none' ? null : A.audit), N_AUDIT = +A['audit-games'] || 8000;
const CAP = +A.cap || 2, SEED0 = +A.seed || 1, BASELINE = A.baseline || 'cost', SELECT = A.select || 'minimax'; // minimax: pick the edit with the smallest worst-case deviation over both pilots; basic: main pilot only
const OUT = path.resolve(A.out || path.join(__dirname, '..', 'results', 'calibrate')); fs.mkdirSync(OUT, { recursive: true });
const CE_PATH = path.join(__dirname, 'card_effects.js');
const ctx = PL.loadGame({ project: A.project }), { CD, BUILD } = ctx;
const ORIG = {}; BUILD.forEach(id => ORIG[id] = JSON.parse(JSON.stringify(CD[id])));
const t0 = Date.now(), mins = () => ((Date.now() - t0) / 60000).toFixed(1) + ' min';
const log = []; const say = s => { console.log(s); log.push(s); };
const f1 = x => (x >= 0 ? '+' : '') + x.toFixed(1);

// ---------------------------------------------------------------- patches
const START = A.live ? JSON.parse(fs.readFileSync(A.live, 'utf8')) : { cards: {} };
const clone = o => JSON.parse(JSON.stringify(o));
let patch = { cards: clone(START.cards || {}) };
const cardDef = (p, id) => Object.assign({}, ORIG[id], p.cards[id] || {});
const AMT_TYPES = new Set(['DealDamage', 'Heal', 'DrawCard', 'ScaleAttack', 'AddResource', 'DrawFromDiscard']);
// one-step edit of a lever in the corrective direction (dir +1 = buff, -1 = nerf); null = lever not applicable
function makeEdit(p, id, lever, dir) {
  const cur = cardDef(p, id);
  if (lever === 'cost') { const v = (cur.Cost || 0) - dir; return v < 0 || v > 10 ? null : { Cost: v }; }
  if (lever === 'atk') { if (cur.Type !== 'Unit' || cur.Attack == null) return null; const v = cur.Attack + dir; return v < 1 || v > 12 ? null : { Attack: v }; }
  if (lever === 'hp') { if (cur.Type !== 'Unit' || cur.Health == null) return null; const v = cur.Health + dir; return v < 1 || v > 14 ? null : { Health: v }; }
  if (lever === 'amt') {
    if (cur.Rule || cur.DescriptionClassic || !cur.Effects) return null;
    const eff = clone(cur.Effects); let hit = null;
    eff.forEach(e => (e.Actions || []).forEach(a => { if (!hit && AMT_TYPES.has(a.Type) && typeof a.Amount === 'number') hit = a; }));
    if (!hit) return null; const old = hit.Amount, v = old + dir; if (v < 1 || v > 12) return null; hit.Amount = v;
    const out = { Effects: eff }, d = cur.Description || '', m = new RegExp('\\b' + old + '\\b');
    if (m.test(d)) out.Description = d.replace(m, String(v));
    return out;
  }
  return null;
}
const LEVERS = (A.levers ? String(A.levers).split(',') : ['cost', 'atk', 'hp', 'amt']).filter(l => ['cost', 'atk', 'hp', 'amt'].includes(l)); // --levers atk,hp,amt keeps mana costs untouched
const ALL_LEVERS = ['cost', 'atk', 'hp', 'amt'];
const stepsOf = (p, id) => { const o = ORIG[id], c = cardDef(p, id), s = { cost: (c.Cost || 0) - (o.Cost || 0), atk: (c.Attack || 0) - (o.Attack || 0), hp: (c.Health || 0) - (o.Health || 0), amt: 0 };
  const amts = e => { const l = []; (e || []).forEach(x => (x.Actions || []).forEach(a => { if (typeof a.Amount === 'number') l.push(a.Amount); })); return l; };
  const a0 = amts(o.Effects), a1 = amts(c.Effects); s.amt = a0.length && a1.length ? a1[0] - a0[0] : 0; return s; };

// ---------------------------------------------------------------- one universe = one card_effects.js process
let univ = 0;
function run(name, pat, o) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  const pf = path.join(dir, 'patch.json'); fs.writeFileSync(pf, JSON.stringify(pat));
  const args = [CE_PATH, 'all', '--games', String(o.games), '--seed', String(o.seed), '--pilot', o.pilot || PILOT, '--design', 'curve', '--out', dir, '--live', pf, '--margin', String(MARGIN), '--baseline', BASELINE];
  if (o.anchor != null) args.push('--anchor', String(o.anchor));
  if (A.project) args.push('--project', A.project);
  const r = cp.spawnSync(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('card_effects failed for ' + name + ':\n' + String(r.stderr).slice(-2000));
  try { fs.unlinkSync(path.join(dir, 'games.jsonl')); } catch (e) { }
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'fit.json'), 'utf8')); j.byId = {}; j.cards.forEach(c => j.byId[c.id] = c); j.name = name; univ++;
  return j;
}
const spread = (fit) => { const d = fit.cards.map(c => c.dev), m = S.mean(d), tv = d.reduce((s, x) => s + (x - m) ** 2, 0) / (d.length - 1), mse = S.mean(fit.cards.map(c => c.devSe ** 2)); return { sd: Math.sqrt(tv), signalSd: Math.sqrt(Math.max(0, tv - mse)), noiseSd: Math.sqrt(mse) }; };
const count = fit => { const c = { OVER: 0, UNDER: 0, FAIR: 0, UNSURE: 0 }; fit.cards.forEach(x => c[x.verdict]++); return c; };

// ---------------------------------------------------------------- main loop
(async () => {
  say(`calibrate | pilot ${PILOT}${AUDIT ? ' (audit pilot ' + AUDIT + ', select ' + SELECT + ')' : ' (no audit pilot)'} | ${ROUNDS} rounds x (1 base + <=4 branch universes) x ${N} games | margin +/-${MARGIN}pp vs ${BASELINE === 'zero' ? 'average card' : 'cost peers'} | cap ${CAP} steps per lever`);
  const hist = {}; BUILD.forEach(id => hist[id] = { edits: [], frozen: null, note: '' });
  let anchor = null, lastBase = null, audit1 = null, before0 = null, aud = null; const rounds = []; // aud[id]: second-pilot deviation, propagated through the edits
  for (let r = 1; r <= ROUNDS; r++) {
    const base = run(`r${r}_base`, patch, { games: N, seed: SEED0 * 1000 + r * 10, anchor }); if (anchor == null) anchor = base.anchor;
    const cnt = count(base), sp = spread(base);
    say(`round ${r} base: OVER ${cnt.OVER} UNDER ${cnt.UNDER} FAIR ${cnt.FAIR} UNSURE ${cnt.UNSURE} | real spread of cards ${sp.signalSd.toFixed(2)}pp (noise floor ${sp.noiseSd.toFixed(2)}) | anchor ${anchor.toFixed(2)} | ${mins()}`);
    if (r === 1) before0 = base;
    // ---- 5. CHECK the edits of the previous round: revert those that made their card significantly worse
    if (lastBase) BUILD.forEach(id => {
      const h = hist[id], e = h.edits[h.edits.length - 1]; if (!e || e.round !== r - 1 || e.reverted) return;
      const a = lastBase.byId[id], b = base.byId[id], worse = Math.abs(b.dev) - Math.abs(a.dev), se = Math.sqrt(a.devSe ** 2 + b.devSe ** 2);
      e.measuredAfter = b.dev;
      if (worse > 1.645 * se) { if (aud && e.audBefore != null) aud[id] = e.audBefore; e.reverted = true; h.frozen = 'edit made the card worse (' + f1(a.dev) + ' -> ' + f1(b.dev) + 'pp); reverted'; const fr = clone(patch.cards[id] || {}); const o = ORIG[id]; // restore the lever's fields from before this edit
        patch.cards[id] = e.before; if (!Object.keys(e.before).length) delete patch.cards[id]; say(`  REVERT ${id} ${CD[id].Name}: ${e.lever} ${e.dir > 0 ? 'buff' : 'nerf'} moved it ${f1(a.dev)} -> ${f1(b.dev)}pp`); }
    });
    // ---- 2. FLAG (+ pilot agreement in round 1)
    let flagged = base.cards.filter(c => (c.verdict === 'OVER' || c.verdict === 'UNDER') && !hist[c.id].frozen);
    if (AUDIT) {
      if (r === 1) { audit1 = run('r1_audit_' + AUDIT, patch, { games: N_AUDIT, seed: SEED0 * 1000 + 5, pilot: AUDIT }); aud = {}; BUILD.forEach(id => aud[id] = audit1.byId[id].dev); }
      const dep = [];
      flagged = flagged.filter(c => { const a = aud[c.id], ok = Math.sign(a) === Math.sign(c.dev) && Math.abs(a) >= 0.5 * MARGIN; if (!ok) { dep.push(c); hist[c.id].frozen = `PILOT-DEPENDENT: ${PILOT} says ${f1(c.dev)}pp, ${AUDIT} says ${f1(a)}pp`; } return ok; });
      say(`  pilot agreement (${AUDIT}${r === 1 ? ', ' + N_AUDIT + ' games' : ', propagated'}): ${flagged.length} flagged cards confirmed, ${dep.length} are PILOT-DEPENDENT and left alone: ${dep.map(c => c.name).join(', ') || 'none'}`);
    }
    // cards that already hit the step cap on every applicable lever cannot be moved further
    const dirOf = c => c.dev > 0 ? -1 : +1;
    const plan = flagged.map(c => ({ c, dir: dirOf(c), opts: LEVERS.filter(L => { const e = makeEdit(patch, c.id, L, dirOf(c)); if (!e) return false; const st = stepsOf(patch, c.id)[L]; return Math.abs(st + dirOf(c)) <= CAP; }) })).filter(x => x.opts.length);
    say(`  ${flagged.length} flagged, ${plan.length} with an applicable lever`);
    if (!plan.length) { rounds.push({ r, base: cnt, flagged: 0 }); break; }
    // ---- 3. BRANCH universes (one per lever)
    const branches = {};
    for (const L of LEVERS) {
      const members = plan.filter(x => x.opts.includes(L)); if (!members.length) continue;
      const bp = { cards: clone(patch.cards) }; members.forEach(x => { bp.cards[x.c.id] = Object.assign({}, bp.cards[x.c.id] || {}, makeEdit(patch, x.c.id, L, x.dir)); });
      branches[L] = run(`r${r}_branch_${L}`, bp, { games: N, seed: SEED0 * 1000 + r * 10 + 1 + LEVERS.indexOf(L), anchor });
      say(`  branch ${L}: ${members.length} cards edited | ${mins()}`);
    }
    // ---- 4. PICK
    const chosen = [], left = [];
    plan.forEach(x => {
      const id = x.c.id, b0 = base.byId[id], useAud = aud && SELECT === 'minimax'; let best = null;
      const cur = useAud ? Math.max(Math.abs(b0.dev), Math.abs(aud[id])) : Math.abs(b0.dev);
      x.opts.forEach(L => { const q = branches[L].byId[id], pa = aud ? aud[id] + (q.dev - b0.dev) : null, score = useAud ? Math.max(Math.abs(q.dev), Math.abs(pa)) : Math.abs(q.dev); x['dev_' + L] = q.dev; x['aud_' + L] = pa;
        if (score < cur && (!best || score < best.score)) best = { L, q, pa, score }; });
      if (best) { const before = clone(patch.cards[id] || {}), frag = makeEdit(patch, id, best.L, x.dir), audBefore = aud ? aud[id] : null;
        patch.cards[id] = Object.assign({}, patch.cards[id] || {}, frag); if (aud) aud[id] = best.pa;
        hist[id].edits.push({ round: r, lever: best.L, dir: x.dir, before, audBefore, devBefore: b0.dev, predicted: best.q.dev, predictedAudit: best.pa, tried: Object.fromEntries(x.opts.map(L => [L, x['dev_' + L]])) });
        chosen.push({ id, name: b0.name, lever: best.L, dir: x.dir, from: b0.dev, to: best.q.dev, audFrom: aud ? best.pa - (best.q.dev - b0.dev) : null, audTo: best.pa }); }
      else { hist[id].frozen = 'no single-step edit moved it closer (' + x.opts.map(L => L + ' ' + f1(x['dev_' + L])).join(', ') + ' vs ' + f1(b0.dev) + 'pp): needs a manual redesign'; left.push(b0); }
    });
    say(`  edits chosen: ${chosen.length}; no helpful single-step edit for ${left.length}: ${left.map(c => c.name).join(', ') || 'none'}`);
    chosen.forEach(e => say(`    ${String(e.id).padStart(3)} ${e.name.padEnd(24)} ${e.dir > 0 ? 'buff' : 'nerf'} ${e.lever.padEnd(4)} ${PILOT} ${f1(e.from)} -> ${f1(e.to)}pp${e.audTo != null ? ' | ' + AUDIT + ' ' + f1(e.audFrom) + ' -> ' + f1(e.audTo) + 'pp' : ''}`));
    rounds.push({ r, base: cnt, flagged: flagged.length, chosen: chosen.length });
    lastBase = base;
    fs.writeFileSync(path.join(OUT, `patch_round${r}.json`), JSON.stringify({ _note: `after round ${r}`, cards: patch.cards }, null, 1));
  }
  // one more base to check the last round's edits and revert harmful ones (cheap, and it is a full measurement of the final candidate)
  if (lastBase) {
    const chk = run('check_final', patch, { games: N, seed: SEED0 * 1000 + 990, anchor });
    BUILD.forEach(id => { const h = hist[id], e = h.edits[h.edits.length - 1]; if (!e || e.reverted || e.round !== rounds[rounds.length - 1].r) return; const a = lastBase.byId[id], b = chk.byId[id], worse = Math.abs(b.dev) - Math.abs(a.dev), se = Math.sqrt(a.devSe ** 2 + b.devSe ** 2); e.measuredAfter = b.dev;
      if (worse > 1.645 * se) { e.reverted = true; h.frozen = 'edit made the card worse; reverted'; patch.cards[id] = e.before; if (!Object.keys(e.before).length) delete patch.cards[id]; say(`  REVERT ${id} ${CD[id].Name}`); } });
  }
  // ---- FINAL verification on fresh seeds
  const FS = SEED0 * 1000 + 777;
  say(`final verification on fresh seeds (${N_FINAL} games per universe) | ${mins()}`);
  const fb = run('final_before', START.cards ? { cards: clone(START.cards) } : { cards: {} }, { games: N_FINAL, seed: FS, anchor });
  const fa = run('final_after', patch, { games: N_FINAL, seed: FS, anchor });
  let ab = null, aa = null;
  if (AUDIT) { ab = run('final_before_' + AUDIT, { cards: clone(START.cards || {}) }, { games: N_AUDIT, seed: FS + 1, pilot: AUDIT }); aa = run('final_after_' + AUDIT, patch, { games: N_AUDIT, seed: FS + 1, pilot: AUDIT }); }
  const fin = { patch, hist, rounds, anchor, before: { cnt: count(fb), sp: spread(fb) }, after: { cnt: count(fa), sp: spread(fa) }, auditBefore: ab && { cnt: count(ab), sp: spread(ab) }, auditAfter: aa && { cnt: count(aa), sp: spread(aa) } };
  // ---- report
  const edited = BUILD.filter(id => patch.cards[id] && JSON.stringify(patch.cards[id]) !== JSON.stringify((START.cards || {})[id] || {}));
  const row = (id) => { const b = fb.byId[id], a = fa.byId[id], h = hist[id], e = h.edits.filter(x => !x.reverted).map(x => `${x.dir > 0 ? '+' : '-'}${x.lever}`).join(' '); return `  ${String(id).padStart(3)} ${CD[id].Name.padEnd(24)} cost ${String(a.cost).padStart(2)}  before ${f1(b.dev).padStart(5)}pp ${b.verdict.padEnd(6)} -> after ${f1(a.dev).padStart(5)}pp (+/-${(1.645 * a.devSe).toFixed(1)}) ${a.verdict.padEnd(6)} ${e ? ' [' + e + ']' : ''}`; };
  const pct = c => `OVER ${c.OVER} UNDER ${c.UNDER} FAIR ${c.FAIR} UNSURE ${c.UNSURE}`;
  const descNotes = edited.filter(id => patch.cards[id].Description).map(id => `  ${id} ${CD[id].Name}: "${ORIG[id].Description}"  ->  "${patch.cards[id].Description}"`);
  const rep = [`RE:Joltance stat calibration   ${new Date().toISOString()}   ${mins()}   pilot ${PILOT}${AUDIT ? ', audit ' + AUDIT : ''}`, '',
    `FRESH-SEED VERIFICATION (${N_FINAL} games per side, seeds never used for any decision; same protocol before and after, so regression to the mean cannot flatter the result):`,
    `  before: ${pct(fb && count(fb))} | real spread of card effects around their cost peers ${spread(fb).signalSd.toFixed(2)}pp (noise floor ${spread(fb).noiseSd.toFixed(2)})`,
    `  after : ${pct(count(fa))} | real spread ${spread(fa).signalSd.toFixed(2)}pp (noise floor ${spread(fa).noiseSd.toFixed(2)})`,
    ab ? `  second pilot (${AUDIT}, ${N_AUDIT} games per side): before ${pct(count(ab))}, real spread ${spread(ab).signalSd.toFixed(2)}pp -> after ${pct(count(aa))}, real spread ${spread(aa).signalSd.toFixed(2)}pp` : '',
    `  ${edited.length} cards edited in total over ${rounds.length} round(s), ${Object.values(hist).filter(h => h.edits.some(e => e.reverted)).length} edits reverted`, '',
    'EDITED CARDS (before -> after on the fresh seeds):', ...edited.map(row), '',
    'FLAGGED BUT NOT EDITED (reason):', ...BUILD.filter(id => hist[id].frozen && !edited.includes(id)).map(id => `  ${String(id).padStart(3)} ${CD[id].Name.padEnd(24)} ${hist[id].frozen}`), '',
    'STILL OUTSIDE THE MARGIN after calibration (fresh seeds):', ...fa.cards.filter(c => c.verdict === 'OVER' || c.verdict === 'UNDER').map(c => `  ${String(c.id).padStart(3)} ${c.name.padEnd(24)} ${f1(c.dev)}pp ${c.verdict}${hist[c.id].frozen ? '  (' + hist[c.id].frozen + ')' : ''}`), '',
    descNotes.length ? 'CARD TEXT touched automatically (check the wording):' : '', ...descNotes, '',
    'Cost changes move a card to another cost bucket, so its fairness is judged against its new peers. All numbers are measured with a bot pilot: playtest the edited cards with humans before shipping.', ''];
  fs.writeFileSync(path.join(OUT, 'report.txt'), rep.join('\n'));
  const outPatch = { _note: `calibrate.js ${new Date().toISOString()} | pilot ${PILOT} | ${edited.length} cards | use: node tools/<tool>.js --live <this file>`, cards: patch.cards };
  fs.writeFileSync(path.join(OUT, 'patch_final.json'), JSON.stringify(outPatch, null, 1));
  fs.writeFileSync(path.join(OUT, 'calibration.json'), JSON.stringify({ args: A, rounds, before: fin.before, after: fin.after, auditBefore: fin.auditBefore, auditAfter: fin.auditAfter, hist: Object.fromEntries(Object.entries(hist).filter(([k, v]) => v.edits.length || v.frozen)) }, null, 1));
  console.log('\n' + rep.join('\n') + '\nFiles in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
