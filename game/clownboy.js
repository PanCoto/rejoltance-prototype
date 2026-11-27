/* Clownboy - the wild card (a nod to TMTRAINER from The Binding of Isaac: a card that is never quite what it was a moment ago).
   When it enters a hand (rollHand() in engine.js) and again at the start of every Round while it stays there (rerollHand() in startRound),
   it rolls a random MANA COST, random stats and a random ability made of
   ANY trigger the engine knows and a wide pool of actions. The result lives on the hand card as c.d (a full copy of the card data), so the engine,
   the UI, replays and the online snapshot read it like any other card. Nothing about it is balanced by hand: it can buff an enemy, hurt you,
   gift your opponent a card... the generator only pays it back (stronger ability = smaller stats, a drawback = bigger stats).

   NOT ROLLED (need specific cards / only make sense on spells): Merge (needs its piece cards), GiveToOpponent (a spell goes to the enemy's hand after it
   resolves - Clownboy gives away a random HAND card instead: GiveHandCard), SummonUnit (a no-op in act(): MakeAUnit does the summoning).

   CONDITIONS: about a third of the non-passive effects get an "If ..., <effect>" prefix (see COND). The engine evaluates it with cond() on the effect (e.Condition);
   the generator only discounts the value of the effect by how often the condition is true (p).

   TARGETING: the engine can ask the player for ONE target per card, and only for "When Played" (before the card is played) or "When Destroyed"
   (when it dies). So a rolled card has at most one chosen target; every other trigger uses a fixed, well-defined target (this unit, the opposite
   enemy unit, all enemies, a hero, the unit that triggered the effect...). Text and engine target are always built from the same entry, so they agree.

   EXTEND: add an entry to ACT (an action + its text + value) or TRIG (a trigger + what it may target / must not combine with). */
const CLOWN_ID = 131;
const CLOWN_SPELL_ID = 132;   // the wild ACTION ("Party Trick"): same idea as Clownboy, but a Spell. It is defined in cards.js.
const clownRnd = (n) => (typeof R == "function" ? R(n) : Math.floor(Math.random() * n));
const cr = (a, b) => a + clownRnd(b - a + 1);                     // whole number a..b
const pick1 = (a) => a[clownRnd(a.length)];
const plural = (n, w) => n + " " + w + (n == 1 ? "" : "s");
const sg = (n) => (n >= 0 ? "+" : "") + n;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* The base card of the Party Trick lives in cards.js (Id 132). This is only a fallback for when it is missing: it is built from Clownboy's own card data. */
if (typeof CD != "undefined" && CD[CLOWN_ID] && !CD[CLOWN_SPELL_ID]) {
  CD[CLOWN_SPELL_ID] = Object.assign({}, CD[CLOWN_ID], { Id: CLOWN_SPELL_ID, Name: "Party Trick", Type: "Spell", Cost: 2, Subtypes: [], Keywords: [], Effects: [], Description: "A wild Action: its cost and effect change all the time." });
  delete CD[CLOWN_SPELL_ID].Attack; delete CD[CLOWN_SPELL_ID].Health; delete CD[CLOWN_SPELL_ID].KeywordParams;
}

/* =========================================================================================
   RANDOM NAME & IMAGE GENERATION (TMTRAINER style)
   ========================================================================================= */
/* =========================================================================================
   PROCEDURAL ART (TMTRAINER style)
   A rolled card does NOT get a ready-made picture. It gets a small RECIPE as its Sprite:  "tmt|<seed>|<id>|<id>|<id>"
     - Clownboy   -> the ids are real UNITS (a mixed pool of all unit art)
     - Party Trick -> the ids are real ACTIONS (a mixed pool of all action art)
   clownSrc(recipe) paints the picture on a <canvas> from the art of those cards (the first one is the base, the others are cut, shifted, blended,
   swapped in colour and corrupted into it) and hands back a blob URL. The seed drives a tiny PRNG, so every client / replay paints the SAME picture
   from the same recipe; only the short recipe string travels in snapshots and replays, never the pixels.
   Until the picture is ready (a few ms) the base art is shown; ui.js marks the <img> with data-tmt and clownPaint() swaps it in.
   Tweak the look in tmtPaint() below.
   ========================================================================================= */
