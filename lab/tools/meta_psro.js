#!/usr/bin/env node
'use strict';
// meta_psro.js - learn decks and the metagame together by double-oracle self-play (PSRO).
//
//   node tools/meta_psro.js --pilot basic --iters 12 --out results/meta1 [--effects results/ce1/effects.json]
//
// What it replaces: deck_search.js (MAP-Elites against a drifting "gauntlet"). That search ranks decks by win rate against a
// pool containing weak old decks and random decks, picks winners from ~100-game samples (winner's curse: the reported 70-79%
// win rates are the best of thousands of noisy draws), and the decks it returns beat each other in a rock-paper-scissors
// pattern (the matrix shows 17% and 83% matchups), so "win rate vs gauntlet" does not say whether a deck is good.
//
// Method (double oracle / PSRO for a symmetric zero-sum game; the game is "pick a 30-card deck"):
//   1. population  = decks found so far (premade + learned). payoff matrix M[i][j] = measured win probability, seats and
//                    first move balanced, shrunk towards 50% for pairs with few games.
//   2. meta        = Nash mixture pi of that matrix (how often each deck would be played at equilibrium).
//   3. oracle      = look for a BEST RESPONSE to pi, i.e. a deck that beats the mixture:
//                      - proposals: Thompson-sampled card-effect model (learned online from every game played), mutations of the
//                        equilibrium decks, fresh curve decks (exploration);
//                      - successive-halving race against opponents sampled from pi (same opponents + same seeds for all
//                        candidates -> low-variance comparisons);
//                      - the winner is then CONFIRMED on fresh games it was never selected on; it joins the population only if
//                        the lower 90% bound of its win rate vs pi is above 50%.
//   4. repeat until `patience` consecutive searches fail to find a confirmed exploit.
//   5. final challenge with a bigger search; its confirmed win rate vs pi is the EXPLOITABILITY of the final meta (with CI):
//      "no deck we could find beats the meta by more than X points".
// Fairness read-outs: exploitability, how concentrated the equilibrium meta is, how much of the card pool it uses, and (optional
// --check-pilot) whether the conclusions survive a different pilot (decks that only work for one bot are flagged).
const fs = require('fs'), path = require('path'), os = require('os');
const P = require('./lib_pool'), S = require('./lib_stats'), PL = require('./lib_pilot'), LD = require('./lib_design'), CE = require('./card_effects'), DC = require('./deckcode');

// ---------------------------------------------------------------- worker side
if (!P.isMain) {
  const A = P.workerArgs(), ctx = PL.loadGame({ project: A.project, live: A.live, beam: A.beam, depth: A.depth });
  const PAT = [[0, 0], [1, 0], [0, 1], [1, 1]]; // [seat of the deck under test, first-moving seat]
  const one = (deck, opp, g, seed, pilot) => { // returns the deck's score in one game (1 / .5 / 0) or null
    const [sd, fsx] = PAT[g % 4], r = ctx.playGame(sd === 0 ? deck : opp, sd === 0 ? opp : deck, { pilot, seed, firstSeat: fsx });
    return r.out === null ? null : (sd === 0 ? r.out : 1 - r.out);
  };
  P.serve(job => {
    let w = 0, n = 0;
    if (job.type === 'match') for (let g = 0; g < job.n; g++) { const y = one(job.a, job.b, g, job.seed * 7919 + g, job.pilot); if (y !== null) { w += y; n++; } }
    else if (job.type === 'mix') job.opps.forEach((o, g) => { const y = one(job.deck, o, g + job.offset, job.seed * 7919 + g, job.pilot); if (y !== null) { w += y; n++; } });
    else throw new Error('job ' + job.type);
    return { w, n };
  });
  return;
}

