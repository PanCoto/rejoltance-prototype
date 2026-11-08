'use strict';
// lib_design.js - deck samplers for designed experiments.
//
//  uniform : each slot uniform over all cards (max 3 copies), rejected unless "playable" (the old lab's random decks)
//  curve   : pick a mana-curve template (fast / mid / slow, jittered), then fill every cost bucket uniformly at random.
//            Card exposure is balanced WITHIN each cost bucket and decks look like something a person would build, so a
//            card is judged in plausible company instead of among 15 unplayable 7-drops.
//  tilted  : Metropolis walk from a curve deck towards decks that are good under current card effects beta
//            (target ~ exp(sum beta_c * copies_c / T)). Estimating effects on tilted decks measures cards in the
//            company of strong decks, and iterating (estimate -> tilt -> estimate) converges on a self-consistent meta.
exports.make = function (ctx) {
  const { CD, BUILD } = ctx;
  const bucketOf = c => c <= 1 ? 0 : c === 2 ? 1 : c === 3 ? 2 : c === 4 ? 3 : 4;
  const buckets = [[], [], [], [], []];
  BUILD.forEach(id => buckets[bucketOf(CD[id].Cost || 0)].push(id));
  const TEMPLATES = [[14, 9, 4, 2, 1], [11, 8, 6, 3, 2], [8, 7, 6, 5, 4], [12, 7, 5, 4, 2], [9, 9, 6, 4, 2]];
  const avgCost = d => d.reduce((a, id) => a + CD[id].Cost, 0) / d.length;
  const units = d => d.filter(id => CD[id].Type === 'Unit').length;
  function legal(d) {
    if (d.length !== 30) return false; const c = {};
    for (const id of d) { if (!CD[id]) return false; c[id] = (c[id] || 0) + 1; if (c[id] > 3) return false; }
    const a = avgCost(d); return units(d) >= 8 && a >= 1.2 && a <= 4.2;
  }
  function uniform(rnd) {
    for (let t = 0; t < 5000; t++) {
      const cnt = {}, d = [];
      while (d.length < 30) { const id = BUILD[Math.floor(rnd() * BUILD.length)]; if ((cnt[id] || 0) >= 3) continue; cnt[id] = (cnt[id] || 0) + 1; d.push(id); }
      const a = avgCost(d); if (units(d) >= 8 && a >= 1.4 && a <= 3.8) return d.sort((x, y) => x - y);
    }
    throw new Error('uniform sampler failed');
  }
  function curve(rnd) {
    for (let t = 0; t < 200; t++) {
      const tpl = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)].slice();
      for (let k = 0; k < 3; k++) { const a = Math.floor(rnd() * 5), b = Math.floor(rnd() * 5); if (a !== b && tpl[a] > 1 && rnd() < .6) { tpl[a]--; tpl[b]++; } }
      const cnt = {}, d = []; let ok = true;
      for (let b = 0; b < 5 && ok; b++) {
        let need = tpl[b], guard = 0;
        while (need > 0 && guard++ < 400) { const id = buckets[b][Math.floor(rnd() * buckets[b].length)]; if ((cnt[id] || 0) >= 3) continue; cnt[id] = (cnt[id] || 0) + 1; d.push(id); need--; }
        if (need > 0) ok = false;
      }
      if (ok && legal(d)) return d.sort((x, y) => x - y);
    }
    throw new Error('curve sampler failed');
  }
  // beta: {cardId: logit effect per copy}; T: temperature (smaller = pickier); steps: Metropolis swaps
  function tilted(rnd, beta, T, steps) {
    let d = curve(rnd); steps = steps || 120;
    for (let s = 0; s < steps; s++) {
      const slot = Math.floor(rnd() * 30), y = BUILD[Math.floor(rnd() * BUILD.length)], x = d[slot];
      if (y === x) continue;
      const dl = ((beta[y] || 0) - (beta[x] || 0)) / T;
      if (dl < 0 && rnd() > Math.exp(dl)) continue;
      const e = d.slice(); e[slot] = y; if (legal(e)) d = e;
    }
    return d.sort((x, y) => x - y);
  }
  const counts = d => { const c = {}; d.forEach(id => c[id] = (c[id] || 0) + 1); return c; };
  return { uniform, curve, tilted, legal, counts, avgCost, units, bucketOf, buckets };
};
