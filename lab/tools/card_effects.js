#!/usr/bin/env node
'use strict';
// card_effects.js - estimate every card's marginal effect on win probability from ONE designed experiment.
//
//   node tools/card_effects.js play --games 6000 --pilot basic --design curve --out results/ce1
//   node tools/card_effects.js fit  --games-file results/ce1/games.jsonl [--games-file more.jsonl] --out results/ce1
//   node tools/card_effects.js all  --games 6000 --out results/ce1                  (play + fit)
//   node tools/card_effects.js all  --design tilted --tilt results/ce1/effects.json --temp 0.15 --out results/ce2
//
// METHOD (why it is more reliable than "swap one card" / "win rate when seen"):
//   * Every game is between two sampled decks. The outcome is modelled as
//         logit P(A wins) = gamma * (A moves first ? +1 : -1) + sum_c beta_c * (copies_c(A) - copies_c(B))
//     so ALL ~60 card slots in a game inform ALL cards at once (about 60x the information per game of a one-card swap)
//     and every card is estimated in the same pooled, regularised model (no per-card baselines to be noisy about).
//   * Each deck pair is played as a block with the first move balanced, so first-player advantage cancels by design.
//   * Ridge shrinkage strength is chosen by grouped cross-validation (out-of-sample log-loss), which also removes the
//     winner's curse of ranking 100 noisy numbers; standard errors are cluster-robust (games of one pair are correlated).
//   * Results are judged against a practical-equivalence margin: OVER / UNDER / FAIR / UNSURE, and every UNSURE card gets
//     "extra games needed to decide", so compute is spent where the decision is still open.
const fs = require('fs'), path = require('path'), os = require('os');
const P = require('./lib_pool'), S = require('./lib_stats'), PL = require('./lib_pilot'), LD = require('./lib_design');