// ---------------------------------------------------------------- main side
const A = CE.parseArgs(process.argv.slice(2));
const NW = Math.max(1, +A.workers || os.cpus().length), PILOT = A.pilot || 'basic', SEED = +A.seed || 1;
const ITERS = A.iters != null ? +A.iters : 12, PATIENCE = +A.patience || 3, K = +A.candidates || 18, N_CONF = +A.confirm || 240, N_PAIR = +A.pair || 48;
const STAGES = (A.stages || '16,48,128').split(',').map(Number), CHECK = A['check-pilot'] || null;
const OUT = path.resolve(A.out || path.join(__dirname, '..', 'results', 'meta')); fs.mkdirSync(OUT, { recursive: true });
const ctx = PL.loadGame({ project: A.project, live: A.live }), D = LD.make(ctx), { CD, BUILD } = ctx;
const rnd = PL.mulberry32(SEED * 31 + 5), pool = P.create(__filename, A, NW);
const key = d => d.slice().sort((a, b) => a - b).join(','), srt = d => d.slice().sort((a, b) => a - b);
const log = []; const say = s => { console.log(s); log.push(s); };

// population & payoff counts
const pop = []; let W = [], Nn = [];
const addDeck = (deck, name) => { pop.push({ deck: srt(deck), name }); W.forEach(r => r.push(0)); Nn.forEach(r => r.push(0)); W.push(new Array(pop.length).fill(0)); Nn.push(new Array(pop.length).fill(0)); return pop.length - 1; };
const allGames = []; // every deck-vs-deck game, for the online card-effect model
let seedCtr = 1;

async function playPairs(list, pilot) { // list of [i,j,n]
  const jobs = list.filter(x => x[2] > 0).map(([i, j, n]) => ({ type: 'match', a: pop[i].deck, b: pop[j].deck, n, seed: SEED * 1000 + (seedCtr++), pilot: pilot || PILOT, i, j }));
  const res = await pool.run(jobs);
  res.forEach((r, k) => { const { i, j } = jobs[k]; if (!pilot || pilot === PILOT) { W[i][j] += r.w; Nn[i][j] += r.n; W[j][i] += r.n - r.w; Nn[j][i] += r.n; } });
  return jobs.map((jb, k) => ({ i: jb.i, j: jb.j, w: res[k].w, n: res[k].n }));
}
const SHR = 6;
const matrix = (pilotW, pilotN) => { const w = pilotW || W, n = pilotN || Nn; return w.map((r, i) => r.map((v, j) => i === j ? .5 : (v + .5 * SHR) / (n[i][j] + SHR))); };
const sampleOpp = (pi, r) => { let x = r(), c = 0; for (let i = 0; i < pi.length; i++) { c += pi[i]; if (x <= c) return i; } return pi.length - 1; };

async function evalVsMix(decks, pi, n, seed, onGames) { // all candidates face the SAME sampled opponents, seats, seeds
  const r = PL.mulberry32(seed), opps = Array.from({ length: n }, () => sampleOpp(pi, r)), oppDecks = opps.map(i => pop[i].deck);
  const jobs = []; const per = Math.max(8, Math.ceil(n / 2));
  decks.forEach((d, ci) => { for (let off = 0; off < n; off += per) jobs.push({ type: 'mix', deck: d, opps: oppDecks.slice(off, off + per), offset: off, seed: seed * 13 + off, pilot: PILOT, ci }); });
  const res = await pool.run(jobs), agg = decks.map(() => ({ w: 0, n: 0 }));
  res.forEach((x, k) => { agg[jobs[k].ci].w += x.w; agg[jobs[k].ci].n += x.n; });
  return agg;
}

