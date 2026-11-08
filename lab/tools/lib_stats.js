'use strict';
// lib_stats.js - small dependency-free statistics toolkit for the lab.
//  * ridge-penalised logistic regression (IRLS) on sparse rows, cluster-robust (sandwich) covariance, grouped K-fold CV
//  * Wilson / Beta helpers, correlation helpers, normal cdf / quantile
//  * symmetric zero-sum matrix-game solver (Nash mixture) used by the deck learner

const sigmoid = z => 1 / (1 + Math.exp(-z));
exports.sigmoid = sigmoid;

// ---------- dense linear algebra (row-major Float64Array, n x n) ----------
function cholesky(A, n) { // returns lower-triangular L (in a new array) or null if not PD
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) { if (s <= 1e-12) return null; L[i * n + i] = Math.sqrt(s); }
      else L[i * n + j] = s / L[j * n + j];
    }
  }
  return L;
}
function cholSolve(L, n, b) {
  const y = new Float64Array(n), x = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; }
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
}
function invFromChol(L, n) {
  const inv = new Float64Array(n * n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) { e.fill(0); e[j] = 1; const c = cholSolve(L, n, e); for (let i = 0; i < n; i++) inv[i * n + j] = c[i]; }
  return inv;
}
exports.cholesky = cholesky; exports.cholSolve = cholSolve; exports.invFromChol = invFromChol;

// ---------- logistic regression ----------
// rows: array of { i: Int32Array|number[] (feature indices), v: Float64Array|number[] (values), y: 0..1, off: offset, g: cluster id }
// pen : Float64Array(P) of ridge penalties per coefficient (0 = unpenalised)
// returns { beta, se (robust), seModel, cov, ll (penalised-free log-lik), iters }
function logisticFit(rows, P, pen, opt) {
  opt = opt || {};
  const beta = opt.start ? Float64Array.from(opt.start) : new Float64Array(P);
  const N = rows.length, eta = new Float64Array(N);
  let H = null, L = null, iters = 0;
  for (let it = 0; it < (opt.maxIter || 30); it++) {
    iters = it + 1;
    H = new Float64Array(P * P); const grad = new Float64Array(P);
    for (let r = 0; r < N; r++) {
      const row = rows[r], ix = row.i, vv = row.v, m = ix.length;
      let z = row.off || 0; for (let k = 0; k < m; k++) z += vv[k] * beta[ix[k]];
      eta[r] = z;
      const mu = sigmoid(z), w = Math.max(mu * (1 - mu), 1e-9), e = row.y - mu;
      for (let a = 0; a < m; a++) {
        const ia = ix[a], va = vv[a]; grad[ia] += va * e;
        const base = ia * P, wva = w * va;
        for (let b = 0; b < m; b++) H[base + ix[b]] += wva * vv[b];
      }
    }
    for (let j = 0; j < P; j++) { H[j * P + j] += pen[j] + 1e-9; grad[j] -= pen[j] * beta[j]; }
    L = cholesky(H, P);
    if (!L) { for (let j = 0; j < P; j++) H[j * P + j] += 1e-3; L = cholesky(H, P); if (!L) throw new Error('logistic Hessian not positive definite'); }
    const d = cholSolve(L, P, grad);
    let mx = 0; for (let j = 0; j < P; j++) { beta[j] += d[j]; mx = Math.max(mx, Math.abs(d[j])); }
    if (mx < 1e-7) break;
  }
  // final predictions & log-lik
  let ll = 0;
  for (let r = 0; r < N; r++) { const row = rows[r]; let z = row.off || 0; for (let k = 0; k < row.i.length; k++) z += row.v[k] * beta[row.i[k]]; eta[r] = z; const mu = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(z))); ll += row.y * Math.log(mu) + (1 - row.y) * Math.log(1 - mu); }
  if (opt.noCov) return { beta, ll, iters };
  // H was assembled at the previous beta; rebuild at final beta for the covariance
  H = new Float64Array(P * P);
  for (let r = 0; r < N; r++) {
    const row = rows[r], ix = row.i, vv = row.v, m = ix.length, mu = sigmoid(eta[r]), w = Math.max(mu * (1 - mu), 1e-9);
    for (let a = 0; a < m; a++) { const base = ix[a] * P, wva = w * vv[a]; for (let b = 0; b < m; b++) H[base + ix[b]] += wva * vv[b]; }
  }
  const Hp = Float64Array.from(H); for (let j = 0; j < P; j++) Hp[j * P + j] += pen[j] + 1e-9;
  L = cholesky(Hp, P); if (!L) throw new Error('final Hessian not PD');
  const Hinv = invFromChol(L, P);
  // cluster-robust meat
  const clusters = new Map();
  for (let r = 0; r < N; r++) { const row = rows[r], g = row.g == null ? r : row.g; let s = clusters.get(g); if (!s) { s = new Float64Array(P); clusters.set(g, s); } const e = row.y - sigmoid(eta[r]); for (let k = 0; k < row.i.length; k++) s[row.i[k]] += row.v[k] * e; }
  const meat = new Float64Array(P * P);
  clusters.forEach(s => { for (let a = 0; a < P; a++) { const sa = s[a]; if (sa === 0) continue; for (let b = 0; b < P; b++) meat[a * P + b] += sa * s[b]; } });
  const G = clusters.size, corr = G > 1 ? G / (G - 1) : 1;
  // cov = Hinv * meat * Hinv * corr
  const T = new Float64Array(P * P), cov = new Float64Array(P * P);
  for (let a = 0; a < P; a++) for (let k = 0; k < P; k++) { const h = Hinv[a * P + k]; if (h === 0) continue; for (let b = 0; b < P; b++) T[a * P + b] += h * meat[k * P + b]; }
  for (let a = 0; a < P; a++) for (let b = 0; b < P; b++) { let s = 0; for (let k = 0; k < P; k++) s += T[a * P + k] * Hinv[k * P + b]; cov[a * P + b] = s * corr; }
  const se = new Float64Array(P), seModel = new Float64Array(P);
  for (let j = 0; j < P; j++) { se[j] = Math.sqrt(Math.max(0, cov[j * P + j])); seModel[j] = Math.sqrt(Math.max(0, Hinv[j * P + j])); }
  return { beta, se, seModel, cov, Hinv, ll, iters, clusters: G };
}
exports.logisticFit = logisticFit;

