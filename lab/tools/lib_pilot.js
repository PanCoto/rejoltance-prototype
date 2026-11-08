'use strict';
// lib_pilot.js - game loader + game runner with an EXPLICIT pilot registry.
//
// Why this exists: in sim.js / lib_game.js the variable BOTMODE is assigned but never read, and bot.js defines
// botPlan() as "always Smart". So `--bot basic` and `bot_ab --vs basic` silently run the Smart bot. Here the pilot
// is chosen by name and the right planner is called directly:
//   basic   - engine.js botPlanBasic (greedy, highest cost first) + heuristic mulligan      (~fast)
//   classic - Smart beam search, single-world evaluation (BW.look=0), heuristic mulligan     (medium)
//   smart   - Smart bot with its default weights (look-ahead over several sampled worlds)    (slow)
// It also lets the caller fix WHO MOVES FIRST, which is what makes first-player advantage cancel by design.
const fs = require('fs'), path = require('path'), vm = require('vm');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
exports.mulberry32 = mulberry32;

exports.loadGame = function (o) {
  o = o || {};
  const project = path.resolve(o.project || path.join(__dirname, '..', '..', 'game'));
  const rd = f => fs.readFileSync(path.join(project, f), 'utf8');
  global.window = global;
  vm.runInThisContext(rd('cards.js') + '\n;\n', { filename: 'cards.js' });
  if (fs.existsSync(path.join(project, 'decks.js'))) vm.runInThisContext(rd('decks.js') + '\n;\n', { filename: 'decks.js' });
  if (o.live) { // balance patch in cards-live.json format
    const d = JSON.parse(fs.readFileSync(o.live, 'utf8'));
    Object.keys(d.cards || {}).forEach(id => { const c = CARDS.find(k => k.Id == id); if (c) Object.assign(c, d.cards[id]); else CARDS.push(Object.assign({ Id: +id }, d.cards[id])); });
  }
  let bot = rd('bot.js');
  if (!/BUDGET=140,BEAM=5,DEPTH=5/.test(bot)) throw new Error('bot.js: search constants not found (file changed?)');
  bot = bot.replace('BUDGET=140,BEAM=5,DEPTH=5', 'BUDGET=Infinity,BEAM=' + (o.beam || 5) + ',DEPTH=' + (o.depth || 5)); // deterministic: no wall-clock cut-offs
  vm.runInThisContext(rd('engine.js') + '\n;\n' + bot, { filename: 'engine+bot.js' });

  const DEFAULT_BW = Object.assign({}, global.BW);
  const BW_BY_PILOT = {
    basic: Object.assign({}, DEFAULT_BW, { look: 0, mull: 0 }),
    classic: Object.assign({}, DEFAULT_BW, { look: 0, mull: 0 }),
    smart: Object.assign({}, DEFAULT_BW)
  };
  const BUILD = CARDS.filter(c => c.Id < 900).map(c => c.Id).sort((a, b) => a - b);
  const plan = (pilot, G, p) => pilot === 'basic' ? botPlanBasic(G, p) : botPlanSmart(G, p);

  // Play one game. seat 0 plays deck `da`, seat 1 plays deck `db`.
  //  x.firstSeat : 0 | 1 = that seat moves first; null/undefined = random (engine coin flip)
  //  x.pilots    : [pilotSeat0, pilotSeat1], default 'basic'
  //  x.seed      : seeds Math.random (shuffles, engine randomness) so a game is exactly reproducible
  // returns { out: 1 seat0 wins | 0 seat1 wins | .5 draw | null timeout, first, rounds, hp:[h0,h1] }
  function playGame(da, db, x) {
    x = x || {};
    const pilots = x.pilots || [x.pilot || 'basic', x.pilot || 'basic'];
    if (x.seed != null) Math.random = mulberry32(x.seed);
    const G = newGame(da, db);
    const idOf = x.trackSeen ? G.p.map(p => new Map(p.hand.concat(p.deck).map(c => [c.uid, c.id]))) : null;
    for (let i = 0; i < 2; i++) { global.BW = BW_BY_PILOT[pilots[i]]; botMull(G, G.p[i]); }
    if (x.firstSeat === 0) decideStart(G, 'first', 'second');
    else if (x.firstSeat === 1) decideStart(G, 'second', 'first');
    else decideStart(G, 'first', 'first');
    startRound(G);
    let guard = 0;
    while (!G.over && guard++ < 500) {
      if (G.step >= 3) { for (let i = 0; i < 4 && !G.over; i++) lane(G, i, {}); if (G.over) break; endRound(G); startRound(G); continue; }
      const i = G.act; if (i !== 0 && i !== 1) { nextStep(G); continue; }
      global.BW = BW_BY_PILOT[pilots[i]];
      let n = 0;
      while (n++ < 20 && !G.over) { const m = plan(pilots[i], G, G.p[i]); if (!m) break; play(G, G.p[i], m.ci, m.ln, m.pk); }
      nextStep(G);
    }
    global.BW = DEFAULT_BW;
    let out = null;
    if (G.over) out = G.over.draw ? 0.5 : (G.over.win === 0 ? 1 : 0);
    const res = { out, first: G.fp, rounds: G.turn, hp: [G.p[0].hp, G.p[1].hp] };
    if (idOf) res.seen = G.p.map((p, i) => { const left = new Set(p.deck.map(c => c.uid)), s = []; idOf[i].forEach((id, uid) => { if (!left.has(uid)) s.push(id); }); return s.sort((a, b) => a - b); }); // card ids drawn at least once, one entry per copy
    return res;
  }
  return { playGame, BUILD, CD, CARDS, DEFAULT_BW, mulberry32 };
};