function parseArgs(argv) { const o = { 'games-file': [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (!a.startsWith('--')) { if (!o._) o._ = a; continue; } const k = a.slice(2), v = argv[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { if (k === 'games-file') o[k].push(v); else o[k] = v; i++; } } return o; }

// ------------------------------------------------------------------ worker side
// One job = a chunk of deck-pair blocks. Exported so other tools' workers (benchmark_reliability.js) can reuse it.
function blockJob(ctx, D, job) {
  const recs = []; let timeouts = 0;
  for (let b = 0; b < job.nBlocks; b++) {
    const rnd = PL.mulberry32(job.seed * 1000003 + b * 17 + 1);
    const mk = () => job.design === 'uniform' ? D.uniform(rnd) : job.design === 'tilted' ? D.tilted(rnd, job.beta, job.temp) : D.curve(rnd);
    const a = mk(), bb = mk(), seatA = rnd() < .5 ? 0 : 1;
    const plan = job.blockSize === 4 ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[seatA, seatA], [1 - seatA, seatA]]; // [seat of A, first-moving seat]
    plan.forEach((pp, k) => {
      const sa = pp[0], fs_ = pp[1], da = sa === 0 ? a : bb, db = sa === 0 ? bb : a;
      const r = ctx.playGame(da, db, { pilot: job.pilot, seed: job.seed * 1000003 + b * 8 + k + 5, firstSeat: fs_, trackSeen: true });
      if (r.out === null) { timeouts++; return; }
      const y = sa === 0 ? r.out : 1 - r.out; // from A's perspective
      recs.push({ a, b: bb, f: fs_ === sa ? 1 : 0, y, k: job.base + b, r: r.rounds, sa: r.seen[sa], sb: r.seen[1 - sa] }); // sa/sb = cards each side drew at least once
    });
  }
  return { recs, timeouts };
}
exports.blockJob = blockJob;
if (!P.isMain && require.main === module) {
  const A = P.workerArgs(), ctx = PL.loadGame({ project: A.project, live: A.live, beam: A.beam, depth: A.depth }), D = LD.make(ctx);
  P.serve(job => blockJob(ctx, D, job));
} else if (P.isMain && require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

// ------------------------------------------------------------------ main side: play
async function play(A, pool, opt) {
  const total = opt.games, blockSize = opt.blockSize || 2, nBlocks = Math.ceil(total / blockSize), per = Math.max(20, Math.ceil(nBlocks / (pool.n * 8)));
  const jobs = []; for (let done = 0, j = 0; done < nBlocks; done += per, j++) jobs.push({ nBlocks: Math.min(per, nBlocks - done), blockSize, seed: opt.seed * 7919 + j, base: opt.seed * 1e6 + done, design: opt.design || 'curve', pilot: opt.pilot || 'basic', beta: opt.beta, temp: opt.temp });
  const t0 = Date.now();
  const res = await pool.run(jobs, (d, n) => process.stderr.write(`\r  ${opt.label || 'games'}: ${d}/${n} chunks ${((Date.now() - t0) / 1000).toFixed(0)}s   `));
  process.stderr.write('\n');
  const recs = []; let timeouts = 0; res.forEach(r => { recs.push(...r.recs); timeouts += r.timeouts; });
  return { recs, timeouts, seconds: (Date.now() - t0) / 1000 };
}

// ------------------------------------------------------------------ main side: fit
// anchorScale: ratio (design-based effect) / (draw-based effect x draw rate), estimated WITHOUT shared noise. Both estimators read the
// same game outcomes, so their errors are positively correlated and a plain cov(seen, deck) is biased towards 1. Instead the blocks are
// split in two halves: draw-based from half A against deck-based from half B (independent noise) and vice versa, divided by the
// draw-based signal variance cov(A, B). Needs a few thousand games; below that a documented default is used.
function anchorScale(recs, ctx, dflt) {
  dflt = dflt == null ? 0.8 : dflt;
  if (recs.length < 6000) return { slope: dflt, source: 'default (only ' + recs.length + ' games, need 6000 to estimate)' };
  const { BUILD } = ctx, nB = BUILD.length, idx = {}; BUILD.forEach((id, i) => idx[id] = i);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const cov = (x, y, w) => { let mx = 0, my = 0, n = 0; w.forEach(i => { mx += x[i]; my += y[i]; n++; }); mx /= n; my /= n; let c = 0; w.forEach(i => c += (x[i] - mx) * (y[i] - my)); return c / (n - 1); };
  const betas = (rs, mode) => {
    const rows = rs.map(r => {
      const m = new Map(), la = mode === 'seen' ? r.sa : r.a, lb = mode === 'seen' ? r.sb : r.b;
      la.forEach(id => m.set(idx[id], (m.get(idx[id]) || 0) + 1)); lb.forEach(id => m.set(idx[id], (m.get(idx[id]) || 0) - 1));
      const ii = [], vv = []; m.forEach((v, k) => { if (v) { ii.push(k); vv.push(v); } }); ii.push(nB); vv.push(r.f ? 1 : -1);
      return { i: Int32Array.from(ii), v: Float64Array.from(vv), y: r.y, off: 0, g: r.g != null ? r.g : r.k };
    });
    const pen = new Float64Array(nB + 1).fill(1e-3 * Math.max(1, rows.length / 1000)); pen[nB] = 0;
    const b = Array.from(S.logisticFit(rows, nB + 1, pen, { noCov: true }).beta.slice(0, nB));
    const ps = mode === 'seen' ? mean(rs.map(r => (r.sa.length + r.sb.length) / 2)) / 30 : 1;
    return b.map(x => x * ps);
  };
  const key = r => (r.g != null ? r.g : r.k), A = recs.filter(r => key(r) % 2 === 0), B = recs.filter(r => key(r) % 2 === 1);
  const sA = betas(A, 'seen'), sB = betas(B, 'seen'), dA = betas(A, 'deck'), dB = betas(B, 'deck');
  const stat = w => { const sig = cov(sA, sB, w), cr = (cov(sA, dB, w) + cov(sB, dA, w)) / 2, sd = cov(dA, dB, w); return { slope: sig > 0 ? cr / sig : NaN, corr: sig > 0 && sd > 0 ? cr / Math.sqrt(sig * sd) : NaN }; };
  const all = BUILD.map((_, i) => i), est = stat(all);
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296, bs = [];
  for (let t = 0; t < 300; t++) { const w = all.map(() => Math.floor(rnd() * nB)), s = stat(w).slope; if (Number.isFinite(s)) bs.push(s); }
  bs.sort((a, b) => a - b); const lo = bs[Math.floor(bs.length * .05)], hi = bs[Math.floor(bs.length * .95)];
  if (!Number.isFinite(est.slope)) return { slope: dflt, source: 'default (signal variance not positive)' };
  return { slope: Math.min(1.5, Math.max(0.3, est.slope)), lo, hi, corr: est.corr, source: 'split-half, ' + recs.length + ' games' };
}
exports.anchorScale = anchorScale;

function tribeOf(d) { return (d.Subtypes || []).find(s => ['Animal', 'Machine', 'Aberration', 'Human'].includes(s)) || 'Other'; }
const TRIBES = ['Animal', 'Machine', 'Aberration', 'Human'];
function fitEffects(recs, ctx, o) {
  o = o || {};
  const { CD, BUILD } = ctx, nB = BUILD.length, idx = {}; BUILD.forEach((id, i) => idx[id] = i);
  const seenMode = (o.exposure || (recs.length && recs[0].sa ? 'seen' : 'deck')) === 'seen';
  if (seenMode && !(recs.length && recs[0].sa)) throw new Error('games file has no draw information (sa/sb); re-run play');
  const extras = !!o.extras, nX = extras ? 4 : 0, Pn = nB + 1 + nX; // coefficients: cards, gamma(first mover), [extras]
  const feat = d => { // deck-level covariates for the optional "context" model
    const n = d.length; let ac = 0, u = 0; const t = {};
    d.forEach(id => { ac += CD[id].Cost; if (CD[id].Type === 'Unit') u++; const tr = tribeOf(CD[id]); t[tr] = (t[tr] || 0) + 1; });
    ac /= n; const conc = TRIBES.reduce((s, k) => s + ((t[k] || 0) / n) ** 2, 0);
    return [ac - 2.4, (ac - 2.4) ** 2, u / n - .7, conc - .25];
  };
  const rows = recs.map((r, n) => {
    const m = new Map(), la = seenMode ? r.sa : r.a, lb = seenMode ? r.sb : r.b; // exposure: cards DRAWN (seen) or cards IN THE DECK
    la.forEach(id => m.set(idx[id], (m.get(idx[id]) || 0) + 1)); lb.forEach(id => m.set(idx[id], (m.get(idx[id]) || 0) - 1));
    const ii = [], vv = []; m.forEach((v, k) => { if (v) { ii.push(k); vv.push(v); } });
    ii.push(nB); vv.push(r.f ? 1 : -1);
    if (extras) { const fa = feat(r.a), fb = feat(r.b); for (let k = 0; k < nX; k++) { ii.push(nB + 1 + k); vv.push(fa[k] - fb[k]); } }
    return { i: Int32Array.from(ii), v: Float64Array.from(vv), y: r.y, off: 0, g: r.g != null ? r.g : r.k };
  });
  const N = rows.length;
  const penFor = lam => { const p = new Float64Array(Pn); for (let j = 0; j < nB; j++) p[j] = lam; return p; };
  const grid = (o.grid || [0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3]).map(t => t * N);
  const cvRows = rows.slice(0, 8000); // cap the CV cost; rows are stored block by block, so blocks stay (almost) intact
  const cv = S.cvRidge(cvRows, Pn, penFor, grid, 4, 11);
  const best = cv.reduce((a, b) => b.loss < a.loss ? b : a);
  const fit = S.logisticFit(rows, Pn, penFor(best.lam));
  const raw = S.logisticFit(rows, Pn, penFor(1e-3 * Math.max(1, N / 1000)), { });
  // null (gamma only) log-loss for context
  const nullLoss = (() => { const p = recs.reduce((s, r) => s + r.y, 0) / N; return -(p * Math.log(p) + (1 - p) * Math.log(1 - p)); })();
  const out = { exposure: seenMode ? 'seen' : 'deck', N, lambda: best.lam, lambdaRel: best.lam / N, cv, cvLoss: best.loss, nullLoss, fit, raw, nB, idx, gamma: fit.beta[nB], gammaSe: fit.se[nB], extras };
  // per card table
  // Units. In 'seen' mode beta is the effect of DRAWING a copy. A copy in the deck is drawn in a fraction pSeen of games, so the
  // value of a copy IN THE DECK is about pSeen*beta. All pp figures are reported at deck level (win-rate points per copy in the
  // deck) so they are comparable with the old swap numbers and with --margin; the draw-level number is kept as when_drawn_pp.
  const pSeen = seenMode ? S.mean(recs.map(r => (r.sa.length + r.sb.length) / 2)) / 30 : 1; out.pSeen = pSeen;
  // ANCHOR: draw-based effects rank cards well (more precise) but their pp size is ~20-25% too large compared with the design-based
  // (cards-in-deck) estimate, whose unbiasedness is guaranteed by randomising the decks. Put the draw-based numbers on the design scale.
  const anchor = seenMode && !o.noAnchor ? (o.anchor != null ? { slope: +o.anchor, source: 'given' } : anchorScale(recs, ctx, o.anchorDefault)) : { slope: 1, source: 'none' };
  out.anchor = anchor.slope; out.anchorInfo = anchor; out.scale = pSeen * anchor.slope;
  const pp = b => 25 * b * out.scale; // slope of the logistic curve at 50% is 1/4: logit units -> win-probability points
  // CENTRING: "effect" must mean "relative to an average card of a typical deck". In deck mode the common level of all betas is not
  // identified (a deck always has 30 cards); in draw mode it is (seeing more cards helps) and would leak into every card's number.
  // So both fits are re-centred on the exposure-weighted mean card (weights = how often each card sits in the sampled decks).
  const expo = new Float64Array(nB); recs.forEach(r => { r.a.forEach(id => expo[idx[id]]++); r.b.forEach(id => expo[idx[id]]++); });
  const esum = expo.reduce((a, b) => a + b, 0), wmean = beta => { let s = 0; for (let i = 0; i < nB; i++) s += expo[i] / esum * beta[i]; return s; };
  const mu = wmean(fit.beta), muRaw = wmean(raw.beta); out.centre = mu;
  out.cards = BUILD.map((id, i) => ({ id, name: CD[id].Name, type: CD[id].Type, cost: CD[id].Cost, tribe: tribeOf(CD[id]), beta: fit.beta[i] - mu, se: fit.se[i], betaRaw: raw.beta[i] - muRaw, seRaw: raw.se[i] }));
  out.cards.forEach(c => { c.ppDrawn = 25 * c.beta; c.pp = pp(c.beta); c.sePp = pp(c.se); c.lo = pp(c.beta - 1.645 * c.se); c.hi = pp(c.beta + 1.645 * c.se); });
  // variance decomposition on the raw estimates: how much of the spread between cards is real?
  const rb = out.cards.map(c => c.betaRaw), mse = S.mean(out.cards.map(c => c.seRaw ** 2)), tv = Math.pow(S.sd(rb), 2);
  out.signalSdPp = pp(Math.sqrt(Math.max(0, tv - mse))); out.reliability = Math.max(0, (tv - mse) / tv); out.noiseSdPp = pp(Math.sqrt(mse));
  // cost-curve baseline: weighted mean effect per cost bucket
  const bucket = c => Math.min(c.cost, 6);
  const bk = {}; out.cards.forEach(c => { const k = bucket(c), w = 1 / (c.se ** 2); const e = bk[k] || (bk[k] = { sw: 0, swb: 0, n: 0 }); e.sw += w; e.swb += w * c.beta; e.n++; });
  Object.values(bk).forEach(e => { e.mean = e.swb / e.sw; e.se = Math.sqrt(1 / e.sw); });
  out.buckets = bk;
  const delta = (o.margin || 1.5), z = 1.645, base = o.baseline || 'cost';
  out.cards.forEach(c => {
    const g = base === 'zero' ? 0 : bk[bucket(c)].mean, gse = base === 'zero' ? 0 : bk[bucket(c)].se;
    c.dev = pp(c.beta - g); c.devSe = pp(Math.sqrt(c.se ** 2 + gse ** 2)); const lo = c.dev - z * c.devSe, hi = c.dev + z * c.devSe;
    c.verdict = lo > delta ? 'OVER' : hi < -delta ? 'UNDER' : (lo > -delta && hi < delta) ? 'FAIR' : 'UNSURE';
    const dist = Math.abs(delta - Math.abs(c.dev)), seT = dist / z; // distance to the nearest decision boundary
    c.extraGames = c.verdict === 'UNSURE' ? Math.round(N * Math.max(0, (c.devSe / Math.max(seT, 1e-9)) ** 2 - 1)) : 0;
    c.borderline = c.verdict === 'UNSURE' && c.extraGames > 12 * N;
  });
  out.delta = delta; out.baseline = base;
  return out;
}

function writeOutputs(dir, fitR, ctx, meta) {
  fs.mkdirSync(dir, { recursive: true });
  const q = s => { s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const f = (x, d) => Number.isFinite(x) ? x.toFixed(d == null ? 3 : d) : '';
  const hdr = ['id', 'name', 'type', 'cost', 'tribe', 'effect_pp', 'se_pp', 'ci90_lo_pp', 'ci90_hi_pp', 'vs_cost_peers_pp', 'vs_peers_se_pp', 'verdict', 'extra_games_to_decide', 'when_drawn_pp', 'beta_logit', 'beta_raw_logit', 'se_raw_logit'];
  const cs = fitR.cards.slice().sort((a, b) => b.dev - a.dev);
  fs.writeFileSync(path.join(dir, 'card_effects.csv'), [hdr].concat(cs.map(c => [c.id, c.name, c.type, c.cost, c.tribe, f(c.pp, 2), f(c.sePp, 2), f(c.lo, 2), f(c.hi, 2), f(c.dev, 2), f(c.devSe, 2), c.verdict + (c.borderline ? '*' : ''), c.extraGames, f(c.ppDrawn, 2), f(c.beta, 4), f(c.betaRaw, 4), f(c.seRaw, 4)])).map(r => r.map(q).join(',')).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'fit.json'), JSON.stringify({ N: fitR.N, exposure: fitR.exposure, anchor: fitR.anchor, anchorInfo: fitR.anchorInfo, pSeen: fitR.pSeen, margin: fitR.delta, baseline: fitR.baseline, gamma: fitR.gamma, gammaSe: fitR.gammaSe, reliability: fitR.reliability, signalSdPp: fitR.signalSdPp, noiseSdPp: fitR.noiseSdPp,
    cards: fitR.cards.map(c => ({ id: c.id, name: c.name, type: c.type, cost: c.cost, pp: c.pp, sePp: c.sePp, dev: c.dev, devSe: c.devSe, verdict: c.verdict, extraGames: c.extraGames, ppRaw: 25 * c.betaRaw * fitR.scale, seRawPp: 25 * c.seRaw * fitR.scale })) }));
  const beta = {}; fitR.cards.forEach(c => beta[c.id] = +(c.beta * fitR.scale).toFixed(5)); // deck-level logit per copy
  fs.writeFileSync(path.join(dir, 'effects.json'), JSON.stringify({ note: 'deck-level logit effect per copy (ridge, mean-centred). Use as --tilt for the next iteration.', gamma: fitR.gamma, N: fitR.N, beta }, null, 0));
  const pad = (s, n) => String(s).padEnd(n), rj = (s, n) => String(s).padStart(n);
  const line = c => `  ${rj(c.id, 3)} ${pad(c.name, 26)} cost ${c.cost}  effect ${rj(f(c.pp, 1), 5)}pp  vs cost-peers ${rj((c.dev >= 0 ? '+' : '') + f(c.dev, 1), 5)} +/-${f(1.645 * c.devSe, 1)}  ${c.verdict}${c.borderline ? '*' : ''}${c.extraGames ? '  (+' + c.extraGames + ' games to decide)' : ''}`;
  const cnt = v => fitR.cards.filter(c => c.verdict === v).length;
  const rep = [
    `RE:Joltance card-effect report   ${new Date().toISOString()}`,
    `games ${fitR.N}${meta && meta.pilot ? '  pilot ' + meta.pilot : ''}${meta && meta.design ? '  design ' + meta.design : ''}  | first-mover effect ${f(25 * fitR.gamma, 2)}pp (+/-${f(25 * 1.96 * fitR.gammaSe, 2)}) for the side that moves first`,
    fitR.exposure === 'seen' ? `scale anchor ${f(fitR.anchor, 2)}${fitR.anchorInfo.lo != null ? ' (90% CI ' + f(fitR.anchorInfo.lo, 2) + '-' + f(fitR.anchorInfo.hi, 2) + ')' : ''} [${fitR.anchorInfo.source}]: draw-based effects are multiplied by this so that pp are on the design-based (cards-in-deck) scale` : `exposure = cards in the deck (design-based, no anchor needed)`,
    `ridge strength chosen by 4-fold grouped CV: lambda = ${f(fitR.lambdaRel, 4)} * N | out-of-sample log-loss ${f(fitR.cvLoss, 4)} vs ${f(fitR.nullLoss, 4)} for "coin flip" (skill ${f(100 * (1 - fitR.cvLoss / fitR.nullLoss), 2)}% of the outcome entropy explained by deck contents)`,
    `noise per card (1 s.d. of the estimate): ${f(fitR.noiseSdPp, 2)}pp | real spread between cards: ${f(fitR.signalSdPp, 2)}pp s.d. | reliability of the ranking: ${f(fitR.reliability, 2)} (1 = pure signal)`,
    `effect = change in win probability (points) ${fitR.exposure === 'seen' ? 'when one copy replaces an average card in a typical deck (= draw rate ' + f(fitR.pSeen, 2) + ' x power when drawn; the draw-level number is the when_drawn_pp column)' : 'when ONE copy replaces an average card in a typical deck'}. Fairness verdict is relative to ${fitR.baseline === 'zero' ? 'zero' : 'cards of the same cost'} with a +/-${fitR.delta}pp margin and 90% confidence:`,
    `  OVER ${cnt('OVER')}  UNDER ${cnt('UNDER')}  FAIR (proven inside the margin) ${cnt('FAIR')}  UNSURE (not enough data yet) ${cnt('UNSURE')}`, '',
    'Mean effect by cost (pp per copy). CAUTION: tier levels depend on the deck design and on the exposure model (they move with both in the benchmark), so read them as a hint about curve balance only; the within-tier verdicts below are the robust output:',
    ...Object.keys(fitR.buckets).sort((a, b) => a - b).map(k => { const e = fitR.buckets[k]; return `  cost ${k === '6' ? '6+' : k}: ${rj(f(25 * fitR.scale * e.mean, 2), 6)}pp  (+/-${f(25 * fitR.scale * 1.96 * e.se, 2)}, ${e.n} cards)`; }), '',
    'OVER (too strong for their cost):', ...cs.filter(c => c.verdict === 'OVER').map(line), '',
    'UNDER (too weak for their cost):', ...cs.slice().reverse().filter(c => c.verdict === 'UNDER').map(line), '',
    'UNSURE (closest to a decision first):', ...fitR.cards.filter(c => c.verdict === 'UNSURE').sort((a, b) => a.extraGames - b.extraGames).slice(0, 15).map(line), '',
    '* = borderline: sits on the margin itself, more games will not settle it and either call is harmless.', ''];
  fs.writeFileSync(path.join(dir, 'report.txt'), rep.join('\n'));
  return rep.join('\n');
}

function readGames(files) {
  const recs = []; files.forEach((fn, fi) => { fs.readFileSync(fn, 'utf8').split('\n').forEach(l => { if (!l) return; const r = JSON.parse(l); r.g = fi * 1e9 + r.k; recs.push(r); }); });
  return recs;
}
function saveGames(dir, recs, meta) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'games.jsonl'), recs.map(r => JSON.stringify({ a: r.a, b: r.b, f: r.f, y: r.y, k: r.k, r: r.r, sa: r.sa, sb: r.sb })).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
}
exports.fitEffects = fitEffects; exports.play = play; exports.readGames = readGames; exports.writeOutputs = writeOutputs; exports.saveGames = saveGames; exports.parseArgs = parseArgs;