function predictLogLoss(rows, beta) {
  let s = 0; for (const row of rows) { let z = row.off || 0; for (let k = 0; k < row.i.length; k++) z += row.v[k] * beta[row.i[k]]; const mu = Math.min(1 - 1e-9, Math.max(1e-9, sigmoid(z))); s -= row.y * Math.log(mu) + (1 - row.y) * Math.log(1 - mu); }
  return s / rows.length;
}
exports.predictLogLoss = predictLogLoss;

// grouped K-fold CV over a grid of ridge strengths. penBase(lam) -> Float64Array(P)
function cvRidge(rows, P, penFor, lams, K, seed) {
  const gs = [...new Set(rows.map(r => r.g))]; let s = (seed || 7) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = gs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gs[i], gs[j]] = [gs[j], gs[i]]; }
  const fold = new Map(); gs.forEach((g, i) => fold.set(g, i % K));
  const out = lams.map(l => ({ lam: l, loss: 0 }));
  for (let f = 0; f < K; f++) {
    const tr = rows.filter(r => fold.get(r.g) !== f), te = rows.filter(r => fold.get(r.g) === f);
    let start = null;
    lams.forEach((l, k) => { const fit = logisticFit(tr, P, penFor(l), { noCov: true, start, maxIter: 15 }); start = fit.beta; out[k].loss += predictLogLoss(te, fit.beta) * te.length / rows.length; });
  }
  return out;
}
exports.cvRidge = cvRidge;

// ---------- intervals & summary stats ----------
exports.wilson = function (w, n, z) { z = z || 1.96; if (!n) return [NaN, NaN]; const p = w / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; };
exports.mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
exports.sd = a => { const m = exports.mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, a.length - 1)); };
exports.pearson = function (x, y) { const n = x.length, mx = exports.mean(x), my = exports.mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; }
exports.spearman = (x, y) => exports.pearson(ranks(x), ranks(y));
exports.normCdf = function (x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
exports.zq = { 80: 1.2816, 90: 1.6449, 95: 1.96, 99: 2.5758 };

// ---------- symmetric zero-sum matrix game ----------
// M[i][j] = win probability of deck i vs deck j (0..1; diagonal ignored = 0.5). Returns the Nash mixture (row player),
// found by averaged multiplicative weights; also returns the game value gap (exploitability of the mixture, in win-prob units).
exports.solveSymmetricGame = function (M, iters) {
  const n = M.length; if (n === 1) return { p: [1], gap: 0 };
  const A = M.map((r, i) => r.map((v, j) => i === j ? 0 : v - 0.5)); // payoff to row; antisymmetric
  let w = new Float64Array(n).fill(1), avg = new Float64Array(n); iters = iters || 6000;
  const eta = 2 * Math.sqrt(Math.log(n) / iters) / 0.5;
  for (let t = 0; t < iters; t++) {
    let s = 0; for (let i = 0; i < n; i++) s += w[i];
    const p = Array.from(w, x => x / s);
    for (let i = 0; i < n; i++) avg[i] += p[i];
    // opponent plays p too (symmetric) -> expected payoff of each pure deck vs p
    for (let i = 0; i < n; i++) { let u = 0; for (let j = 0; j < n; j++) u += A[i][j] * p[j]; w[i] *= Math.exp(eta * u); }
    let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, w[i]); if (m > 1e100) for (let i = 0; i < n; i++) w[i] /= m;
  }
  const p = Array.from(avg, x => x / iters); let gap = -1;
  for (let i = 0; i < n; i++) { let u = 0; for (let j = 0; j < n; j++) u += A[i][j] * p[j]; gap = Math.max(gap, u); }
  return { p, gap }; // gap = best pure reply's edge over 50% against the mixture (0 for an exact equilibrium)
};