const CLOWN_ART_TOKENS = true;                 // false = only deck cards in the pools, no tokens (Royal Soldier, Goblet...)
const CLOWN_ART_SELF = true;                   // true = Clownboy / Party Trick's own art may be one of the ingredients
const CLOWN_IMAGES = Array.from({length: 10}, (_, i) => `img/clownboy/clown${i + 1}.webp`); // plain-file fallback, only used when there is no art index at all
const CLOWN_SPELL_IMAGES = CLOWN_IMAGES;
let _clownPool = null;
function clownArtPools() {
  if (_clownPool) return _clownPool;
  const idx = (typeof window != "undefined" && window.RJ_IMG) || {};
  const u = [], sp = [];
  Object.keys(CD).map(Number).sort((a, b) => a - b).forEach((id) => {
    const d = CD[id];
    if (!d || !idx[id] || id >= 9000) return;                                // no art in the index / tutorial cards
    if (!CLOWN_ART_SELF && (id == CLOWN_ID || id == CLOWN_SPELL_ID)) return;
    if (!CLOWN_ART_TOKENS && ((d.Subtypes || []).includes("Token") || id >= 900)) return;
    (d.Type == "Unit" ? u : d.Type == "Spell" ? sp : []).push(id);
  });
  if (u.length >= 3 && sp.length >= 3) _clownPool = { unit: u, spell: sp };  // only cache a complete pool (index loaded)
  return _clownPool || { unit: u, spell: sp };
}
// the recipe: 2-3 DIFFERENT cards of the right kind + a seed
function clownArt(spell) {
  const pool = clownArtPools()[spell ? "spell" : "unit"];
  if (pool.length < 2) return pick1(CLOWN_IMAGES);
  const ids = [], n = Math.min(pool.length, cr(2, 3));
  while (ids.length < n) { const id = pick1(pool); if (!ids.includes(id)) ids.push(id); }
  return "tmt|" + cr(1, 2000000000) + "|" + ids.join("|");
}
const _tmtOut = {}, _tmtBusy = {}, _tmtImgs = {};
if (typeof document != "undefined" && document.head) { const st = document.createElement("style"); st.textContent = "img[data-tmt]{filter:grayscale(1)}"; document.head.appendChild(st); }   // the base art shown while painting / as fallback is grey too
const tmtFile = (id) => (window.RJ_ART && window.RJ_ART[id]) || "img/" + ((window.RJ_IMG || {})[id] || id + ".webp");   // data URI first: a canvas fed from file:// would be "tainted"
const tmtBase = (rec) => tmtFile(rec.split("|")[2]);
function tmtLoad(id) {
  return _tmtImgs[id] || (_tmtImgs[id] = new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("art " + id)); i.src = tmtFile(id); }));
}
// what an <img> should show for a Sprite: a recipe -> the finished picture (or the base art until it is painted), anything else -> as it is
function clownSrc(s) {
  if (typeof s != "string" || s.indexOf("tmt|") != 0) return s;
  if (_tmtOut[s]) return _tmtOut[s];
  clownPaint(s);
  return tmtBase(s);
}
function clownPaint(rec) {
  if (_tmtOut[rec] || _tmtBusy[rec] || typeof document == "undefined") return;
  _tmtBusy[rec] = 1;
  tmtPaint(rec).then((url) => {
    _tmtOut[rec] = url;
    document.querySelectorAll("img[data-tmt]").forEach((el) => { if (el.getAttribute("data-tmt") == rec) el.src = url; });
  }).catch((e) => { _tmtOut[rec] = tmtBase(rec); if (typeof console != "undefined") console.warn("Clownboy art:", e && e.message); });
}
function tmtRng(a) {                                          // mulberry32
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
async function tmtPaint(rec) {
  const p = rec.split("|"), rnd = tmtRng(+p[1]), ids = p.slice(2);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), rp = (a) => a[Math.floor(rnd() * a.length)], chance = (x) => rnd() < x;
  // a source that cannot be loaded (missing file; from file:// an art without a data URI would "taint" the canvas) is simply left out
  const fileMode = typeof location != "undefined" && location.protocol == "file:";
  const got = await Promise.allSettled(ids.filter((id) => !fileMode || (window.RJ_ART && window.RJ_ART[id])).map(tmtLoad));
  const imgs = got.filter((r) => r.status == "fulfilled").map((r) => r.value);
  if (!imgs.length) throw new Error("no art to paint " + rec);
  const W = Math.min(imgs[0].naturalWidth || 260, 520), H = Math.round(W * (imgs[0].naturalHeight || 368) / (imgs[0].naturalWidth || 260));
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingEnabled = false; return [c, x]; };
  const [cv, g] = mk();
  g.drawImage(imgs[0], 0, 0, W, H);
  // 1) layers: every other card is cut into the base in a few different ways
  const MODES = ["source-over", "difference", "multiply", "screen", "overlay", "hard-light", "exclusion", "lighten", "darken", "color-dodge"];
  imgs.slice(1).forEach((B) => {
    const [t, tg] = mk(); tg.drawImage(B, 0, 0, W, H);          // B scaled to the canvas = a source to cut from
    const layers = ri(2, 4);
    for (let k = 0; k < layers; k++) {
      const m = rp(["blend", "strips", "strips", "blocks", "blocks", "blocks", "cols", "tiles"]);
      if (m == "blend") {
        g.globalAlpha = 0.25 + rnd() * 0.45; g.globalCompositeOperation = rp(MODES);
        g.drawImage(t, ri(-W >> 3, W >> 3), ri(-H >> 3, H >> 3), W, H);
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      } else if (m == "strips") {
        for (let i = ri(4, 14); i > 0; i--) { const y = ri(0, H - 2), h = ri(2, Math.max(3, H >> 3)); g.drawImage(t, 0, y, W, h, ri(-W / 3, W / 3), y + (chance(0.3) ? ri(-12, 12) : 0), W, h); }
      } else if (m == "blocks") {
        for (let i = ri(5, 16); i > 0; i--) { const w = ri(W / 12, W / 3), h = ri(H / 12, H / 3), z = rp([1, 1, 1, 2, 0.5]); g.drawImage(t, ri(0, W - w), ri(0, H - h), w, h, ri(-w / 2, W - w / 2), ri(-h / 2, H - h / 2), w * z, h * z); }
      } else if (m == "cols") {
        for (let i = ri(2, 6); i > 0; i--) { const x = ri(0, W - 4), w = ri(3, W / 6); g.drawImage(t, x, 0, w, H, x + ri(-8, 8), ri(-H / 4, H / 4), w, H); }
      } else {                                                   // tiles: a mosaic of squares taken from other places of B
        const s = rp([16, 24, 32, 48]);
        for (let i = ri(6, 20); i > 0; i--) g.drawImage(t, ri(0, W - s), ri(0, H - s), s, s, Math.floor(ri(0, W - s) / s) * s, Math.floor(ri(0, H - s) / s) * s, s, s);
      }
    }
    if (chance(0.5)) {                                            // a mirrored or upside-down copy of B in one corner
      g.save(); g.globalAlpha = 0.8; const w = ri(W / 4, W / 2), h = ri(H / 4, H / 2), x = ri(0, W - w), y = ri(0, H - h);
      g.translate(x + w / 2, y + h / 2); g.scale(chance(0.5) ? -1 : 1, chance(0.3) ? -1 : 1); g.drawImage(t, 0, 0, W, H, -w / 2, -h / 2, w, h); g.restore();
    }
  });
  // 2) pixels: wrong colour channels, inverted patches, shifted rows, dead pixels, bad palette
  const im = g.getImageData(0, 0, W, H), d = im.data, src = new Uint8ClampedArray(d);
  const rect = () => { const w = ri(W / 8, W / 2), h = ri(H / 8, H / 2); return [ri(0, W - w), ri(0, H - h), w, h]; };
  for (let i = 0; i < d.length; i += 4) { const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); d[i] = d[i + 1] = d[i + 2] = y; }   // GREYSCALE ONLY: everything below works on brightness
  src.set(d);
  for (let r = ri(0, 2); r > 0; r--) {                           // inverted patch
    const [x0, y0, w, h] = rect();
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * 4; d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
  }
  if (chance(0.7)) {                                             // ghost: a shifted copy of the picture mixed in
    const sh = ri(2, 9), cp = new Uint8ClampedArray(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, v = Math.max(cp[i], cp[(y * W + Math.min(W - 1, x + sh)) * 4] * 0.85); d[i] = d[i + 1] = d[i + 2] = v; }
  }
  for (let y = 0; y < H; y++) if (chance(0.05)) {                // rows torn sideways (wrapped)
    const sh = ri(-24, 24), row = new Uint8ClampedArray(d.subarray(y * W * 4, (y + 1) * W * 4));
    for (let x = 0; x < W; x++) { const s = (((x + sh) % W) + W) % W; for (let c = 0; c < 4; c++) d[(y * W + x) * 4 + c] = row[s * 4 + c]; }
  }
  for (let n = Math.floor(W * H * 0.004); n > 0; n--) { const i = ri(0, W * H - 1) * 4, j = ri(0, W * H - 1) * 4; d[i] = src[j]; d[i + 1] = src[j + 1]; d[i + 2] = src[j + 2]; }
  if (chance(0.2)) { const lv = rp([3, 4, 6]), st = 255 / (lv - 1); for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.round(Math.round(d[i + c] / st) * st); }
  if (chance(0.4)) { const k = 0.8 + rnd() * 1.0; for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, (d[i] - 128) * k + 128)); d[i] = d[i + 1] = d[i + 2] = v; } }   // contrast
  if (chance(0.5)) for (let y = 0; y < H; y += 2) for (let x = 0; x < W * 4; x++) if (x % 4 < 3) d[y * W * 4 + x] *= 0.82;   // scanlines
  g.putImageData(im, 0, 0);
  return await new Promise((ok, no) => cv.toBlob((b) => (b ? ok(URL.createObjectURL(b)) : no(new Error("toBlob"))), "image/webp", 0.9));
}
/* ========================================================================================= */

const CLOWN_PRE = ["Clown", "Jester", "Fool", "Trick", "Chaos", "Buffoon", "Harlequin", "Mad", "Hollow", "Bloody", "Gag", "Phantom", "Mind", "Spawn", "King", "Wild", "Card", "Laughing"];
const CLOWN_MID = ["", "", "", "-", "_", " the ", " of ", " O'"];
const CLOWN_SUF = ["boy", "man", "face", "head", "card", "jester", "fool", "king", "toy", "goblin", "ling", "ster", "ness", "nik", "er"];
const GLITCH_CHARS = ["▓", "▒", "░", "█", "?", "!", "@", "#", "$", "%", "&", "*", "0", "1", "3", "X", "Z"];

function genClownName() {
    // 15% chance for pure gibberish
    if (clownRnd(100) < 15) {
        let gibberish = "";
        const len = cr(5, 12);
        for (let i = 0; i < len; i++) gibberish += pick1(GLITCH_CHARS);
        return gibberish;
    }

    // Otherwise, build a normal name and glitch it
    let name = pick1(CLOWN_PRE) + pick1(CLOWN_MID) + pick1(CLOWN_SUF);
    let chars = name.split("");
    for (let i = 0; i < chars.length; i++) {
        let roll = clownRnd(100);
        if (roll < 15) {
            chars[i] = pick1(GLITCH_CHARS); // Glitch character
        } else if (roll < 35) {
            chars[i] = chars[i] === chars[i].toUpperCase() ? chars[i].toLowerCase() : chars[i].toUpperCase(); // Random case
        }
    }
    return chars.join("");
}
/* ========================================================================================= */

/* Targets. side: f = friendly, e = enemy, m = both. grp = plural. obj/subj = how the text names it.
   only = triggers' feature flags it needs (self: "this unit" exists, lane: it stands in a lane, it: the unit the trigger hit, ev: the event's unit). */
