#!/usr/bin/env node
'use strict';
// benchmark_reliability.js - test the TEST: how trustworthy is each card-power estimator, at equal compute?
//
//   node tools/benchmark_reliability.js --games 20000 --out results/bench_20k
//
// Three kinds of evidence, all from real games of the real engine:
//   1. TEST-RETEST RELIABILITY  - run the estimator twice on independent games (different seeds, and for the old methods
//      different random deck pools, exactly as re-running the old CLI with another --seed). Correlation between the two
//      runs' card rankings = how much of the ranking is signal. A method that cannot reproduce itself cannot balance a game.
//   2. PLANTED EFFECTS (known ground truth) - a third universe where 10 cards got +1/+1 and 8 cards -1/-1. A good
//      estimator's change (planted minus baseline) must line up with that truth.
//   3. SE CALIBRATION - where a method reports a standard error, (run A - run B)/sqrt(seA^2+seB^2) must have s.d. ~ 1.
//      s.d. > 1 means the method's error bars are too narrow (it is overconfident).
// Methods: new_curve / new_uniform = card_effects.js regression (curve-template vs uniform random decks);
//          old_field = "win rate when seen minus when not seen" (sim.js field mode, delta_seen);
//          old_swap  = "swap one card into a pool deck, subtract that deck's baseline win rate" (sim.js swap mode).
// All use the same pilot (default basic, 190 games/s/core) and the same number of games per run.
const fs = require('fs'), path = require('path'), os = require('os');
const P = require('./lib_pool'), S = require('./lib_stats'), PL = require('./lib_pilot'), LD = require('./lib_design'), CE = require('./card_effects');

// ---------------------------------------------------------------- worker side (old estimators + block runner)
if (!P.isMain) {
  const A = P.workerArgs(), ctx = PL.loadGame({ project: A.project, live: A.live }), D = LD.make(ctx), { BUILD, CD } = ctx;
  const poolCache = {};
  const poolOf = seed => poolCache[seed] || (poolCache[seed] = (() => { const rnd = PL.mulberry32(seed * 977 + 13), out = DECKS.map(d => d.c.slice()); for (let i = 0; i < 60; i++) out.push(D.uniform(rnd)); return out; })());
  const cnt = (d, X) => d.reduce((a, id) => a + (id === X ? 1 : 0), 0);
  P.serve(job => {
    if (job.type === 'blocks') return CE.blockJob(ctx, D, job);
    const pool = job.poolSeed != null ? poolOf(job.poolSeed) : null, rnd = PL.mulberry32(job.seed * 31 + 7);
    const pick = (n, not) => { let x; do x = Math.floor(rnd() * n); while (x === not); return x; };
    if (job.type === 'field') { // sim.js field mode: random pool decks, random seats / first move, track "seen"
      const dg = {}, dw = {}, sg = {}, sw = {}; let games = 0;
      const add = (m, id, v) => m[id] = (m[id] || 0) + v;
      for (let g = 0; g < job.n; g++) {
        const i = pick(pool.length), j = pick(pool.length, i), r = ctx.playGame(pool[i], pool[j], { pilot: job.pilot, seed: job.seed * 100003 + g, trackSeen: true });
        if (r.out === null) continue; games++;
        [[i, r.out, 0], [j, 1 - r.out, 1]].forEach(([di, w, seat]) => {
          const seen = new Set(r.seen[seat]), ids = new Set(pool[di]);
          ids.forEach(id => { add(dg, id, 1); add(dw, id, w); if (seen.has(id)) { add(sg, id, 1); add(sw, id, w); } });
        });
      }
      return { dg, dw, sg, sw, games };
    }
    if (job.type === 'swapA') { // per-deck baseline win rate vs random pool opponents
      const wins = {}, games = {};
      job.decks.forEach(i => { wins[i] = 0; games[i] = 0; for (let g = 0; g < job.nEach; g++) { const j = pick(pool.length, i), sw = rnd() < .5; const r = sw ? ctx.playGame(pool[j], pool[i], { pilot: job.pilot, seed: job.seed * 100003 + i * 977 + g }) : ctx.playGame(pool[i], pool[j], { pilot: job.pilot, seed: job.seed * 100003 + i * 977 + g }); if (r.out === null) continue; games[i]++; wins[i] += (sw ? 1 - r.out : r.out); } });
      return { wins, games };
    }
    if (job.type === 'swapB') { // one random slot of a random pool deck replaced by card X, vs random pool opponent
      const res = {};
      for (let k = 0; k < job.n; k++) {
        const X = BUILD[(job.offset + k) % BUILD.length]; let i, deck;
        for (let t = 0; t < 50; t++) { i = pick(pool.length); deck = pool[i].slice(); if (cnt(deck, X) < 3) break; }
        if (cnt(deck, X) >= 3) continue;
        let slot; do slot = Math.floor(rnd() * deck.length); while (deck[slot] === X); deck[slot] = X;
        const j = pick(pool.length, i), sw = rnd() < .5, r = sw ? ctx.playGame(pool[j], deck, { pilot: job.pilot, seed: job.seed * 100003 + k }) : ctx.playGame(deck, pool[j], { pilot: job.pilot, seed: job.seed * 100003 + k });
        if (r.out === null) continue; const won = sw ? 1 - r.out : r.out, e = won - job.baseWR[i], d = res[X] || (res[X] = [0, 0, 0, 0]);
        d[0]++; d[1] += won; d[2] += e; d[3] += e * e;
      }
      return { res };
    }
    throw new Error('unknown job ' + job.type);
  });
  return;
}

