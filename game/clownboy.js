/* Clownboy - the wild card (a nod to TMTRAINER from The Binding of Isaac: a card that is never quite what it was a moment ago).
   When it enters a hand (rollHand() in engine.js) and again at the start of every Round while it stays there (rerollHand() in startRound),
   it rolls a random MANA COST, random stats and a random ability made of
   ANY trigger the engine knows and a wide pool of actions. The result lives on the hand card as c.d (a full copy of the card data), so the engine,
   the UI, replays and the online snapshot read it like any other card. Nothing about it is balanced by hand: it can buff an enemy, hurt you,
   gift your opponent a card... the generator only pays it back (stronger ability = smaller stats, a drawback = bigger stats).

   NOT ROLLED (need specific cards / only make sense on spells): Merge (needs its 4 piece cards), GiveToOpponent (spells only),
   EventUnitAndAdjacent / Sacrificer / EnemyUnitsNearLane targets.

   TARGETING: the engine can ask the player for ONE target per card, and only for "When Played" (before the card is played) or "When Destroyed"
   (when it dies). So a rolled card has at most one chosen target; every other trigger uses a fixed, well-defined target (this unit, the opposite
   enemy unit, all enemies, a hero, the unit that triggered the effect...). Text and engine target are always built from the same entry, so they agree.

   EXTEND: add an entry to ACT (an action + its text + value) or TRIG (a trigger + what it may target / must not combine with). */
const CLOWN_ID = 131;
const clownRnd = (n) => (typeof R == "function" ? R(n) : Math.floor(Math.random() * n));
const cr = (a, b) => a + clownRnd(b - a + 1);                     // whole number a..b
const pick1 = (a) => a[clownRnd(a.length)];
const plural = (n, w) => n + " " + w + (n == 1 ? "" : "s");
const sg = (n) => (n >= 0 ? "+" : "") + n;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* =========================================================================================
   RANDOM NAME & IMAGE GENERATION (TMTRAINER style)
   ========================================================================================= */
const CLOWN_IMAGES = Array.from({length: 10}, (_, i) => `img/clownboy/clown${i + 1}.webp`); // Adjust length if needed

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
   pick (can ask the player: "p" before playing, "d" when destroyed), ban = action tags that would loop or make no sense. m = value multiplier. */