const TG = {
  Self:     { Target: "Self", side: "f", obj: "itself", subj: "This", need: "self" },
  Others:   { Target: "OtherFriendlyUnits", side: "f", grp: 1, obj: "all other Friendly Units", subj: "All other Friendly Units" },
  Allies:   { Target: "AllFriendlyUnits", side: "f", grp: 1, obj: "all Friendly Units", subj: "All Friendly Units" },
  Adjacent: { Target: "AdjacentFriendlyUnits", side: "f", grp: 1, obj: "Adjacent Friendly Units", subj: "Adjacent Friendly Units", need: "lane" },
  Enemies:  { Target: "AllEnemyUnits", side: "e", grp: 1, obj: "all Enemy Units", subj: "All Enemy Units" },
  Opposite: { Target: "OppositeEnemyUnit", side: "e", obj: "the opposite Enemy Unit", subj: "The opposite Enemy Unit", need: "lane" },
  Board:    { Target: "AllUnitsOnBoard", side: "m", grp: 1, obj: "all Units", subj: "All Units" },
  OtherBoard:{ Target: "AllOtherUnitsOnBoard", side: "m", grp: 1, obj: "all other Units", subj: "All other Units", need: "self" },
  RandEn:   { Target: "RandomEnemyUnit", side: "e", obj: "a random Enemy Unit", subj: "A random Enemy Unit" },
  RandFr:   { Target: "RandomFriendlyUnit", side: "f", obj: "a random other Friendly Unit", subj: "A random other Friendly Unit" },
  AdjEn:    { Target: "AdjacentEnemyUnits", side: "e", grp: 1, obj: "Enemy Units in adjacent lanes", subj: "Enemy Units in adjacent lanes", need: "lane" },
  LaneEn:   { Target: "EnemyUnitsInSelfLaneAndAdjacent", side: "e", grp: 1, obj: "Enemy Units in this and adjacent lanes", subj: "Enemy Units in this and adjacent lanes", need: "lane" },
  Cross:    { Target: "SelfLaneEnemyAndAdjacentAny", side: "m", grp: 1, obj: "the opposite Enemy Unit and all Adjacent Units", subj: "The opposite Enemy Unit and all Adjacent Units", need: "lane" },
  It:       { Target: "SelectedTarget", side: "e", obj: "it", subj: "It", need: "it" },
  Event:    { Target: "EventUnit", side: "m", obj: "that Unit", subj: "That Unit", need: "ev" },
  MyHero:   { Target: "FriendlyHero", side: "f", hero: 1, obj: "Your Hero", subj: "Your Hero" },
  EnHero:   { Target: "EnemyHero", side: "e", hero: 1, obj: "the Enemy Hero", subj: "The Enemy Hero" },
  // --- lanes are shown as I-IV, so "even" = II and IV, "odd" = I and III
  EvenF:    { Target: "FriendlyUnitsEvenLanes", side: "f", grp: 1, obj: "Friendly Units in even Lanes (II, IV)", subj: "Friendly Units in even Lanes (II, IV)" },
  OddF:     { Target: "FriendlyUnitsOddLanes", side: "f", grp: 1, obj: "Friendly Units in odd Lanes (I, III)", subj: "Friendly Units in odd Lanes (I, III)" },
  EvenE:    { Target: "EnemyUnitsEvenLanes", side: "e", grp: 1, obj: "Enemy Units in even Lanes (II, IV)", subj: "Enemy Units in even Lanes (II, IV)" },
  OddE:     { Target: "EnemyUnitsOddLanes", side: "e", grp: 1, obj: "Enemy Units in odd Lanes (I, III)", subj: "Enemy Units in odd Lanes (I, III)" },
  Strongest:{ Target: "StrongestEnemyUnit", side: "e", obj: "the strongest Enemy Unit", subj: "The strongest Enemy Unit" },
  Weakest:  { Target: "WeakestEnemyUnit", side: "e", obj: "the weakest Enemy Unit", subj: "The weakest Enemy Unit" },
  HighHp:   { Target: "HighestHpUnit", side: "m", obj: "the Unit with the highest HP", subj: "The Unit with the highest HP" },
  LeftF:    { Target: "FriendlyUnitLeft", side: "f", obj: "the Friendly Unit to the left", subj: "The Friendly Unit to the left", need: "lane" },
  RightF:   { Target: "FriendlyUnitRight", side: "f", obj: "the Friendly Unit to the right", subj: "The Friendly Unit to the right", need: "lane" },
  LeftE:    { Target: "EnemyUnitLeft", side: "e", obj: "the Enemy Unit in the lane to the left", subj: "The Enemy Unit in the lane to the left", need: "lane" },
  RightE:   { Target: "EnemyUnitRight", side: "e", obj: "the Enemy Unit in the lane to the right", subj: "The Enemy Unit in the lane to the right", need: "lane" },
  Both:     { Target: "BothHeroes", side: "m", hero: 1, grp: 1, obj: "both Heroes", subj: "Both Heroes" },
  Near:     { Target: "EnemyUnitsNearLane", side: "e", grp: 1, obj: "Enemy Units around the Enemy's most dangerous Lane", subj: "Enemy Units around the Enemy's most dangerous Lane" },
  EvAdj:    { Target: "EventUnitAndAdjacent", side: "m", grp: 1, obj: "that Unit and the Units next to it", subj: "That Unit and the Units next to it", need: "tt" },
  Sacr:     { Target: "Sacrificer", side: "f", obj: "the Unit that Sacrificed it", subj: "The Unit that Sacrificed it", need: "sacr" },
};
// Chosen targets (the player picks them): kind of pick, engine Target, side, text for the first mention. 'it' afterwards.
const CHOICE = {
  e:  { Target: "TargetEnemyUnit", side: "e", first: "an Enemy Unit", unit: 1 },
  f:  { Target: "TargetFriendlyUnit", side: "f", first: "a Friendly Unit", unit: 1 },
  a:  { Target: "TargetAnyUnit", side: "m", first: "a Unit", unit: 1 },
  eh: { Target: "TargetEnemyUnitOrHero", side: "e", first: "an Enemy Unit or the Enemy Hero", hero: 1 },
  fh: { Target: "TargetFriendlyUnitOrHero", side: "f", first: "a Friendly Unit or Your Hero", hero: 1 },
};

/* Triggers. flags: self (this unit is on the board), lane (it has a lane), it (the unit this hit), ev (an event unit exists),
   tt (c.t is a unit on the board), sacr (the unit that sacrificed this one), pick (can ask the player: "p" before playing, "d" when destroyed), noHeroDmg (heroes are not valid targets for damage), ban = action tags that would loop or make no sense. m = value multiplier. */