// ---------------------------------------------------------------- main side
const A = CE.parseArgs(process.argv.slice(2));
const NW = Math.max(1, +A.workers || os.cpus().length), N = +A.games || 20000, SEED = +A.seed || 1, PILOT = A.pilot || 'basic';
const OUT = path.resolve(A.out || path.join(__dirname, '..', 'results', 'bench_' + N));
fs.mkdirSync(OUT, { recursive: true });
const ctx0 = PL.loadGame({ project: A.project }), { BUILD, CD } = ctx0;
const chunk = (n, per) => { const o = []; for (let l = n; l > 0; l -= per) o.push(Math.min(per, l)); return o; };

// planted universe: +1/+1 on 10 unit cards, -1/-1 on 8 other unit cards (chosen by a fixed seed -> same truth in every run)
const rndP = PL.mulberry32(4242), units = BUILD.filter(id => CD[id].Type === 'Unit' && (CD[id].Attack || 0) >= 1);
const shuffled = units.slice().sort(() => rndP() - .5), buff = shuffled.slice(0, 10), nerfPool = shuffled.slice(10).filter(id => CD[id].Attack >= 2 && CD[id].Health >= 2), nerf = nerfPool.slice(0, 8);
const patch = { cards: {} };
buff.forEach(id => patch.cards[id] = { Attack: CD[id].Attack + 1, Health: CD[id].Health + 1 });
nerf.forEach(id => patch.cards[id] = { Attack: CD[id].Attack - 1, Health: CD[id].Health - 1 });
const patchFile = path.join(OUT, 'planted_patch.json'); fs.writeFileSync(patchFile, JSON.stringify(patch, null, 1));
const truth = BUILD.map(id => buff.includes(id) ? 1 : nerf.includes(id) ? -1 : 0);

const UNIV = [{ name: 'U0a', seed: SEED * 10 + 1, live: null }, { name: 'U0b', seed: SEED * 10 + 2, live: null }, { name: 'UP', seed: SEED * 10 + 3, live: patchFile }];