// ---- online card-effect model (Thompson sampling): fit on every game so far, draw one plausible beta
let tsCache = { n: -1, fr: null };
function thompson() {
  if (allGames.length < 1500) return A.effects ? JSON.parse(fs.readFileSync(A.effects, 'utf8')).beta : null;
  if (tsCache.n !== allGames.length) { const recs = allGames.map(g => ({ a: g.a, b: g.b, f: g.f, y: g.y, g: g.k })); tsCache = { n: allGames.length, fr: CE.fitEffects(recs, ctx, { exposure: 'deck', grid: [0.02] }) }; }
  const fr = tsCache.fr, P_ = fr.cards.length + 1, cov = Float64Array.from(fr.fit.cov);
  for (let j = 0; j < P_; j++) cov[j * P_ + j] += 1e-6;
  const L = S.cholesky(cov, P_); const beta = {};
  if (!L) { fr.cards.forEach(c => beta[c.id] = c.beta); return beta; }
  const z = Array.from({ length: P_ }, () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); });
  fr.cards.forEach((c, i) => { let s = 0; for (let k = 0; k <= i; k++) s += L[i * P_ + k] * z[k]; beta[c.id] = c.beta + s; });
  return beta;
}
function mutate(d, k) {
  for (let t = 0; t < 60; t++) {
    const x = d.slice(), n = k || 2 + Math.floor(rnd() * 5);
    for (let s = 0; s < n; s++) { const slot = Math.floor(rnd() * 30), id = BUILD[Math.floor(rnd() * BUILD.length)]; x[slot] = id; }
    if (D.legal(x) && key(x) !== key(d)) return srt(x);
  }
  return null;
}
function proposals(pi, count) {
  const seen = new Set(pop.map(p => key(p.deck))), out = [], push = (d, src) => { if (d && D.legal(d) && !seen.has(key(d))) { seen.add(key(d)); out.push({ deck: srt(d), src }); } };
  const nTS = Math.round(count * .35), nMut = Math.round(count * .45);
  for (let t = 0; t < 40 && out.length < nTS; t++) { const beta = thompson(); push(beta ? D.tilted(rnd, beta, 0.03, 500) : D.curve(rnd), 'model'); }
  for (let t = 0; t < 200 && out.length < nTS + nMut; t++) { const i = sampleOpp(pi.map(p => .7 * p + .3 / pi.length), rnd); push(mutate(pop[i].deck), 'mutation'); }
  for (let t = 0; t < 200 && out.length < count; t++) push(D.curve(rnd), 'fresh');
  return out;
}

async function bestResponse(pi, count, nConf, stages, tag) {
  const cands = proposals(pi, count); let live = cands.map((c, i) => ({ ...c, w: 0, n: 0, i }));
  const seedBase = SEED * 100000 + (seedCtr++) * 997;
  for (let s = 0; s < stages.length; s++) {
    const res = await evalVsMix(live.map(c => c.deck), pi, stages[s], seedBase + s * 31, null);
    live.forEach((c, k) => { c.w = res[k].w; c.n = res[k].n; c.wr = res[k].n ? res[k].w / res[k].n : 0; }); // each stage uses fresh opponents; the score of the LAST stage drives ranking
    live.sort((a, b) => b.wr - a.wr);
    const keep = s === stages.length - 1 ? 1 : Math.max(1, Math.ceil(live.length / (s === 0 ? 3 : 3)));
    live = live.slice(0, keep);
  }
  const best = live[0];
  const conf = (await evalVsMix([best.deck], pi, nConf, seedBase + 9999, null))[0]; // FRESH games, never used for selection
  const [lo, hi] = S.wilson(conf.w, conf.n, 1.645);
  return { deck: best.deck, src: best.src, raceWr: best.wr, wr: conf.w / conf.n, lo, hi, n: conf.n, candidates: cands.length };
}

const styleOf = d => { const a = D.avgCost(d), u = D.units(d), t = {}; d.forEach(id => { const tr = (CD[id].Subtypes || []).find(x => ['Animal', 'Machine', 'Aberration', 'Human'].includes(x)) || 'Other'; t[tr] = (t[tr] || 0) + 1; }); const top = Object.keys(t).sort((x, y) => t[y] - t[x])[0]; return `${u <= 15 ? 'Spells' : a < 2.1 ? 'Rush' : a < 2.7 ? 'Midrange' : 'Slow'}/${top}`; };
const nameOf = (d, used) => { const best = d.slice().sort((x, y) => CD[y].Cost - CD[x].Cost || x - y)[0]; let n = CD[best].Name.replace(/[^A-Za-z0-9]/g, '') + styleOf(d).split('/')[0]; let k = 2, b = n; while (used.has(n)) n = b + k++; used.add(n); return n; };