async function main() {
  const A = parseArgs(process.argv.slice(2)), cmd = A._ || 'all';
  const ctx = PL.loadGame({ project: A.project, live: A.live, beam: A.beam, depth: A.depth });
  const dir = path.resolve(A.out || path.join(__dirname, '..', 'results', 'card_effects'));
  const meta = { pilot: A.pilot || 'basic', design: A.design || 'curve', seed: +A.seed || 1 };
  let recs;
  if (cmd === 'play' || cmd === 'all') {
    const NW = Math.max(1, +A.workers || os.cpus().length), pool = P.create(__filename, A, NW);
    let opt = { games: +A.games || 6000, seed: +A.seed || 1, design: meta.design, pilot: meta.pilot, blockSize: +A.block || 2, label: meta.design };
    if (A.tilt) { opt.beta = JSON.parse(fs.readFileSync(A.tilt, 'utf8')).beta; opt.temp = +A.temp || 0.15; }
    const r = await play(A, pool, opt); pool.close();
    console.log(`played ${r.recs.length} games in ${r.seconds.toFixed(0)}s (${r.timeouts} timeouts dropped)`);
    recs = r.recs; saveGames(dir, recs, meta);
    if (cmd === 'play') return;
    recs.forEach(x => x.g = x.k);
  } else recs = readGames(A['games-file']);
  const fr = fitEffects(recs, ctx, { margin: A.margin ? +A.margin : 1.5, baseline: A.baseline, extras: !!A.extras, exposure: A.exposure, anchor: A.anchor != null ? +A.anchor : undefined, anchorDefault: A['anchor-default'] != null ? +A['anchor-default'] : undefined });
  console.log(writeOutputs(dir, fr, ctx, meta)); console.log('Files in ' + dir);
}