const TRIG = {
  OnPlayed:               { txt: "When Played", w: 5, m: 1.08, f: ["self", "lane"], pick: "p" },
  OnDeath:                { txt: "When Destroyed", w: 3, m: 0.9, f: [], pick: "d", ban: ["sac"] },
  OnStartOfRound:         { txt: "Start of Round", w: 2, m: 1.4, f: ["self", "lane"] },
  OnEndOfRound:           { txt: "End of Round", w: 2, m: 1.4, f: ["self", "lane"] },
  OnPreCombatLine:        { txt: "Before Combat Here", w: 2, m: 1.3, f: ["self", "lane"] },
  OnPostCombatLine:       { txt: "After Combat Here", w: 1, m: 1.0, f: ["self", "lane"] },
  OnAttackDone:           { txt: "After this Attacks", w: 1, m: 1.0, f: ["self", "lane"], ban: ["bonus"] },
  OnDamagedEnemyUnit:     { txt: "When this deals Damage to an Enemy Unit", w: 2, m: 0.8, f: ["self", "lane", "it", "tt"], ban: ["bonus"] },
  OnDamagedEnemyHero:     { txt: "When this deals Damage to the Enemy Hero", w: 1, m: 0.8, f: ["self", "lane"], ban: ["bonus"] },
  OnKill:                 { txt: "When this Destroys a Unit", w: 1, m: 0.8, f: ["self", "lane"], ban: ["bonus"] },
  OnFriendlyUnitDied:     { txt: "Whenever a Friendly Unit is Destroyed", w: 1, m: 1.0, f: ["self", "lane"], ban: ["sac"] },
  OnFriendlyUnitDamaged:  { txt: "Whenever a Friendly Unit is Damaged", w: 1, m: 1.0, f: ["self", "lane"], ban: ["dmgF"] },
  OnFriendlyUnitHpOne:    { txt: "Whenever a Friendly Unit drops to 1 HP", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["dmgF"] },
  OnFriendlyCardDrawn:    { txt: "Whenever You Draw a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnFriendlyActionPlayed: { txt: "Whenever You play an Action", w: 1, m: 1.0, f: ["self", "lane"] },
  OnEnemyUnitPlayed:      { txt: "Whenever the Enemy plays a Unit", w: 1, m: 1.0, f: ["self", "lane", "ev"] },
  OnFriendlyUnitSummoned: { txt: "Whenever another Friendly Unit is Summoned", w: 1, m: 1.0, f: ["self", "lane", "ev", "tt"], ban: ["summon"] },
  OnOtherUnitSacrificed:  { txt: "Whenever another Unit is Sacrificed", w: 1, m: 1.0, f: ["self", "lane"], ban: ["sac"] },
  OnStatusApplied:        { txt: "Whenever another Unit gains a Status", w: 1, m: 1.0, f: ["self", "lane", "ev", "tt"], ban: ["status"] },
  OnEnemyUnitGainedStats: { txt: "Whenever an Enemy Unit gains Stats", w: 1, m: 1.0, f: ["self", "lane", "tt"], ban: ["buff"] },
  OnOpponentCardGained:   { txt: "Whenever the Enemy gains a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnEnemyUnitDied:        { txt: "Whenever an Enemy Unit is Destroyed", w: 1, m: 1.0, f: ["self", "lane"] },
  OnFriendlyUnitPlayed:   { txt: "Whenever another Friendly Unit is Played", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["summon"] },
  OnSacrificed:           { txt: "When this is Sacrificed", w: 1, m: 0.9, f: ["self", "lane", "sacr"], ban: ["summon", "sac"] },
  OnFriendlyCardGained:   { txt: "Whenever You gain a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnOpponentCardDrawn:    { txt: "Whenever the Enemy Draws a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnEnemyUnitSacrificed:  { txt: "Whenever an Enemy Unit is Sacrificed", w: 1, m: 1.3, f: ["self", "lane"] },
  OnFriendlyCardPlayed:   { txt: "Whenever You play another Card", w: 1, m: 0.85, f: ["self", "lane"] },
  OnFriendlyHeroDamaged:  { txt: "Whenever Your Hero takes Damage", w: 1, m: 0.9, f: ["self", "lane"], noHeroDmg: 1 },
  OnEnemyHeroDamaged:     { txt: "Whenever the Enemy Hero takes Damage", w: 1, m: 0.9, f: ["self", "lane"], noHeroDmg: 1 },
  OnMoved:                { txt: "After this Moves", w: 1, m: 1.4, f: ["self", "lane"], ban: ["move"] },
  OnFriendlyUnitHealed:   { txt: "Whenever another Friendly Unit is Healed", w: 1, m: 1.1, f: ["self", "lane", "ev"], ban: ["heal"] },
  OnFriendlyUnitReturned: { txt: "Whenever a Friendly Unit returns to Hand", w: 1, m: 1.2, f: ["self", "lane"], ban: ["ret"] },
  Passive:                { txt: "While in Play", w: 2, m: 2.0, f: ["self", "lane"], passive: 1 },
};

const STATUS = {   // keyword -> [verb text, value when it helps the target]
  Burning:   ["Apply Burning to", -2], Stunned: ["Stun", -2.5], Marked: ["Mark", -1.5],
  Dodge:     ["Apply Dodge to", 1.5], SoulGuard: ["Apply Soul Guard to", 1.5], Protected: ["Apply Protected to", 1.5],
  Flying:    ["Apply Flying to", 1], Unkillable: ["Apply Unkillable to", 2.5],
};
const PASSIVE_KW = { Deadly: 2, Flying: 1.5, Protected: 2, Unactionable: -1, Burning: -3, Dodge: 2 };   // value when it helps the target

/* Actions. kind: unit = needs a unit, hero = hero only, any = unit or hero. onlyF = only ever for you (summon, gaining Blood...).
   tag = loop-guard tag (see TRIG.ban). v = what it is worth TO ITS TARGET (negative = bad for the target); the generator flips the sign for enemy targets.
   mk() -> { a: action fields, t: (obj, subj, plural, enemyHero) => text, v }. */
// Lists of triggers where moving units around is safe (not in the middle of combat) - the same list the old MoveRight used, plus "another card played".
const MOVE_OK = ["OnPlayed", "OnStartOfRound", "OnEndOfRound", "OnFriendlyActionPlayed", "OnEnemyUnitPlayed", "OnFriendlyCardDrawn", "OnFriendlyCardGained", "OnOpponentCardGained", "OnOpponentCardDrawn", "OnFriendlyCardPlayed"];
// SwapWithOpposite changes the OWNER of this unit; start / end of round walk both players' boards one after another and would fire it twice, so only single-board events.
const SWAP_OK = ["OnFriendlyActionPlayed", "OnFriendlyCardPlayed", "OnEnemyUnitPlayed"];
// Random card picks for the decks never hand out tokens, Bosses or Clownboy itself (extra filter keys: Types / NotIds / NotSubtype in cardOK()).
const DECKF = (f) => Object.assign({ Token: 0, Types: ["Unit", "Spell"], NotIds: [CLOWN_ID, CLOWN_SPELL_ID], NotSubtype: "Boss" }, f);
const cards = (f) => (typeof poolOf == "function" ? poolOf(f).filter((d) => d.Id != CLOWN_ID && d.Id != CLOWN_SPELL_ID) : []);
const ACT = {
  dmg:       { kind: "any", tag: "dmg", hd: 1, mk: () => { const n = cr(1, 5); return { a: { Type: "DealDamage", Amount: n }, t: (o) => "Deal " + n + " Damage to " + o, v: -1.3 * n }; } },
  heal:      { kind: "any", tag: "heal", mk: () => { const n = cr(2, 6); return { a: { Type: "Heal", Amount: n }, t: (o) => "Heal " + o + " for " + n, v: 0.45 * n }; } },
  healFull:  { kind: "unit", tag: "heal", mk: () => ({ a: { Type: "HealToFull" }, t: (o) => "Fully heal " + o, v: 2 }) },
  buff:      { kind: "unit", tag: "buff", mk: () => { const x = cr(0, 3), y = cr(x ? 0 : 1, 4); return { a: { Type: "BuffStats", BuffAtk: x, BuffHp: y }, t: (o, s, pl) => s + (pl ? " get " : " gets ") + sg(x) + "/" + sg(y), v: 0.9 * (x + y) }; } },
  debuff:    { kind: "unit", tag: "buff", mk: () => { const x = cr(0, 3), y = cr(x ? 0 : 1, 3); return { a: { Type: "BuffStats", BuffAtk: -x, BuffHp: -y }, t: (o, s, pl) => s + (pl ? " get " : " gets ") + "-" + x + "/-" + y, v: -0.9 * (x + y) }; } },
  dbl:       { kind: "unit", tag: "buff", mk: () => ({ a: { Type: "DoubleStats" }, t: (o) => "Double the Stats of " + o, v: 3 }) },
  status:    { kind: "unit", tag: "status", mk: () => { const k = pick1(Object.keys(STATUS)); return { a: { Type: "ApplyStatus", StatusKeyword: k }, t: (o) => STATUS[k][0] + " " + o, v: STATUS[k][1] }; } },
  silence:   { kind: "unit", mk: () => ({ a: { Type: "Silence" }, t: (o) => "Silence " + o, v: -2 }) },
  destroy:   { kind: "unit", mk: () => ({ a: { Type: "DestroyUnit" }, t: (o) => "Destroy " + o, v: -5.5 }) },
  bounce:    { kind: "unit", tag: "ret", mk: () => ({ a: { Type: "ReturnToHand" }, t: (o, s, pl) => "Return " + o + (pl ? " to their owners' Hands" : " to its owner's Hand"), v: -1 }) },
  bonus:     { kind: "unit", tag: "bonus", mk: () => ({ a: { Type: "BonusAttack" }, t: (o, s, pl) => s + (pl ? " do" : " does") + " a Bonus Attack", v: 2 }) },
  loseHp:    { kind: "any", hd: 1, mk: () => { const n = cr(1, 4); return { a: { Type: "LoseHealth", Amount: n }, t: (o, s, pl) => s + (pl ? " lose " : " loses ") + n + " HP", v: -1.1 * n }; } },
  atkDown:   { kind: "unit", mk: () => { const n = cr(1, 3); return { a: { Type: "LaneDebuff", Amount: n }, t: (o) => "Reduce the Attack of " + o + " by " + n, v: -0.8 * n }; } },
  // "free" actions take no target: they act on this unit / the players' decks. need = trigger flag required, only = the only triggers they make sense on
  copySelf:  { kind: "free", tag: "summon", need: "self", mk: () => ({ a: { Type: "CopySelf" }, t: () => "Copy itself into a random empty lane", v: 5 }) },
  respawn:   { kind: "free", tag: "summon", only: ["OnDeath"], mk: () => ({ a: { Type: "RespawnSelf", BuffHp: -1 }, t: () => "Return to play in its lane with -1 HP", v: 3 }) },
  moveRight: { kind: "free", tag: "move", need: "self", only: MOVE_OK,
             mk: () => { const th = clownRnd(2); return { a: th ? { Type: "MoveRight", AlwaysAttack: true } : { Type: "MoveRight" }, t: () => th ? "Move one lane to the right (if it can), then do a Bonus Attack" : "Move one lane to the right", v: th ? 1.5 : 0.3 }; } },
  // --- decks. DECKF() keeps tokens, Bosses and Clownboy itself out of every random pick. Giving the enemy a card is a drawback (negative v), a Curse is a gift to you.
  curseEnemy:{ kind: "free", mk: () => {
               const r = clownRnd(5), ash = typeof CD != "undefined" && CD[914];
               if (r == 0 && ash) return { a: { Type: "AddCardToEnemyDeck", ValueParam: 914 }, t: () => "Shuffle a " + ash.Name + " into the Enemy's Deck", v: 1.5 };
               if (r == 1) return { a: { Type: "AddCardToEnemyDeck", Filter: DECKF({ Types: ["Unit"] }) }, t: () => "Shuffle a random Unit into the Enemy's Deck", v: -1.2 };
               if (r == 2) return { a: { Type: "AddCardToEnemyDeck", Filter: DECKF({ Types: ["Spell"] }) }, t: () => "Shuffle a random Action into the Enemy's Deck", v: -1.2 };
               if (r == 3) { const n = cr(1, 4); return { a: { Type: "AddCardToEnemyDeck", Filter: DECKF({ MaxCost: n }) }, t: () => "Shuffle a random Card that costs " + n + " or less into the Enemy's Deck", v: -(0.5 + 0.2 * n) }; }
               return { a: { Type: "AddCardToEnemyDeck", ValueParam: CLOWN_ID }, t: () => "Shuffle a Clownboy into the Enemy's Deck", v: -0.3 }; } },
  fillOwn:   { kind: "free", mk: () => {
               const r = clownRnd(4);
               if (r == 0) return { a: { Type: "AddCardToDeck", Filter: DECKF({ Types: ["Unit"] }), Shuffle: true }, t: () => "Shuffle a random Unit into Your Deck", v: 1 };
               if (r == 1) return { a: { Type: "AddCardToDeck", Filter: DECKF({ Types: ["Spell"] }), Shuffle: true }, t: () => "Shuffle a random Action into Your Deck", v: 1 };
               if (r == 2) { const n = cr(1, 4); return { a: { Type: "AddCardToDeck", Filter: DECKF({ MaxCost: n }), Shuffle: true }, t: () => "Shuffle a random Card that costs " + n + " or less into Your Deck", v: 0.6 + 0.2 * n }; }
               return { a: { Type: "AddCardToDeck", ValueParam: CLOWN_ID, Shuffle: true }, t: () => "Shuffle a Clownboy into Your Deck", v: 1 }; } },
  copyDeck:  { kind: "free", mk: () => {
               const SRC = [["Self", "a copy of this Card", 1.2], ["LastPlayedFriendly", "a copy of the last Card You played", 1.4], ["LastPlayedEnemy", "a copy of the last Card the Enemy played", 1.4],
                            ["DestroyedFriendly", "a copy of the last Friendly Unit that was Destroyed", 1.1], ["DestroyedEnemy", "a copy of the last Enemy Unit that was Destroyed", 1.4]];
               const x = pick1(SRC), en = clownRnd(4) == 0;
               return { a: { Type: "CopyToDeck", Source: x[0], To: en ? "Enemy" : "Own" }, t: () => "Shuffle " + x[1] + " into " + (en ? "the Enemy's" : "Your") + " Deck", v: en ? -0.8 * x[2] : x[2] }; } },
  // putting a card from your hand under your deck: a plain drawback, or the COST of a reward (botReward, built in clownRoll() like sacReward). On "When Played" the player chooses the card, elsewhere it is the most expensive one.
  bottom:    { kind: "free", tag: "bot", mk: (tk) => ({ a: tk == "OnPlayed" ? { Type: "BottomFromHand", Amount: 1 } : { Type: "BottomFromHand", Amount: 1, Auto: true },
               t: () => tk == "OnPlayed" ? "Put a Card from Your Hand on the bottom of Your Deck" : "Put the most expensive Card from Your Hand on the bottom of Your Deck", v: -1 }) },
  botReward: { kind: "free", tag: "bot", mk: () => null },
  recall:    { kind: "free", tag: "draw", mk: () => ({ a: { Type: "DrawFromDiscard", Amount: 1, Random: true }, t: () => "Return a random Card from Your Discard Pile to Your Hand", v: 1.8 }) },
  harvest:   { kind: "free", tag: "draw", mk: () => ({ a: { Type: "DrawKilledLastRound" }, t: () => "Add every Unit that was Destroyed last Round to Your Hand (from both Discard Piles)", v: 2.2 }) },
  giveCard:  { kind: "free", tag: "add", mk: () => ({ a: { Type: "GiveHandCard" }, t: () => "Give a random Card from Your Hand to the Enemy", v: -2.5 }) },
  // --- RGB-style actions
  swapStats: { kind: "unit", mk: () => ({ a: { Type: "SwapStats" }, t: (o) => "Swap the Attack and Health of " + o, v: 0.2 }) },
  hpOne:     { kind: "unit", single: 1, noSelf: 1, mk: () => ({ a: { Type: "SetHpOne" }, t: (o) => "Set the HP of " + o + " to 1", v: -3 }) },
  swapOpp:   { kind: "free", need: "lane", only: SWAP_OK, tag: "move", last: 1, mk: () => ({ a: { Type: "SwapWithOpposite" }, t: () => "Swap places with the opposite Enemy Unit (the two Units trade sides)", v: 0.5 }) },
  shuffleLanes: { kind: "free", only: MOVE_OK, tag: "move", mk: () => ({ a: { Type: "ShuffleLanes" }, t: () => "Randomly shuffle Your Units between Lanes", v: 0.3 }) },
  steal:     { kind: "unit", single: 1, noSelf: 1, sideE: 1, only: MOVE_OK, tag: "move", mk: () => clownRnd(4) ? null : ({ a: { Type: "TakeControl" }, t: (o) => "Take control of " + o + " and move it to an empty Lane on Your side (if there is one)", v: -14 }) },   // = Destroy (-5.5) PLUS a free unit for you (about a whole card): priced above what even a 6-mana Action is worth, so it only rolls together with a real drawback
  pull:      { kind: "unit", single: 1, noSelf: 1, need: "lane", only: MOVE_OK, tag: "move", mk: () => ({ a: { Type: "MoveToSourceLane" }, t: (o) => "Pull " + o + " into this Unit's Lane (if it is empty)", v: -0.4 }) },
  // --- other engine actions Clownboy did not use before
  globalBuff:{ kind: "free", only: ["OnPlayed", "OnDeath", "OnSacrificed"], mk: () => { const x = cr(0, 1), y = cr(x ? 0 : 1, 1); return { a: { Type: "ModifyGlobalBuff", BuffAtk: x, BuffHp: y }, t: () => "All Your Units, including ones played later, get " + sg(x) + "/" + sg(y), v: 4.5 * (x + y) }; } },
  twice:     { kind: "free", mk: () => ({ a: { Type: "PlayNextTwice" }, t: () => "Your next Action is played twice", v: 1.2 }) },
  actionPlay:{ kind: "free", noSpell: 1, mk: () => ({ a: { Type: "GrantActionPlay", Amount: 1 }, t: () => "You may play a Unit during the Action Phase this Round", v: 0.8 }) },
  markRule:  { kind: "free", mk: () => ({ a: { Type: "GrantRule", Rule: "mk" }, t: () => "From now on, Marking an already Marked Unit destroys it", v: 1.4 }) },
  // --- player-prompt actions. On "When Played" the engine asks the player (Sacrifice target, lane, card from the deck...); on every other trigger it decides itself.
  sacrifice: { kind: "free", tag: "sac", need: "self", mk: (tk) => { const ab = clownRnd(2), pl = tk == "OnPlayed";
               return { as: [{ Type: "SacrificeUnit", Target: "TargetFriendlyUnit" }].concat(ab ? [{ Type: "AbsorbStats", Target: "Self" }] : []),
                        t: () => (pl ? "Sacrifice a Friendly Unit" : "Sacrifice the weakest other Friendly Unit") + (ab ? ". This absorbs its Stats" : ""), v: ab ? -0.7 : -4.5 }; } },
  // Sacrifice WITH A REWARD: "(You may) Sacrifice a Friendly Unit. If you do, <1-2 random actions>". The sacrifice itself is built in clownRoll(): the actions rolled after it
  // become its reward (flagged OnlyIfSacrificed - the engine only runs them when a unit really was sacrificed) and are rolled exactly like any other action (any target, chosen targets included).
  sacReward: { kind: "free", tag: "sac", need: ["self", "spell"], mk: () => null },
  sacMany:   { kind: "free", tag: "sac", need: "self", only: ["OnPlayed"], mk: () => ({ a: { Type: "SacrificeUnits", Target: "OtherFriendlyUnits", Absorb: true }, t: () => "Sacrifice any number of other Friendly Units. This absorbs their Stats", v: 1.5 }) },
  reanimate: { kind: "free", tag: "summon", mk: () => { const n = cr(2, 5); return { a: { Type: "Reanimate", Filter: { MaxCost: n } }, t: () => "Summon a random Friendly Unit that costs " + n + " or less from Your Discard Pile", v: 0.6 * n + 1 }; } },
  tutor:     { kind: "free", tag: "draw", mk: (tk) => ({ a: { Type: "TutorCard", Target: "Self" }, t: () => tk == "OnPlayed" ? "Choose a Card from Your Deck and add it to Your Hand" : "Add the most expensive Card from Your Deck to Your Hand", v: 2.5 }) },
  replay:    { kind: "free", tag: "summon", need: "self", only: ["OnPlayed"], mk: () => { const all = clownRnd(2);
               return { a: all ? { Type: "ReplayPlayed", Target: "Self" } : { Type: "ReplayPlayed", Target: "Self", Last: 1 },
                        t: () => all ? "Trigger the \"When Played\" effect of each Unit You played this game" : "Trigger the \"When Played\" effect of the last card You played (if it is a Unit)", v: all ? 3.5 : 1.5 }; } },
  morphSelf: { kind: "free", tag: "summon", need: "self", mk: () => {
               if (clownRnd(3) == 0) return { a: { Type: "Transform", Target: "Self", IntoFrom: "LastPlayed" }, t: () => "Transform into the last Unit You played", v: 1.5 };
               const c = pick1(cards({ Type: "Unit", MaxCost: 5, Token: 0 }));
               return c ? { a: { Type: "Transform", Target: "Self", Into: c.Id }, t: () => "Transform into " + c.Name, v: 0.3 * ((c.Attack || 0) + (c.Health || 0)) + 0.5 } : null; } },
  morph:     { kind: "unit", single: 1, noSelf: 1, tag: "summon", mk: () => {
               const c = pick1(cards({ Type: "Unit", MaxCost: 2, Token: 0 }));
               return c ? { a: { Type: "Transform", Into: c.Id, FirePlayed: false }, t: (o) => "Transform " + o + " into " + c.Name, v: 0.45 * ((c.Attack || 0) + (c.Health || 0)) - 4 } : null; } },
  copyUnit:  { kind: "unit", single: 1, noSelf: 1, abs: 1, tag: "summon", mk: () => ({ a: { Type: "CopyUnit" }, t: (o) => "Summon a copy of " + o + " in an empty lane", v: 3.2 }) },
  // hero / resource actions: the target is Your Hero or the Enemy Hero
  draw:      { kind: "hero", tag: "draw", mk: () => { const n = cr(1, 2); return { a: { Type: "DrawCard", Amount: n }, t: (o, s, pl, en) => (en == 2 ? "Both Heroes Draw " : en ? "The Enemy Hero Draws " : "Draw ") + plural(n, "Card"), v: 2 * n }; } },
  loseBlood: { kind: "hero", mk: () => { const n = cr(1, 3); return { a: { Type: "LoseBlood", Amount: n }, t: (o, s, pl, en) => (en == 2 ? "Both Heroes lose " : en ? "The Enemy Hero loses " : "You lose ") + n + " Blood", v: -1.2 * n }; } },
  maxHp:     { kind: "hero", mk: () => { const n = cr(1, 3); return { a: { Type: "IncreaseMaxHp", Amount: n }, t: (o, s, pl) => cap(o) + (pl ? " get +" : " gets +") + n + " max HP", v: 0.4 * n }; } },
  conjure:   { kind: "hero", tag: "add", mk: () => { const c = pick1(cards({ Token: 0 })); return c ? { a: { Type: "AddCardToHand", ValueParam: c.Id }, t: (o, s, pl, en) => (en == 2 ? "Both Heroes gain " + c.Name : en ? "The Enemy Hero gains " + c.Name : "Conjure " + c.Name + " into Your Hand"), v: 0.4 * (c.Cost || 0) + 1.2 } : null; } },
  conjureAct:{ kind: "hero", tag: "add", mk: () => ({ a: { Type: "AddCardToHand", Filter: { Type: "Spell", Token: 0, NotIds: [CLOWN_SPELL_ID] } }, t: (o, s, pl, en) => (en == 2 ? "Both Heroes gain a random Action" : en ? "The Enemy Hero gains a random Action" : "Conjure a random Action"), v: 2.2 }) },
  blood:     { kind: "hero", onlyF: 1, mk: () => { const n = cr(1, 3); return { a: { Type: "AddResource", Amount: n }, t: () => "Gain " + n + " Blood", v: 0.9 * n }; } },
  spendAll:  { kind: "hero", onlyF: 1, mk: () => ({ a: { Type: "SpendBlood" }, t: () => "Spend all Your Blood", v: -3 }) },
  summon:    { kind: "hero", onlyF: 1, tag: "summon", mk: () => { const c = pick1(cards({ Type: "Unit", MaxCost: 6, Token: 0 })); return c ? { a: { Type: "MakeAUnit", ValueParam: c.Id, Auto: true }, t: () => "Summon " + c.Name, v: 0.7 * ((c.Attack || 0) + (c.Health || 0)) + 1.5 } : null; } },
};
const SIDE = { f: 1, e: -1, m: 0.25 };    // how a target's side turns "worth to the target" into "worth to you"

// Safety net: never hand out a card whose trigger / action / target the engine cannot execute (it would silently do nothing).
const _clownWarned = {};
function clownValid(effs) {
  if (typeof ENGINE_CAPS == "undefined") return true;
  const bad = (kind, name) => { if (!_clownWarned[kind + name]) { _clownWarned[kind + name] = 1; if (typeof console != "undefined") console.warn("Clownboy: engine has no " + kind + " '" + name + "' - rolls using it are skipped"); } return false; };
  return effs.every((e) => {
    if (e.Trigger != "Passive" && !ENGINE_CAPS.triggers.has(e.Trigger)) return bad("trigger", e.Trigger);
    return e.Actions.every((a) => {
      if (e.Trigger == "Passive" ? !ENGINE_CAPS.passiveActions.has(a.Type) : !ENGINE_CAPS.actions.has(a.Type)) return bad("action", a.Type);
      if (a.Target && !ENGINE_CAPS.targets.has(a.Target)) return bad("target", a.Target);
      return true;
    });
  });
}

// Allowed total stats (Attack + Health) by mana cost: [_, 1, 2, 3, 4, 5, 6]
const CLOWN_MIN_STATS = [0, 2, 3, 4, 5, 6, 7];
const CLOWN_MAX_STATS = [0, 5, 7, 9, 10, 11, 12];

/* =========================================================================================
   CONDITIONS ("If ..., <effect>")
   w = weight, need = trigger flag the condition needs (lane / self), only = the only triggers it makes sense on, p = how often it is true (discounts the value of the effect).
   mk() -> { c: the engine condition (cond() in engine.js), t: text, p } or null. */
const CLOWN_SELF_TRIG = ["OnKill", "OnDamagedEnemyUnit", "OnDamagedEnemyHero"];   // engine: without e.Condition these fire only for the unit's OWN hits (SELF in engine.js), so a condition must bring IsSelf along
const cmp = (Count, Op, Value) => ({ Condition: "Compare", Count, Op, Value });
let _clownSubs = null;
const clownSubtypes = () => {
  if (_clownSubs) return _clownSubs;
  const set = {};
  if (typeof CD != "undefined") Object.values(CD).forEach((d) => { if (d.Id < 900 && d.Id != CLOWN_ID && d.Id != CLOWN_SPELL_ID && d.Type == "Unit") (d.Subtypes || []).forEach((x) => { if (x != "Token" && x != "Boss") set[x] = 1; }); });
  return (_clownSubs = Object.keys(set));
};
const COND = [
  { w: 2, need: "lane", mk: () => { const ev = clownRnd(2); return { c: { Condition: "LaneParity", Parity: ev ? "Even" : "Odd" }, t: "this Unit is in an " + (ev ? "even Lane (II or IV)" : "odd Lane (I or III)"), p: 0.5 }; } },
  { w: 1, need: "lane", mk: () => { const e = clownRnd(2); return { c: { Condition: "LaneEdge", Edge: !!e }, t: e ? "this Unit is in an outer Lane (I or IV)" : "this Unit is in a middle Lane (II or III)", p: 0.5 }; } },
  { w: 1, need: "lane", mk: () => { const pr = clownRnd(2); return { c: { Condition: "OppositeEnemy", Present: !!pr }, t: pr ? "there is an Enemy Unit opposite this Unit" : "there is no Enemy Unit opposite this Unit", p: pr ? 0.6 : 0.4 }; } },
  { w: 1, need: "lane", mk: () => ({ c: { Condition: "NoNeighbors" }, t: "this Unit has no Adjacent Friendly Units", p: 0.35 }) },
  { w: 1, need: "lane", only: ["OnEnemyUnitPlayed"], mk: () => ({ c: { Condition: "SameLane" }, t: "that Unit is opposite this Unit", p: 0.25 }) },
  { w: 2, mk: () => { const ev = clownRnd(2); return { c: { Condition: "RoundParity", Parity: ev ? "Even" : "Odd" }, t: "it is an " + (ev ? "even" : "odd") + " Round", p: 0.5 }; } },
  { w: 1, mk: () => { const n = cr(3, 6); return { c: cmp("Round", ">=", n), t: "it is Round " + n + " or later", p: Math.max(0.3, 1 - 0.1 * n) }; } },
  { w: 2, mk: () => { const en = clownRnd(2); return { c: { Condition: "HeroHpHalf", Side: en ? "Enemy" : "Friendly", Below: true }, t: (en ? "the Enemy Hero is" : "Your Hero is") + " below half HP", p: 0.3 }; } },
  { w: 1, need: "self", mk: () => ({ c: { Condition: "SelfDamaged" }, t: "this Unit is damaged", p: 0.35 }) },
  { w: 1, need: "self", mk: () => { const k = pick1(Object.keys(STATUS)), is = ["Burning", "Stunned", "Marked"].includes(k); return { c: { Condition: "SelfHasStatus", TargetParam: k }, t: "this Unit " + (is ? "is " : "has ") + k, p: 0.15 }; } },
  { w: 2, mk: () => { const n = cr(1, 3); return { c: cmp("FriendlyUnits", ">=", n), t: "You control " + n + " or more other Units", p: [0, 0.75, 0.5, 0.35][n] }; } },
  { w: 1, mk: () => ({ c: cmp("FriendlyUnits", "==", 0), t: "You control no other Units", p: 0.3 }) },
  { w: 2, mk: () => { const n = cr(1, 3); return { c: cmp("EnemyUnits", ">=", n), t: "the Enemy controls " + n + " or more Units", p: [0, 0.8, 0.6, 0.4][n] }; } },
  { w: 1, mk: () => ({ c: cmp("EnemyUnits", "==", 0), t: "the Enemy controls no Units", p: 0.2 }) },
  { w: 2, mk: () => { const n = cr(2, 5); return { c: cmp("CardsInHand", ">=", n), t: "You have " + n + " or more Cards in Hand", p: Math.max(0.2, 1.05 - 0.17 * n) }; } },
  { w: 1, mk: () => { const n = cr(0, 2); return { c: cmp("CardsInHand", "<=", n), t: n ? "You have " + n + " or fewer Cards in Hand" : "You have no Cards in Hand", p: 0.2 + 0.15 * n }; } },
  { w: 1, mk: () => { const n = cr(3, 6); return { c: cmp("EnemyCardsInHand", ">=", n), t: "the Enemy has " + n + " or more Cards in Hand", p: Math.max(0.25, 1.1 - 0.15 * n) }; } },
  { w: 1, mk: () => { const n = cr(0, 2); return { c: cmp("EnemyCardsInHand", "<=", n), t: n ? "the Enemy has " + n + " or fewer Cards in Hand" : "the Enemy has no Cards in Hand", p: 0.2 + 0.15 * n }; } },
  { w: 1, mk: () => { const n = cr(6, 12); return { c: cmp("DeckSize", "<=", n), t: "Your Deck has " + n + " or fewer Cards", p: 0.3 }; } },
  { w: 1, mk: () => { const n = cr(3, 8); return { c: cmp("DiscardSize", ">=", n), t: "Your Discard Pile has " + n + " or more Cards", p: 0.5 }; } },
  { w: 1, mk: () => { const n = cr(8, 14); return { c: cmp("FriendlyHeroHp", "<=", n), t: "Your Hero has " + n + " or less HP", p: 0.35 }; } },
  { w: 1, mk: () => { const n = cr(8, 14); return { c: cmp("EnemyHeroHp", "<=", n), t: "the Enemy Hero has " + n + " or less HP", p: 0.35 }; } },
  { w: 1, mk: () => { const n = cr(4, 8); return { c: cmp("MissingHealth", ">=", n), t: "Your Hero is missing " + n + " or more HP", p: 0.35 }; } },
  { w: 1, mk: () => { const n = cr(3, 7); return { c: cmp("Blood", ">=", n), t: "You have " + n + " or more Blood", p: Math.max(0.25, 1 - 0.12 * n) }; } },
  { w: 1, mk: () => { const n = cr(0, 2); return { c: cmp("Blood", "<=", n), t: n ? "You have " + n + " or less Blood" : "You have no Blood", p: 0.25 + 0.1 * n }; } },
  { w: 1, mk: () => ({ c: cmp("BurningUnits", ">=", 1), t: "any other Unit is Burning", p: 0.3 }) },
  { w: 1, mk: () => ({ c: cmp("MarkedUnits", ">=", 1), t: "any other Unit is Marked", p: 0.3 }) },
  { w: 1, mk: () => { const n = cr(1, 3); return { c: cmp("DamagedUnits", ">=", n), t: n + " or more other Units are damaged", p: [0, 0.6, 0.4, 0.3][n] }; } },
  { w: 1, mk: () => { const sub = pick1(clownSubtypes()); return sub ? { c: { Condition: "HasSubtypeOnBoard", TargetParam: sub }, t: "You control another " + sub, p: 0.3 } : null; } },
  { w: 2, only: ["OnPlayed"], mk: () => ({ c: { Condition: "FirstPlayedThisRound", TargetParam: "Any" }, t: "this is the first Card You play this Round", p: 0.4 }) },
  { w: 2, only: ["OnFriendlyActionPlayed"], mk: () => ({ c: { Condition: "FirstPlayedThisRound", TargetParam: "Spell" }, t: "this is the first Action You play this Round", p: 0.45 }) },
];
function rollCond(tk, T) {
  const bag = COND.filter((x) => (!x.need || T.f.includes(x.need)) && (!x.only || x.only.includes(tk))).flatMap((x) => Array(x.w || 1).fill(x));
  for (let i = 0; i < 5 && bag.length; i++) { const r = pick1(bag).mk(); if (r) return r; }
  return null;
}
const lcFirst = (t) => (t.length > 1 && t[0] == t[0].toUpperCase() && t[1] == t[1].toLowerCase() && !/^(Enemy|Friendly|Both|Unit|Units)\b/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

// Passive pool: GrantKeyword / AuraBuff / ScaleAttack
const SCALE_PER = [["FriendlyUnits", "other Friendly Unit", 1.5], ["EnemyUnits", "Enemy Unit", 2], ["AnyUnits", "other Unit on the board", 3.5],
                   ["CardsInHand", "Card in Your Hand", 3], ["DamagedUnits", "damaged Unit", 1.5], ["DiscardSize", "Card in Your Discard Pile", 3]];

// the old bread-and-butter actions get a second ticket, so the many new actions do not push them out
const CORE_ACTS = ["dmg", "heal", "buff", "debuff", "status", "destroy", "draw", "bounce", "silence", "summon"];

const needOK = (n, T) => !n || (Array.isArray(n) ? n.some((x) => T.f.includes(x)) : T.f.includes(n));
// An ACTION has no unit behind it: no "this unit", no lane, no event unit. It is one "When Played" effect that fires when the card is cast.
const SPELL_T = { txt: "", w: 1, m: 1, f: ["spell"], pick: "p", pc: 7 };
function clownRoll(base) { return clownRollCore(base, false); }
function clownSpellRoll(base) { return clownRollCore(base, true); }
function clownRollCore(base, SP) {
  base = base || CD[SP ? CLOWN_SPELL_ID : CLOWN_ID];
  const tkeys = Object.keys(TRIG), tw = tkeys.flatMap((k) => Array(TRIG[k].w).fill(k)), akeys = Object.keys(ACT).concat(["sacReward", "botReward"], CORE_ACTS);   // the two reward actions are listed twice: twice as likely as an average action
  const spellCost = cr(1, 6);                                       // an Action keeps ONE cost for the whole roll and re-rolls its ability until it fits (otherwise cheap ones would win)
  for (let tries = 0; tries < (SP ? 600 : 80); tries++) {
    const cost = SP ? spellCost : cr(1, 6), used = new Set(), effs = [];
    let value = 0, nAct = 0, asked = false;                          // asked = the card already asks the player for its one target
    const nEff = SP ? 1 : 1 + (clownRnd(10) < 4 ? 1 : 0) + (clownRnd(10) < 1 ? 1 : 0);
    for (let e = 0; e < nEff && nAct < 3; e++) {
      const tk = SP ? "OnPlayed" : pick1(tw), T = SP ? SPELL_T : TRIG[tk];
      if (effs.some((x) => x.Trigger == tk)) continue;
      if (T.passive) {                                              // aura: "While in Play: ..."
        const r = clownRnd(10);
        if (r < 6) {                                                // <targets> have <keyword>
          const G0 = TG[pick1(["Others", "Allies", "Adjacent", "Enemies", "Board"])], kw = pick1(Object.keys(PASSIVE_KW));
          value += PASSIVE_KW[kw] * SIDE[G0.side] * (G0.grp ? 1.6 : 1) * T.m;
          effs.push({ Trigger: "Passive", Actions: [{ Type: "GrantKeyword", Target: G0.Target, Keyword: kw }], _t: T.txt + ": " + G0.subj + " have " + kw + "." });
        } else if (r < 8) {                                         // <targets> have +N / -N Attack (an Enemy aura is a debuff)
          const G0 = TG[pick1(["Others", "Allies", "Adjacent", "Enemies"])], n = G0.side == "e" ? -cr(1, 2) : cr(1, 2);
          value += 0.9 * n * SIDE[G0.side] * (G0.grp ? 1.6 : 1) * T.m;
          effs.push({ Trigger: "Passive", Actions: [{ Type: "AuraBuff", Target: G0.Target, BuffAtk: n }], _t: T.txt + ": " + G0.subj + " have " + sg(n) + " Attack." });
        } else {                                                    // this unit's Attack grows with something on the board / in the hands
          const pr = pick1(SCALE_PER), n = cr(1, 2);
          value += 0.9 * n * pr[2] * T.m;
          effs.push({ Trigger: "Passive", Actions: [{ Type: "ScaleAttack", Amount: n, Per: pr[0] }], _t: T.txt + ": This Unit has +" + n + " Attack for each " + pr[1] + "." });
        }
        nAct++;
        continue;
      }
      const parts = [], actions = [], v0 = value;
      let ch = null;                                                // the player-chosen target of THIS effect, if any
      let rew = null, hasSac = false;                               // rew = the cost + reward being built in this effect (see ACT.sacReward / ACT.botReward); hasSac = one cost (sacrifice OR bottom-of-deck) per effect
      const nA = Math.min(3 - nAct, SP ? 1 + (clownRnd(20) < 9 ? 1 : 0) + (clownRnd(20) < 3 ? 1 : 0) : 1 + (clownRnd(10) < 3 ? 1 : 0));
      // once a cost is rolled, the loop only rolls its REWARD actions (up to rew.want, with a few retries for rolls that fail a check)
      for (let k = 0; rew ? rew.items.length < rew.want && rew.tries++ < 10 : k < nA; k++) {
        const id = pick1(akeys), A = ACT[id];
        if ((T.ban || []).includes(A.tag)) continue;
        if (!needOK(A.need, T) || (A.only && !A.only.includes(tk)) || (SP && A.noSpell)) continue;
        if ((A.tag == "sac" || A.tag == "bot") && (hasSac || rew)) continue;   // one cost per effect
        if (id == "sacReward" || id == "botReward") {
          if (nAct >= 2) continue;                                   // needs room for the cost AND at least one reward (3 actions per card)
          const bot = id == "botReward";
          const opt = !bot && tk == "OnPlayed";                      // when played the player may decline a sacrifice; on every other trigger it is automatic (weakest other unit)
          actions.push(bot ? Object.assign({ Type: "BottomFromHand", Amount: 1 }, tk == "OnPlayed" ? {} : { Auto: true })
                           : Object.assign({ Type: "SacrificeUnit", Target: "TargetFriendlyUnit" }, opt ? { Optional: true } : {}));
          rew = { idx: parts.length, ai: actions.length - 1, opt, bot, want: Math.min(1 + (clownRnd(10) < 3 ? 1 : 0), 3 - nAct - 1), items: [], val: 0, tries: 0 };
          parts.push("");
          hasSac = true; nAct++;
          continue;
        }
        const hdBan = !!(T.noHeroDmg && A.hd);                       // "when a Hero takes damage": no damage to heroes (it would loop between the two players' Clownboys)
        let Tname, side, obj, subj, pl = 0, en = 0;
        if (A.kind == "free") {
          Tname = null; side = "f"; obj = ""; subj = "";
        } else if (A.kind == "hero") {
          const both = !A.onlyF && clownRnd(7) == 0;                 // sometimes "both Heroes"
          en = both ? 2 : A.onlyF ? 0 : clownRnd(2);
          const H0 = TG[both ? "Both" : en ? "EnHero" : "MyHero"];
          Tname = H0.Target; side = H0.side; obj = H0.obj; subj = H0.subj; pl = !!H0.grp;
        } else if (ch && clownRnd(10) < 6 && !(ch.c.hero && A.kind == "unit") && (!A.sideE || ch.c.side == "e")) {
          Tname = ch.c.Target; side = ch.c.side; obj = "it"; subj = "It";      // same chosen target as the earlier action of this effect
        } else if (T.pick && !asked && clownRnd(10) < (T.pc || 5)) {
          const kinds = tk == "OnDeath" ? (A.kind == "any" ? ["e", "fh"] : ["e"]) : A.sideE ? ["e"] : A.kind == "any" ? ["e", "f", "a", "eh", "fh"] : ["e", "f", "a"];
          const c = CHOICE[pick1(kinds)];
          ch = { c }; asked = true;
          Tname = c.Target; side = c.side; obj = c.first; subj = cap(c.first);
        } else {
          const opts = Object.keys(TG).filter((g) => {
            const G0 = TG[g];
            if (A.sideE && G0.side != "e") return false;                                  // "take control" only ever takes an ENEMY unit
            if (G0.hero) return A.kind != "unit" && !hdBan;
            if (G0.need && !T.f.includes(G0.need)) return false;
            if (id == "bounce" && g == "Self") return false;
            if (A.single && G0.grp) return false;                                              // one-unit actions (copy / transform) never take a group
            if (A.noSelf && g == "Self") return false;                                  // "return this to hand" re-rolls it forever
            if ((T.ban || []).includes("dmgF") && A.tag == "dmg" && G0.side != "e") return false;
            return true;
          });
          if (!opts.length) continue;
          const G0 = TG[pick1(opts)];
          Tname = G0.Target; side = G0.side; obj = G0.obj; subj = G0.subj; pl = !!G0.grp; en = !!(G0.hero && G0.side == "e");
        }
        const made = A.mk(tk);
        if (!made) continue;
        const val = (A.abs ? made.v : made.v * SIDE[side] * (pl ? 1.8 : 1)) * T.m;
        if (rew && val <= 0) continue;                              // a reward must be a reward: nothing that hurts you / helps the enemy
        const key = id + ":" + Tname + ":" + JSON.stringify(made.a);
        if (used.has(key)) continue;
        used.add(key);
        const base = A.onlyF || A.kind == "free" ? {} : { Target: Tname };
        const flag = rew ? (rew.bot ? { OnlyIfBottomed: true } : { OnlyIfSacrificed: true }) : {};
        (made.as || [made.a]).forEach((x) => actions.push(Object.assign({}, base, x, flag)));
        const txt = made.t(obj, subj, pl, en);
        if (rew) { rew.items.push(txt.charAt(0).toLowerCase() + txt.slice(1)); rew.val += val; }
        else { parts.push(txt); value += val; }
        if (A.tag == "sac" || A.tag == "bot") hasSac = true;
        nAct++;
        if (A.last) break;                                          // this action changes who owns the unit (SwapWithOpposite): nothing may follow it
      }
      if (rew) {
        // no reward could be rolled, or an AUTOMATIC cost (it cannot be declined and may repeat every round) with a small reward: drop it all
        if (!rew.items.length || (!rew.opt && rew.val < (rew.bot ? 2 : 5))) { actions.splice(rew.ai); parts.splice(rew.idx, 1); nAct -= 1 + rew.items.length; }
        else if (rew.bot) {
          parts[rew.idx] = (tk == "OnPlayed" ? "Put a Card from Your Hand on the bottom of Your Deck" : "Put the most expensive Card from Your Hand on the bottom of Your Deck") + ". If you do, " + rew.items.join(" and ");
          value += rew.val * 0.75 - 1.3 * T.m;                       // the reward only comes when there is a card in the hand to put away
        } else {
          parts[rew.idx] = (rew.opt ? "You may Sacrifice a Friendly Unit" : "Sacrifice the weakest other Friendly Unit") + ". If you do, " + rew.items.join(" and ");
          // optional: you only do it when it pays, so it is worth (reward - cost) but never less than nothing; automatic: you always pay the cost
          value += rew.opt ? Math.max(0, rew.val - 2.5) + 0.4 : rew.val - 4.5 * T.m;
        }
      }
      if (!actions.length) continue;
      const eff = { Trigger: tk, Actions: actions };
      if (ch && tk == "OnDeath") eff.Targeting = ch.c.Target;
      // "If <condition>, <effect>": the condition sits on the effect, so the whole effect (cost + reward included) depends on it
      let cd = clownRnd(100) < 36 ? rollCond(tk, T) : null;
      if (cd) {
        const ce = CLOWN_SELF_TRIG.includes(tk) ? { Condition: "And", SubConditions: [{ Condition: "IsSelf" }, cd.c] } : cd.c;
        // on "When Played" the engine asks the player for targets / lanes BEFORE the card is played (picks() in engine.js): no condition then, or the pick could be wasted
        if (tk == "OnPlayed" && !SP && typeof picks == "function" && picks({ Effects: [Object.assign({}, eff, { Condition: ce })] }).length) cd = null;
        else eff.Condition = ce;
      }
      eff._t = (SP ? "" : T.txt + ": ") + (cd ? "If " + cd.t + ", " + parts.map(lcFirst).join(" and ") : parts.join(". ")) + ".";
      if (cd) value = v0 + (value - v0) * cd.p;
      effs.push(eff);
    }
    if (!effs.length || !clownValid(effs)) continue;
    if (SP) {
      // An Action has no stats to soak up the difference, so the ability itself has to be worth about what the mana cost says (cost 1 ~ 2.5 ... cost 6 ~ 10).
      if (Math.abs(value - (1.5 * cost + 1)) > 1.4) continue;
      return Object.assign({}, base, {
        Cost: cost, Type: "Spell",
        Name: genClownName(),
        Sprite: clownArt(true),
        Description: effs.map((x) => x._t).join(" "),
        Effects: effs.map((x) => { const y = Object.assign({}, x); delete y._t; return y; }),
        Rolled: 1,
      });
    }
    const power = 1.6 * cost + 1 + cr(0, 2);                         // what a card of this mana cost is "worth" (close to the normal units' curve)
    if (value > power + 2 || value < -7) continue;                  // absurdly strong / hopeless: roll again
    // Stats are kept inside a window per mana cost, so a cheap card is never a 4/5 and an expensive one never a 0/1.
    // A roll whose ability would push the stats outside the window is thrown away and rolled again (it is NOT clamped: the ability and the stats must still add up).
    const want = Math.round(power - 0.6 - (value > 0 ? value * 0.75 : value));   // measured in bot-vs-bot games: stats are worth more than abilities of the same "price", so a positive ability counts 25% less (and the base is lowered to keep the average strength)
    if (want < CLOWN_MIN_STATS[cost] || want > CLOWN_MAX_STATS[cost]) continue;
    const tot = want, hp = Math.max(1, Math.min(tot, Math.round(tot / 2) + cr(-1, 1)));
    return Object.assign({}, base, {
      Cost: cost, Attack: tot - hp, Health: hp,
      Name: genClownName(),              // <--- Procedural name
      Sprite: clownArt(false),            // <--- random Unit art
      Description: effs.map((x) => x._t).join(" "),
      Effects: effs.map((x) => { const y = Object.assign({}, x); delete y._t; return y; }),
      Rolled: 1,
    });
  }
  if (SP) return Object.assign({}, base, { Cost: 2, Type: "Spell", Name: genClownName(), Sprite: clownArt(true), Description: "Draw 1 Card.", Effects: [{ Trigger: "OnPlayed", Actions: [{ Type: "DrawCard", Amount: 1, Target: "FriendlyHero" }] }], Rolled: 1 });
  return Object.assign({}, base, { Cost: 3, Attack: 3, Health: 3, Name: genClownName(), Sprite: clownArt(false), Description: "", Effects: [], Rolled: 1 });
}