(async () => {
  const t0 = Date.now(), mins = () => ((Date.now() - t0) / 60000).toFixed(1) + ' min', used = new Set();
  say(`meta_psro | pilot=${PILOT} | ${NW} workers | iters<=${ITERS} patience ${PATIENCE} | ${K} candidates, race ${STAGES.join('->')} games, confirm ${N_CONF}`);
  (A.decks ? DC.readDecks(A.decks) : DECKS).forEach(d => { used.add(d.n); addDeck(d.c, d.n); });
  for (let k = 0; k < (A.init != null ? +A.init : (A.decks ? 0 : 3)); k++) { const d = D.curve(rnd); addDeck(d, nameOf(d, used)); }
  const all = []; for (let i = 0; i < pop.length; i++) for (let j = i + 1; j < pop.length; j++) all.push([i, j, N_PAIR]);
  await playPairs(all);
  const hist = []; let fails = 0, accepted = 0;
  // surrogate training data: plain curve-design games, played once up-front so Thompson sampling has something to start from, then grown each iteration
  const addSurrogateGames = async (nBlocks) => {
    const jobs = []; const per = Math.max(10, Math.ceil(nBlocks / (NW * 2)));
    for (let done = 0; done < nBlocks; done += per) jobs.push({ nBlocks: Math.min(per, nBlocks - done), blockSize: 2, seed: SEED * 555 + (seedCtr++), base: SEED * 1e7 + seedCtr * 1e3, design: 'curve', pilot: PILOT });
    const sp = P.create(path.join(__dirname, 'card_effects.js'), A, NW); const res = await sp.run(jobs); sp.close();
    res.forEach(r => allGames.push(...r.recs));
  };
  await addSurrogateGames(Math.round((+A['surrogate-games'] || 3000) / 2));
  for (let it = 1; it <= ITERS; it++) {
    const M = matrix(), { p: pi, gap } = S.solveSymmetricGame(M);
    const br = await bestResponse(pi, K, N_CONF, STAGES, 'it' + it);
    const ok = br.lo > .5; hist.push({ it, pop: pop.length, gap, brWr: br.wr, brLo: br.lo, ok, src: br.src });
    say(`iter ${it}: meta of ${pop.length} decks (top weight ${(Math.max(...pi) * 100).toFixed(0)}%, internal gap ${(gap * 100).toFixed(1)}pp) | best of ${br.candidates} candidates [${br.src}]: race ${(br.raceWr * 100).toFixed(1)}% -> confirmed ${(br.wr * 100).toFixed(1)}% vs meta (90% lower bound ${(br.lo * 100).toFixed(1)}%) => ${ok ? 'ACCEPTED' : 'rejected'} | ${mins()}`);
    if (ok) { fails = 0; accepted++; const idx = addDeck(br.deck, nameOf(br.deck, used)); await playPairs(pop.slice(0, idx).map((_, j) => [idx, j, N_PAIR])); await addSurrogateGames(300); }
    else { fails++; if (fails >= PATIENCE) { say(`stopping: ${PATIENCE} searches in a row found no confirmed exploit`); break; } }
    // keep the matrix honest for the decks that matter: top up pairs among decks that carry weight
    const { p } = S.solveSymmetricGame(matrix()), heavy = p.map((x, i) => [x, i]).filter(x => x[0] > .03).map(x => x[1]), extra = [];
    for (let a = 0; a < heavy.length; a++) for (let b = a + 1; b < heavy.length; b++) { const i = heavy[a], j = heavy[b], want = N_PAIR + 24 * it; if (Nn[i][j] < want) extra.push([i, j, want - Nn[i][j]]); }
    await playPairs(extra);
  }
  // ---- final: polish the matrix, solve, challenge
  say(`final polish of the payoff matrix (${mins()})`);
  const fin = [], target = +A['final-pair'] || 120; for (let i = 0; i < pop.length; i++) for (let j = i + 1; j < pop.length; j++) if (Nn[i][j] < target) fin.push([i, j, target - Nn[i][j]]);
  await playPairs(fin);
  const M = matrix(), sol = S.solveSymmetricGame(M), pi = sol.p;
  const chal = await bestResponse(pi, 2 * K, 2 * N_CONF, STAGES.map(x => Math.round(x * 1.5)), 'final');
  const exploit = chal.wr - .5, [clo, chi] = S.wilson(Math.round(chal.wr * chal.n), chal.n, 1.645);
  const verdictTxt = clo > .5 ? `EXPLOITABLE: this deck beats the meta by at least ${((clo - .5) * 100).toFixed(1)}pp (90% confidence); the true exploitability is at least that` : `no exploit found: the best of ${chal.candidates} candidates does not significantly beat the meta. This is NOT a proof of safety - it is a lower bound on exploitability from a finite search (a stronger search could find more)`;
  say(`FINAL CHALLENGE: best of ${chal.candidates} fresh candidates [${chal.src}] wins ${(chal.wr * 100).toFixed(1)}% vs the meta over ${chal.n} fresh games (90% CI ${(clo * 100).toFixed(1)}-${(chi * 100).toFixed(1)}%)  => ${verdictTxt}`);
  // ---- optional pilot robustness check
  let pilotCheck = null;
  if (CHECK) {
    const heavy = pi.map((x, i) => [x, i]).filter(x => x[0] > .02).map(x => x[1]); const pairs = []; for (let a = 0; a < heavy.length; a++) for (let b = a + 1; b < heavy.length; b++) pairs.push([heavy[a], heavy[b], +A['check-games'] || 60]);
    const W2 = pop.map(() => new Array(pop.length).fill(0)), N2 = pop.map(() => new Array(pop.length).fill(0));
    const rr = await playPairs(pairs, CHECK); rr.forEach(x => { W2[x.i][x.j] += x.w; N2[x.i][x.j] += x.n; W2[x.j][x.i] += x.n - x.w; N2[x.j][x.i] += x.n; });
    const sub = heavy.map(i => heavy.map(j => i === j ? .5 : (W2[i][j] + .5 * SHR) / (N2[i][j] + SHR))), s2 = S.solveSymmetricGame(sub), sub1 = heavy.map(i => heavy.map(j => M[i][j])), s1 = S.solveSymmetricGame(sub1);
    const str1 = heavy.map((i, a) => S.mean(heavy.filter(j => j !== i).map(j => M[i][j]))), str2 = heavy.map((i, a) => S.mean(heavy.filter(j => j !== i).map(j => sub[a][heavy.indexOf(j)])));
    pilotCheck = { pilot: CHECK, rho: heavy.length > 2 ? S.spearman(str1, str2) : NaN, mixL1: s1.p.reduce((s, x, a) => s + Math.abs(x - s2.p[a]), 0) / 2, decks: heavy.map(i => pop[i].name), p1: s1.p, p2: s2.p };
    say(`pilot check (${PILOT} vs ${CHECK}) on the ${heavy.length} decks with meta weight: rank agreement of deck strength Spearman ${pilotCheck.rho.toFixed(2)}, equilibrium mix moves by ${(pilotCheck.mixL1 * 100).toFixed(0)}% (total variation)`);
  }
  // ---- report
  const f1 = x => (x * 100).toFixed(1) + '%', rows = pop.map((p, i) => ({ i, p, pi: pi[i] })).sort((a, b) => b.pi - a.pi);
  const vsPi = i => { let s = 0, w = 0; pop.forEach((_, j) => { if (j !== i) { s += pi[j] * M[i][j]; w += pi[j]; } }); return w ? s / w : .5; };
  const incl = {}; BUILD.forEach(id => incl[id] = { w: 0, copies: 0, any: 0 }); pop.forEach((p, i) => { const c = D.counts(p.deck); for (const id in c) { incl[id].w += pi[i]; incl[id].copies += pi[i] * c[id]; incl[id].any += 1; } });
  const used_ = BUILD.filter(id => incl[id].any > 0).length, eff = A.effects ? JSON.parse(fs.readFileSync(A.effects, 'utf8')).beta : null;
  const hhi = pi.reduce((s, x) => s + x * x, 0), effDecks = 1 / hhi;
  const rep = [`RE:Joltance learned metagame   ${new Date().toISOString()}   pilot ${PILOT}   ${mins()}`, '',
    `EQUILIBRIUM META (${pop.length} decks found, ${accepted} learned; effectively ${effDecks.toFixed(1)} decks carry the weight; ${used_}/${BUILD.length} cards appear in some deck):`,
    ...rows.filter(r => r.pi > .005).map(r => `  ${(r.pi * 100).toFixed(0).padStart(3)}%  ${r.p.name.padEnd(26)} ${styleOf(r.p.deck).padEnd(18)} avg cost ${D.avgCost(r.p.deck).toFixed(2)}  ${D.units(r.p.deck)}u/${30 - D.units(r.p.deck)}s  vs meta ${f1(vsPi(r.i))}  CODE ${DC.encode(r.p.deck)}`),
    '', `Decks the equilibrium does not use (weight < 0.5%): ${rows.filter(r => r.pi <= .005).map(r => r.p.name + ' (' + f1(vsPi(r.i)) + ' vs meta)').join(', ') || 'none'}`, '',
    `EXPLOITABILITY (lower bound from search): ${hist.map(h => h.ok ? 'it' + h.it + ' +' + ((h.brWr - .5) * 100).toFixed(1) : 'it' + h.it + ' none').join(', ')} | final challenge ${(chal.wr * 100).toFixed(1)}% (90% CI ${(clo * 100).toFixed(1)}-${(chi * 100).toFixed(1)}%), search of ${chal.candidates} candidates => ${verdictTxt}.`,
    `Balance target: best response found <= ~53% (lower CI bound not above 50%) and no single deck above ~35% of the meta. This run: top deck ${(Math.max(...pi) * 100).toFixed(0)}%.`, '',
    'CARD PICK RATES inside the equilibrium meta (weight-averaged share of meta decks containing the card):',
    ...BUILD.slice().sort((a, b) => incl[b].w - incl[a].w).slice(0, 14).map(id => `  ${(incl[id].w * 100).toFixed(0).padStart(3)}%  ${CD[id].Name.padEnd(26)} cost ${CD[id].Cost}  avg copies ${incl[id].w ? (incl[id].copies / incl[id].w).toFixed(1) : '-'}${eff ? '  effect ' + (25 * eff[id]).toFixed(1) + 'pp' : ''}`),
    `  ... ${BUILD.length - used_} cards were never picked by any deck found. Treat that as a lead, not a verdict: check them in card_effects (UNDER verdict + low pick rate = real problem).`, ''];
  if (pilotCheck) rep.push(`PILOT ROBUSTNESS (${PILOT} vs ${pilotCheck.pilot}): Spearman ${pilotCheck.rho.toFixed(2)}; equilibrium mix shifts ${(pilotCheck.mixL1 * 100).toFixed(0)}%. ${pilotCheck.rho < .6 || pilotCheck.mixL1 > .4 ? 'LOW agreement: the learned meta depends on how the bot plays; do not trust it for balance.' : 'Agreement is reasonable.'}`, '');
  rep.push('PAYOFF MATRIX (row deck win rate vs column deck; games per pair in brackets for the first row):', '  ' + ''.padEnd(26) + pop.map((_, j) => String(j).padStart(5)).join(''), ...pop.map((p, i) => '  ' + (i + '. ' + p.name).slice(0, 25).padEnd(26) + pop.map((_, j) => i === j ? '    -' : (M[i][j] * 100).toFixed(0).padStart(5)).join('')), '',
    'HISTORY:', ...log.filter(l => l.startsWith('iter')), '', 'Caveat: strength is measured with a bot pilot; confirm the final meta with human playtests and keep a record of decklists from online matches (the server currently stores results only).', '');
  fs.writeFileSync(path.join(OUT, 'meta_report.txt'), rep.join('\n'));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ pilot: PILOT, decks: pop.map((p, i) => ({ n: p.name, c: p.deck, weight: pi[i], code: DC.encode(p.deck) })), matrix: M, games: Nn, history: hist, finalChallenge: { wr: chal.wr, lo: clo, hi: chi, n: chal.n, candidates: chal.candidates, exploitLowerBoundPp: Math.max(0, (clo - .5) * 100) }, pilotCheck }, null, 1));
  fs.writeFileSync(path.join(OUT, 'deck_codes.txt'), '# decks of the learned meta (name: code), most-played first\n' + rows.map(r => r.p.name + ': ' + DC.encode(r.p.deck)).join('\n') + '\n');
  console.log('\n' + rep.join('\n') + '\nFiles in ' + OUT); pool.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