const TRIG = {
  OnPlayed:               { txt: "When Played", w: 5, m: 1.08, f: ["self", "lane"], pick: "p" },
  OnDeath:                { txt: "When Destroyed", w: 3, m: 0.9, f: [], pick: "d", ban: ["sac"] },
  OnStartOfRound:         { txt: "Start of Round", w: 2, m: 1.4, f: ["self", "lane"] },
  OnEndOfRound:           { txt: "End of Round", w: 2, m: 1.4, f: ["self", "lane"] },
  OnPreCombatLine:        { txt: "Before Combat Here", w: 2, m: 1.3, f: ["self", "lane"] },
  OnPostCombatLine:       { txt: "After Combat Here", w: 1, m: 1.0, f: ["self", "lane"] },
  OnAttackDone:           { txt: "After this Attacks", w: 1, m: 1.0, f: ["self", "lane"], ban: ["bonus"] },
  OnDamagedEnemyUnit:     { txt: "When this deals Damage to an Enemy Unit", w: 2, m: 0.8, f: ["self", "lane", "it"], ban: ["bonus"] },
  OnDamagedEnemyHero:     { txt: "When this deals Damage to the Enemy Hero", w: 1, m: 0.8, f: ["self", "lane"], ban: ["bonus"] },
  OnKill:                 { txt: "When this Destroys a Unit", w: 1, m: 0.8, f: ["self", "lane"], ban: ["bonus"] },
  OnFriendlyUnitDied:     { txt: "Whenever a Friendly Unit is Destroyed", w: 1, m: 1.0, f: ["self", "lane"], ban: ["sac"] },
  OnFriendlyUnitDamaged:  { txt: "Whenever a Friendly Unit is Damaged", w: 1, m: 1.0, f: ["self", "lane"], ban: ["dmgF"] },
  OnFriendlyUnitHpOne:    { txt: "Whenever a Friendly Unit drops to 1 HP", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["dmgF"] },
  OnFriendlyCardDrawn:    { txt: "Whenever You Draw a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnFriendlyActionPlayed: { txt: "Whenever You play an Action", w: 1, m: 1.0, f: ["self", "lane"] },
  OnEnemyUnitPlayed:      { txt: "Whenever the Enemy plays a Unit", w: 1, m: 1.0, f: ["self", "lane", "ev"] },
  OnFriendlyUnitSummoned: { txt: "Whenever another Friendly Unit is Summoned", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["summon"] },
  OnOtherUnitSacrificed:  { txt: "Whenever another Unit is Sacrificed", w: 1, m: 1.0, f: ["self", "lane"], ban: ["sac"] },
  OnStatusApplied:        { txt: "Whenever another Unit gains a Status", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["status"] },
  OnEnemyUnitGainedStats: { txt: "Whenever an Enemy Unit gains Stats", w: 1, m: 1.0, f: ["self", "lane"], ban: ["buff"] },
  OnOpponentCardGained:   { txt: "Whenever the Enemy gains a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnEnemyUnitDied:        { txt: "Whenever an Enemy Unit is Destroyed", w: 1, m: 1.0, f: ["self", "lane"] },
  OnFriendlyUnitPlayed:   { txt: "Whenever another Friendly Unit is Played", w: 1, m: 1.0, f: ["self", "lane", "ev"], ban: ["summon"] },
  OnSacrificed:           { txt: "When this is Sacrificed", w: 1, m: 0.9, f: ["self", "lane"], ban: ["summon", "sac"] },
  OnFriendlyCardGained:   { txt: "Whenever You gain a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
  OnOpponentCardDrawn:    { txt: "Whenever the Enemy Draws a Card", w: 1, m: 0.6, f: ["self", "lane"], ban: ["draw", "add", "ret"] },
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
const cards = (f) => (typeof poolOf == "function" ? poolOf(f).filter((d) => d.Id != CLOWN_ID) : []);
const ACT = {
  dmg:       { kind: "any", tag: "dmg", mk: () => { const n = cr(1, 5); return { a: { Type: "DealDamage", Amount: n }, t: (o) => "Deal " + n + " Damage to " + o, v: -1.3 * n }; } },
  heal:      { kind: "any", mk: () => { const n = cr(2, 6); return { a: { Type: "Heal", Amount: n }, t: (o) => "Heal " + o + " for " + n, v: 0.45 * n }; } },
  healFull:  { kind: "unit", mk: () => ({ a: { Type: "HealToFull" }, t: (o) => "Fully heal " + o, v: 2 }) },
  buff:      { kind: "unit", tag: "buff", mk: () => { const x = cr(0, 3), y = cr(x ? 0 : 1, 4); return { a: { Type: "BuffStats", BuffAtk: x, BuffHp: y }, t: (o, s, pl) => s + (pl ? " get " : " gets ") + sg(x) + "/" + sg(y), v: 0.9 * (x + y) }; } },
  debuff:    { kind: "unit", tag: "buff", mk: () => { const x = cr(0, 3), y = cr(x ? 0 : 1, 3); return { a: { Type: "BuffStats", BuffAtk: -x, BuffHp: -y }, t: (o, s, pl) => s + (pl ? " get " : " gets ") + "-" + x + "/-" + y, v: -0.9 * (x + y) }; } },
  dbl:       { kind: "unit", tag: "buff", mk: () => ({ a: { Type: "DoubleStats" }, t: (o) => "Double the Stats of " + o, v: 3 }) },
  status:    { kind: "unit", tag: "status", mk: () => { const k = pick1(Object.keys(STATUS)); return { a: { Type: "ApplyStatus", StatusKeyword: k }, t: (o) => STATUS[k][0] + " " + o, v: STATUS[k][1] }; } },
  silence:   { kind: "unit", mk: () => ({ a: { Type: "Silence" }, t: (o) => "Silence " + o, v: -2 }) },
  destroy:   { kind: "unit", mk: () => ({ a: { Type: "DestroyUnit" }, t: (o) => "Destroy " + o, v: -5.5 }) },
  bounce:    { kind: "unit", tag: "ret", mk: () => ({ a: { Type: "ReturnToHand" }, t: (o, s, pl) => "Return " + o + (pl ? " to their owners' Hands" : " to its owner's Hand"), v: -1 }) },
  bonus:     { kind: "unit", tag: "bonus", mk: () => ({ a: { Type: "BonusAttack" }, t: (o, s, pl) => s + (pl ? " do" : " does") + " a Bonus Attack", v: 2 }) },
  loseHp:    { kind: "any", mk: () => { const n = cr(1, 4); return { a: { Type: "LoseHealth", Amount: n }, t: (o, s, pl) => s + (pl ? " lose " : " loses ") + n + " HP", v: -1.1 * n }; } },
  atkDown:   { kind: "unit", mk: () => { const n = cr(1, 3); return { a: { Type: "LaneDebuff", Amount: n }, t: (o) => "Reduce the Attack of " + o + " by " + n, v: -0.8 * n }; } },
  // "free" actions take no target: they act on this unit / the players' decks. need = trigger flag required, only = the only triggers they make sense on
  copySelf:  { kind: "free", tag: "summon", need: "self", mk: () => ({ a: { Type: "CopySelf" }, t: () => "Copy itself into a random empty lane", v: 5 }) },
  respawn:   { kind: "free", tag: "summon", only: ["OnDeath"], mk: () => ({ a: { Type: "RespawnSelf", BuffHp: -1 }, t: () => "Return to play in its lane with -1 HP", v: 3 }) },
  moveRight: { kind: "free", need: "self", only: ["OnPlayed", "OnStartOfRound", "OnEndOfRound", "OnFriendlyActionPlayed", "OnEnemyUnitPlayed", "OnFriendlyCardDrawn", "OnFriendlyCardGained", "OnOpponentCardGained", "OnOpponentCardDrawn"],
             mk: () => { const th = clownRnd(2); return { a: th ? { Type: "MoveRight", ThenAttack: true } : { Type: "MoveRight" }, t: () => th ? "Move one lane to the right, then Attack" : "Move one lane to the right", v: th ? 1.5 : 0.3 }; } },
  curseEnemy:{ kind: "free", mk: () => { const ash = typeof CD != "undefined" && CD[914]; return ash ? { a: { Type: "AddCardToEnemyDeck", ValueParam: 914 }, t: () => "Shuffle a " + ash.Name + " into the Enemy's Deck", v: 1.5 } : { a: { Type: "AddCardToEnemyDeck", Filter: { Token: 0 } }, t: () => "Shuffle a random card into the Enemy's Deck", v: -0.5 }; } },
  // --- player-prompt actions. On "When Played" the engine asks the player (Sacrifice target, lane, card from the deck...); on every other trigger it decides itself.
  sacrifice: { kind: "free", tag: "sac", need: "self", mk: (tk) => { const ab = clownRnd(2), pl = tk == "OnPlayed";
               return { as: [{ Type: "SacrificeUnit", Target: "TargetFriendlyUnit" }].concat(ab ? [{ Type: "AbsorbStats", Target: "Self" }] : []),
                        t: () => (pl ? "Sacrifice a Friendly Unit" : "Sacrifice the weakest other Friendly Unit") + (ab ? ". This absorbs its Stats" : ""), v: ab ? -0.7 : -4.5 }; } },
  // Sacrifice WITH A REWARD: "(You may) Sacrifice a Friendly Unit. If you do, <1-2 random actions>". The sacrifice itself is built in clownRoll(): the actions rolled after it
  // become its reward (flagged OnlyIfSacrificed - the engine only runs them when a unit really was sacrificed) and are rolled exactly like any other action (any target, chosen targets included).
  sacReward: { kind: "free", tag: "sac", need: "self", mk: () => null },
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
  draw:      { kind: "hero", tag: "draw", mk: () => { const n = cr(1, 2); return { a: { Type: "DrawCard", Amount: n }, t: (o, s, pl, en) => (en ? "The Enemy Hero Draws " : "Draw ") + plural(n, "Card"), v: 2 * n }; } },
  loseBlood: { kind: "hero", mk: () => { const n = cr(1, 3); return { a: { Type: "LoseBlood", Amount: n }, t: (o, s, pl, en) => (en ? "The Enemy Hero loses " : "You lose ") + n + " Blood", v: -1.2 * n }; } },
  maxHp:     { kind: "hero", mk: () => { const n = cr(1, 3); return { a: { Type: "IncreaseMaxHp", Amount: n }, t: (o) => cap(o) + " gets +" + n + " max HP", v: 0.4 * n }; } },
  conjure:   { kind: "hero", tag: "add", mk: () => { const c = pick1(cards({ Token: 0 })); return c ? { a: { Type: "AddCardToHand", ValueParam: c.Id }, t: (o, s, pl, en) => (en ? "The Enemy Hero gains " + c.Name : "Conjure " + c.Name + " into Your Hand"), v: 0.4 * (c.Cost || 0) + 1.2 } : null; } },
  conjureAct:{ kind: "hero", tag: "add", mk: () => ({ a: { Type: "AddCardToHand", Filter: { Type: "Spell", Token: 0 } }, t: (o, s, pl, en) => (en ? "The Enemy Hero gains a random Action" : "Conjure a random Action"), v: 2.2 }) },
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

function clownRoll(base) {
  base = base || CD[CLOWN_ID];
  const tkeys = Object.keys(TRIG), tw = tkeys.flatMap((k) => Array(TRIG[k].w).fill(k)), akeys = Object.keys(ACT).concat("sacReward");   // sacReward is listed twice: twice as likely as an average action
  for (let tries = 0; tries < 80; tries++) {
    const cost = cr(1, 6), used = new Set(), effs = [];
    let value = 0, nAct = 0, asked = false;                          // asked = the card already asks the player for its one target
    const nEff = 1 + (clownRnd(10) < 4 ? 1 : 0) + (clownRnd(10) < 1 ? 1 : 0);
    for (let e = 0; e < nEff && nAct < 3; e++) {
      const tk = pick1(tw), T = TRIG[tk];
      if (effs.some((x) => x.Trigger == tk)) continue;
      if (T.passive) {                                              // aura: "While in Play: <targets> have <keyword>"
        const G0 = TG[pick1(["Others", "Allies", "Adjacent", "Enemies", "Board"])], kw = pick1(Object.keys(PASSIVE_KW));
        value += PASSIVE_KW[kw] * SIDE[G0.side] * (G0.grp ? 1.6 : 1) * T.m;
        effs.push({ Trigger: "Passive", Actions: [{ Type: "GrantKeyword", Target: G0.Target, Keyword: kw }], _t: T.txt + ": " + G0.subj + " have " + kw + "." });
        nAct++;
        continue;
      }
      const parts = [], actions = [];
      let ch = null;                                                // the player-chosen target of THIS effect, if any
      let rew = null, hasSac = false;                               // rew = the sacrifice reward being built in this effect (see ACT.sacReward)
      const nA = Math.min(3 - nAct, 1 + (clownRnd(10) < 3 ? 1 : 0));
      // once a sacrifice is rolled, the loop only rolls its REWARD actions (up to rew.want, with a few retries for rolls that fail a check)
      for (let k = 0; rew ? rew.items.length < rew.want && rew.tries++ < 10 : k < nA; k++) {
        const id = pick1(akeys), A = ACT[id];
        if ((T.ban || []).includes(A.tag)) continue;
        if ((A.need && !T.f.includes(A.need)) || (A.only && !A.only.includes(tk))) continue;
        if (A.tag == "sac" && (hasSac || rew)) continue;            // one sacrifice per effect
        if (id == "sacReward") {
          if (nAct >= 2) continue;                                   // needs room for the sacrifice AND at least one reward (3 actions per card)
          const opt = tk == "OnPlayed";                              // when played the player may decline; on every other trigger it is automatic (weakest other unit)
          actions.push(Object.assign({ Type: "SacrificeUnit", Target: "TargetFriendlyUnit" }, opt ? { Optional: true } : {}));
          rew = { idx: parts.length, ai: actions.length - 1, opt, want: Math.min(1 + (clownRnd(10) < 3 ? 1 : 0), 3 - nAct - 1), items: [], val: 0, tries: 0 };
          parts.push("");
          hasSac = true; nAct++;
          continue;
        }
        let Tname, side, obj, subj, pl = 0, en = 0;
        if (A.kind == "free") {
          Tname = null; side = "f"; obj = ""; subj = "";
        } else if (A.kind == "hero") {
          en = A.onlyF ? 0 : clownRnd(2);
          const H0 = TG[en ? "EnHero" : "MyHero"];
          Tname = H0.Target; side = H0.side; obj = H0.obj; subj = H0.subj;
        } else if (ch && clownRnd(10) < 6 && !(ch.c.hero && A.kind == "unit")) {
          Tname = ch.c.Target; side = ch.c.side; obj = "it"; subj = "It";      // same chosen target as the earlier action of this effect
        } else if (T.pick && !asked && clownRnd(10) < 5) {
          const kinds = tk == "OnDeath" ? (A.kind == "any" ? ["e", "fh"] : ["e"]) : A.kind == "any" ? ["e", "f", "a", "eh", "fh"] : ["e", "f", "a"];
          const c = CHOICE[pick1(kinds)];
          ch = { c }; asked = true;
          Tname = c.Target; side = c.side; obj = c.first; subj = cap(c.first);
        } else {
          const opts = Object.keys(TG).filter((g) => {
            const G0 = TG[g];
            if (G0.hero) return A.kind != "unit";
            if (G0.need && !T.f.includes(G0.need)) return false;
            if (id == "bounce" && g == "Self") return false;
            if (A.single && G0.grp) return false;                                              // one-unit actions (copy / transform) never take a group
            if (A.noSelf && g == "Self") return false;                                  // "return this to hand" re-rolls it forever
            if ((T.ban || []).includes("dmgF") && A.tag == "dmg" && G0.side != "e") return false;
            return true;
          });
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
        (made.as || [made.a]).forEach((x) => actions.push(Object.assign({}, base, x, rew ? { OnlyIfSacrificed: true } : {})));
        const txt = made.t(obj, subj, pl, en);
        if (rew) { rew.items.push(txt.charAt(0).toLowerCase() + txt.slice(1)); rew.val += val; }
        else { parts.push(txt); value += val; }
        if (A.tag == "sac") hasSac = true;
        nAct++;
      }
      if (rew) {
        // no reward could be rolled, or an AUTOMATIC sacrifice (it cannot be declined and may repeat every round) with a small reward: drop it all
        if (!rew.items.length || (!rew.opt && rew.val < 5)) { actions.splice(rew.ai); parts.splice(rew.idx, 1); nAct -= 1 + rew.items.length; }
        else {
          parts[rew.idx] = (rew.opt ? "You may Sacrifice a Friendly Unit" : "Sacrifice the weakest other Friendly Unit") + ". If you do, " + rew.items.join(" and ");
          // optional: you only do it when it pays, so it is worth (reward - cost) but never less than nothing; automatic: you always pay the cost
          value += rew.opt ? Math.max(0, rew.val - 2.5) + 0.4 : rew.val - 4.5 * T.m;
        }
      }
      if (!actions.length) continue;
      const eff = { Trigger: tk, Actions: actions, _t: T.txt + ": " + parts.join(". ") + "." };
      if (ch && tk == "OnDeath") eff.Targeting = ch.c.Target;
      effs.push(eff);
    }
    if (!effs.length || !clownValid(effs)) continue;
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
      Sprite: pick1(CLOWN_IMAGES),       // <--- Random image path
      Description: effs.map((x) => x._t).join(" "),
      Effects: effs.map((x) => { const y = Object.assign({}, x); delete y._t; return y; }),
      Rolled: 1,
    });
  }
  return Object.assign({}, base, { Cost: 3, Attack: 3, Health: 3, Name: genClownName(), Sprite: pick1(CLOWN_IMAGES), Description: "", Effects: [], Rolled: 1 });
}