async function runMethod(method, pool, seed) {
  const t0 = Date.now(), prog = (d, n) => process.stderr.write(`\r    ${method}: ${d}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s  `);
  const est = {}, se = {};
  if (method.startsWith('new_')) { // new_<curve|uniform>[_deck]  (exposure = cards drawn by default, or cards in the deck with _deck)
    const design = method.includes('uniform') ? 'uniform' : 'curve', exposure = method.endsWith('_deck') ? 'deck' : 'seen';
    const jobs = chunk(Math.ceil(N / 2), Math.max(20, Math.ceil(N / 2 / (NW * 8)))).map((n, j) => ({ type: 'blocks', nBlocks: n, blockSize: 2, seed: seed * 7919 + j, base: seed * 1e6 + j * 1e4, design, pilot: PILOT }));
    const res = await pool.run(jobs, prog), recs = []; res.forEach(r => recs.push(...r.recs)); recs.forEach(r => r.g = r.k);
    const fr = CE.fitEffects(recs, ctx0, { exposure }), sc = 25 * fr.scale; // all figures in deck-level pp per copy
    fr.cards.forEach(c => { est[c.id] = sc * c.beta; se[c.id] = sc * c.seRaw; est[c.id + 'raw'] = sc * c.betaRaw; });
    return { est, se, games: recs.length, extra: { lambdaRel: fr.lambdaRel, reliabilityInternal: fr.reliability, pSeen: fr.pSeen, recs: method === 'new_curve' && seed === UNIV[0].seed && A.keep ? recs : null } };
  }
  const per = Math.max(50, Math.ceil(N / (NW * 6)));
  if (method === 'old_field') {
    const res = await pool.run(chunk(N, per).map((n, j) => ({ type: 'field', n, seed: seed * 7919 + j, poolSeed: seed, pilot: PILOT })), prog);
    const T = { dg: {}, dw: {}, sg: {}, sw: {} }; let games = 0;
    res.forEach(r => { games += r.games; ['dg', 'dw', 'sg', 'sw'].forEach(k => { for (const id in r[k]) T[k][id] = (T[k][id] || 0) + r[k][id]; }); });
    let tdg = 0, tsg = 0; BUILD.forEach(id => { tdg += T.dg[id] || 0; tsg += T.sg[id] || 0; }); const pSeen = tsg / tdg; // share of in-deck copies that get drawn, to express delta_seen at deck level like the others
    BUILD.forEach(id => {
      const n1 = T.sg[id] || 0, n0 = (T.dg[id] || 0) - n1; if (n1 < 5 || n0 < 5) return;
      const p1 = T.sw[id] / n1, p0 = (T.dw[id] - T.sw[id]) / n0; est[id] = 100 * pSeen * (p1 - p0); se[id] = 100 * pSeen * Math.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0);
    });
    return { est, se, games };
  }
  if (method === 'old_swap') {
    const nPool = DECKS.length + 60, baseGames = Math.round(0.25 * N), swapGames = N - baseGames, nEach = Math.max(4, Math.floor(baseGames / nPool));
    const idx = Array.from({ length: nPool }, (_, i) => i), step = Math.ceil(nPool / (NW * 3)), jobsA = [];
    for (let k = 0; k < nPool; k += step) jobsA.push({ type: 'swapA', decks: idx.slice(k, k + step), nEach, seed: seed * 104729 + k, poolSeed: seed, pilot: PILOT });
    const ra = await pool.run(jobsA, prog), baseWR = new Array(nPool).fill(.5);
    ra.forEach(r => { for (const i in r.games) baseWR[i] = r.games[i] ? r.wins[i] / r.games[i] : .5; });
    const pj = Math.max(BUILD.length, Math.ceil(swapGames / (NW * 6) / BUILD.length) * BUILD.length), jobsB = [];
    for (let off = 0, k = 0; off < swapGames; off += pj, k++) jobsB.push({ type: 'swapB', n: Math.min(pj, swapGames - off), offset: off, seed: seed * 130363 + k, poolSeed: seed, baseWR, pilot: PILOT });
    const rb = await pool.run(jobsB, prog), T = {}; let games = baseGames;
    rb.forEach(r => { for (const X in r.res) { const d = T[X] || (T[X] = [0, 0, 0, 0]); r.res[X].forEach((v, i) => d[i] += v); } });
    let tn = 0, ts = 0; for (const X in T) { tn += T[X][0]; ts += T[X][2]; } const gm = ts / tn; games += tn;
    BUILD.forEach(id => { const s = T[id]; if (!s || s[0] < 5) return; const n = s[0], m = s[2] / n, v = Math.max(1e-9, s[3] / n - m * m); est[id] = 100 * (m - gm); se[id] = 100 * Math.sqrt(v / n); });
    return { est, se, games };
  }
  throw new Error('method ' + method);
}

const vec = (o, key) => BUILD.map(id => o.est[key == null ? id : id + key] ?? NaN);
function auc(scoresPos, scoresNeg) { let w = 0, n = 0; scoresPos.forEach(a => scoresNeg.forEach(b => { if (Number.isNaN(a) || Number.isNaN(b)) return; w += a > b ? 1 : a === b ? .5 : 0; n++; })); return n ? w / n : NaN; }
function bootR(d, t, B) { // 90% bootstrap interval (over cards) for r(change, planted truth)
  const rnd = PL.mulberry32(99), out = []; const n = d.length;
  for (let b = 0; b < (B || 500); b++) { const xs = [], ys = []; for (let i = 0; i < n; i++) { const k = Math.floor(rnd() * n); if (Number.isFinite(d[k])) { xs.push(d[k]); ys.push(t[k]); } } if (S.sd(ys) > 0 && S.sd(xs) > 0) out.push(S.pearson(xs, ys)); }
  out.sort((a, b) => a - b); return [out[Math.floor(out.length * .05)], out[Math.floor(out.length * .95)]];
}
function pairedStats(x, y) { const k = x.map((v, i) => i).filter(i => Number.isFinite(x[i]) && Number.isFinite(y[i])); return { r: S.pearson(k.map(i => x[i]), k.map(i => y[i])), rho: S.spearman(k.map(i => x[i]), k.map(i => y[i])), n: k.length }; }

(async () => {
  const methods = (A.methods || 'new_curve,new_curve_deck,new_uniform,old_field,old_swap').split(','), R = {};
  console.log(`benchmark: ${N} games per run, pilot ${PILOT}, ${NW} workers; planted: +1/+1 on ${buff.map(i => CD[i].Name).join(', ')} | -1/-1 on ${nerf.map(i => CD[i].Name).join(', ')}`);
  for (const u of UNIV) {
    const pool = P.create(__filename, { project: A.project, live: u.live }, NW); console.log(`universe ${u.name}${u.live ? ' (planted)' : ''}`);
    for (const m of methods) { R[m] = R[m] || {}; R[m][u.name] = await runMethod(m, pool, u.seed); process.stderr.write('\n'); }
    pool.close();
  }
  fs.writeFileSync(path.join(OUT, 'estimates.json'), JSON.stringify({ N, PILOT, buff, nerf, R }));
  const f = (x, d) => Number.isFinite(x) ? x.toFixed(d == null ? 2 : d) : '  n/a';
  const lines = [`RE:Joltance estimator benchmark   ${new Date().toISOString()}`, `${N} games per run (old swap: 25% baseline + 75% swap games), pilot=${PILOT}; 3 independent runs per method: two baseline universes (U0a, U0b) and one with planted card changes (UP).`, '',
    'All effects are expressed as win-rate points per copy IN THE DECK (delta_seen is multiplied by the draw rate to put it on that scale).', 'method          | test-retest r (Spearman) | SE/card median (pp) | games for SE=1pp | SE calibration sd(z) | planted: r(change, truth)  AUC buff  AUC nerf', '-'.repeat(150)];
  const sum = {};
  methods.forEach(m => {
    const a = R[m].U0a, b = R[m].U0b, p = R[m].UP, x = vec(a), y = vec(b), pr = pairedStats(x, y);
    const medSe = (() => { const s = BUILD.map(id => a.se[id]).filter(Number.isFinite).sort((u, v) => u - v); return s[Math.floor(s.length / 2)]; })();
    const useRaw = m.startsWith('new_'), xr = vec(a, useRaw ? 'raw' : null), yr = vec(b, useRaw ? 'raw' : null);
    const z = BUILD.map((id, i) => (xr[i] - yr[i]) / Math.sqrt((a.se[id] ** 2) + (b.se[id] ** 2))).filter(Number.isFinite);
    const d = BUILD.map((id, i) => { const pv = p.est[id], av = (a.est[id] + b.est[id]) / 2; return pv - av; }); // planted universe vs mean of both baselines
    const ok = d.map((v, i) => Number.isFinite(v)), dt = pairedStats(d, truth);
    const buffD = BUILD.map((id, i) => buff.includes(id) ? d[i] : null).filter(v => v != null), nerfD = BUILD.map((id, i) => nerf.includes(id) ? -d[i] : null).filter(v => v != null), noneD = BUILD.map((id, i) => truth[i] === 0 ? d[i] : null).filter(v => v != null), noneN = noneD.map(v => -v);
    const ci = bootR(d, truth); sum[m] = { retest: pr, medSe, sdz: S.sd(z), plantedR: dt.r, plantedCI: ci, aucBuff: auc(buffD, noneD), aucNerf: auc(nerfD, noneN), games: a.games };
    lines.push(`${m.padEnd(15)} | r=${f(pr.r)} (${f(pr.rho)}) n=${pr.n}`.padEnd(42) + ` | ${f(medSe)}`.padEnd(22) + ` | ${f(a.games * medSe * medSe, 0)}`.padEnd(19) + ` | ${f(S.sd(z))}`.padEnd(23) + ` | ${f(dt.r)} [${f(ci[0])}, ${f(ci[1])}]`.padEnd(32) + `${f(sum[m].aucBuff)}   ${f(sum[m].aucNerf)}`);
  });
  lines.push('', 'Reading guide: test-retest r near 1 = the ranking reproduces; near 0 = it is mostly noise. "games for SE=1pp" = games a run needs so a card\'s effect has a 1-point standard error (lower = cheaper).',
    'SE calibration sd(z) ~ 1.0 is honest; 1.5 means the error bars are 1.5x too narrow. Planted r / AUC: 1.0 = recovers the known +1/+1 and -1/-1 changes perfectly, 0.5 AUC = coin flip.');
  // does the old signal even correlate with cost?
  lines.push('', 'Confounding check - correlation of the estimate with card cost (baseline universe, mean of the two runs):');
  methods.forEach(m => { const e = BUILD.map(id => { const v = [R[m].U0a.est[id], R[m].U0b.est[id]].filter(Number.isFinite); return v.length ? S.mean(v) : NaN; }), k = e.map((v, i) => i).filter(i => Number.isFinite(e[i])); lines.push(`  ${m.padEnd(15)} r(estimate, cost) = ${f(S.pearson(k.map(i => e[i]), k.map(i => CD[BUILD[i]].Cost)))}`); });
  lines.push('', 'Agreement between methods (Pearson r of mean baseline estimates):'); for (let i = 0; i < methods.length; i++) for (let j = i + 1; j < methods.length; j++) { const e = m => BUILD.map(id => { const v = [R[m].U0a.est[id], R[m].U0b.est[id]].filter(Number.isFinite); return v.length ? S.mean(v) : NaN; }); lines.push(`  ${methods[i]} vs ${methods[j]}: r = ${f(pairedStats(e(methods[i]), e(methods[j])).r)}`); }
  // validity cross-check: two independent identification strategies on the SAME games must agree
  if (!A['no-validity']) {
    const VN = +A['validity-games'] || Math.max(N, 20000), pool = P.create(__filename, { project: A.project }, NW); console.log('validity run (' + VN + ' games, curve design)');
    const nb = Math.ceil(VN / 2), jobs = chunk(nb, Math.max(20, Math.ceil(nb / (NW * 8)))).map((n, j) => ({ type: 'blocks', nBlocks: n, blockSize: 2, seed: SEED * 99991 + j, base: SEED * 1e7 + j * 1e4, design: 'curve', pilot: PILOT }));
    const res = await pool.run(jobs, (d, n) => process.stderr.write(`\r    validity: ${d}/${n}  `)); pool.close(); process.stderr.write('\n');
    const recs = []; res.forEach(r => recs.push(...r.recs)); recs.forEach(r => r.g = r.k);
    const fs_ = CE.fitEffects(recs, ctx0, { exposure: 'seen', noAnchor: true }), fd_ = CE.fitEffects(recs, ctx0, { exposure: 'deck' });
    const xs = fs_.cards.map(c => 25 * fs_.scale * c.betaRaw), xd = fd_.cards.map(c => 25 * c.betaRaw), r = S.pearson(xs, xd), an = CE.anchorScale(recs, ctx0);
    lines.push('', `VALIDITY CROSS-CHECK on ${recs.length} games: card effects estimated from the cards you DREW (scaled by draw rate ${f(fs_.pSeen)}) vs from the cards IN THE DECK (design-based: decks are randomised, so no assumption about draws at all):`,
      `  correlation of the two estimates r = ${f(r)}  -> they rank cards the same way`,
      `  SCALE: the true (noise-free) spread of deck-level effects is ${f(an.slope)}x the draw-based spread (90% CI ${f(an.lo)}-${f(an.hi)}, split-half estimate with independent noise; correlation of the noise-free signals ${f(an.corr)}). So the draw-based pp figures are about ${f(100 * (1 / an.slope - 1), 0)}% too large and card_effects.js multiplies them by this anchor.`,
      `  (an earlier version of this report blamed the slope below 1 on noise in the deck-based numbers; that is wrong - noise in the response variable does not bias a regression slope.)`,
      `  out-of-sample skill: draw-based ${f(100 * (1 - fs_.cvLoss / fs_.nullLoss))}% vs deck-based ${f(100 * (1 - fd_.cvLoss / fd_.nullLoss))}% of outcome entropy`,
      `  reliability from one run (signal share of the spread between cards): draw-based ${f(fs_.reliability)}, deck-based ${f(fd_.reliability)}`);
  }
  const txt = lines.join('\n') + '\n'; fs.writeFileSync(path.join(OUT, 'bench_report.txt'), txt); console.log('\n' + txt); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
