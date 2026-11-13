/* ============================================================
   EXPERIMENTAL CARDS - full rewrite matching the xlsx spreadsheet.
   - IDs 1-100 keep cards.js IDs.
   - New cards from xlsx: 101-110.
   - Original tokens: 900-912. New tokens: 913-924.
   - [KEYWORD] no longer in descriptions (engine renders them).
   - Subtypes balanced ~23 per type.
   - "Sacrifice:" in description = "When Played: You may sacrifice
     a friendly unit; if you do, [Y]". Spells with sacrifice are
     mandatory; Units are optional.
   ============================================================ */
const CARDS_EXP = [

  // ==================== COST 1 ====================
  {
    Id: 1,
    Name: "Black Rabbitlings",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 1,
    Health: 3,
    Description: "When Destroyed: Heal Your Hero for 3.",
    Effects: [
      { Trigger: "OnDeath",
        Actions: [{ Type: "Heal", Target: "FriendlyHero", Amount: 3 }] },
    ],
  },

  {
    Id: 2,
    Name: "BoomBot",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Destroyed: Deal 2 damage to the Enemy Hero.",
    Effects: [
      { Trigger: "OnDeath",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] },
    ],
  },

  {
    Id: 3,
    Name: "Bone Baronet",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 1,
    Health: 1,
    Description: "When Destroyed: Gain The Tempting Goblet.",
    Effects: [
      { Trigger: "OnDeath",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 900 }] },
    ],
  },

  {
    Id: 4,
    Name: "Scout",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Played: Mark an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }] },
    ],
  },

  {
    Id: 5,
    Name: "Queen of Cards",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "While in Play: When a Friendly Unit is Destroyed, Draw a Card.",
    Effects: [
      { Trigger: "OnFriendlyUnitDied",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] },
    ],
  },

  {
    Id: 6,
    Name: "The Jersey Demon",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 6,
    Attack: 3,
    Health: 3,
    Description: "When Played: All Friendly Units get +1/+1 for the rest of the game.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "ModifyGlobalBuff", Target: "FriendlyHero", BuffAtk: 1, BuffHp: 1 }] },
    ],
  },

  {
    Id: 7,
    Name: "Glock-17",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 3 damage to an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 }] },
    ],
  },

  {
    Id: 8,
    Name: "Knight",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Keywords: ["Armored"],
    KeywordParams: { Armored: 1 },
    Description: "",
  },

  {
    Id: 9,
    Name: "Corpse Eater",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 4,
    Attack: 3,
    Health: 1,
    Description: "While in Hand: When a Friendly Unit is Destroyed, Play this in its place.",
    Effects: [
      { Trigger: "OnFriendlyUnitDied",
        Zone: "Hand",
        Actions: [{ Type: "SummonUnit", Target: "Self" }] },
    ],
  },

  {
    Id: 10,
    Name: "Polar Bear",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Description: "Sacrifice: Absorb the Stats of the Unit Sacrificed.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "OtherFriendlyUnits",
        Actions: [
          { Type: "AbsorbStats", Target: "SelectedTarget" },
          { Type: "SacrificeUnit", Target: "SelectedTarget", Optional: true },
        ] },
    ],
  },

  {
    Id: 11,
    Name: "The Creature",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 10,
    Attack: 7,
    Health: 7,
    Keywords: ["Unkillable"],
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Costs 1 less whenever You Sacrifice a Unit.",
    DescriptionClassic: "While in Hand: Costs 1 less whenever You Sacrifice a Unit.",
    Effects: [
      { Trigger: "OnOtherUnitSacrificed",
        Zone: ["Deck", "Hand", "Discard"],
        ZoneClassic: "Hand",
        Actions: [{ Type: "BuffStats", Target: "Self", Amount: -1 }] },
    ],
  },

  {
    Id: 12,
    Name: "Black Cat",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Sacrificed: Return to Your Hand instead. It costs 0 this turn.",
    Effects: [
      { Trigger: "OnSacrificed",
        Zone: "Board",
        Actions: [{ Type: "ReturnToHand", Target: "Self", FreeThisTurn: true }] },
    ],
  },

  {
    Id: 13,
    Name: "Seek",
    Type: "Spell",
    Cost: 1,
    Description: "Choose a Card from Your Deck and add it to your hand.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "TutorCard", Target: "Self" },
          { Type: "ShuffleDeck", Target: "Self" },
        ] },
    ],
  },

  {
    Id: 14,
    Name: "Survivalist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 2,
    Health: 4,
    Keywords: ["SoulGuard"],
    Description: "While in Play: All Friendly Units have Soul Guard.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ApplyStatus", Target: "OtherFriendlyUnits", StatusKeyword: "SoulGuard" }] },
    ],
  },

  {
    Id: 15,
    Name: "Expectancy",
    Type: "Spell",
    Cost: 3,
    Description: "Draw a Card from Your Deck or Your Discard pile now and at the start of the next round.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "Choice",
        ChoiceLabels: ["Draw from Deck", "Draw from Discard"],
        Actions: [
          { Type: "DrawCard", Amount: 1, Target: "FriendlyHero", Later: true },
          { Type: "DrawFromDiscard", Amount: 1, Target: "FriendlyHero", Later: true },
        ] },
    ],
  },

  {
    Id: 16,
    Name: "HellFire",
    Type: "Spell",
    Cost: 5,
    Description: "Deal 3 Damage and Apply Burn 3 to all Units on Board.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "AllUnitsOnBoard", Amount: 3 },
          { Type: "ApplyStatus", Target: "AllUnitsOnBoard", StatusKeyword: "Burning" },
          { Type: "ApplyStatus", Target: "AllUnitsOnBoard", StatusKeyword: "Burning" },
          { Type: "ApplyStatus", Target: "AllUnitsOnBoard", StatusKeyword: "Burning" },
        ] },
    ],
  },

  {
    Id: 17,
    Name: "Magician",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Keywords: ["SplashDamage", "BurnSource"],
    KeywordParams: { SplashDamage: 3 },
    Description: "When this Does Damage to the Enemy Unit: Apply Burning to it.",
  },

  {
    Id: 18,
    Name: "Final Mission",
    Type: "Spell",
    Cost: 2,
    Description: "Sacrifice a Friendly Unit. Deal 4 damage to an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit" },
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 4 },
        ] },
    ],
  },

  {
    Id: 19,
    Name: "Lunch",
    Type: "Spell",
    Cost: 3,
    Description: "A Friendly Unit does a Bonus Attack.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BonusAttack", Target: "TargetFriendlyUnit" }] },
    ],
  },

  {
    Id: 20,
    Name: "Genie",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Description: "When Played: Bounce a Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "SelectedTarget",
        Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget" }] },
    ],
  },

  {
    Id: 21,
    Name: "Juggernaut",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 4,
    Health: 2,
    Keywords: ["Armored"],
    KeywordParams: { Armored: 2 },
    Description: "When this Hurts an Enemy Unit: Deal 2 Damage to the Enemy Hero.",
    Effects: [
      { Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] },
    ],
  },

  {
    Id: 22,
    Name: "QuickDraw Gun Man",
    Type: "Unit",
    Subtypes: ["Aberration", "Human"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Description: "Whenever an Enemy Unit is Played in this lane: Deal 2 damage to it.",
    Effects: [
      { Trigger: "OnEnemyUnitPlayed",
        Condition: { Condition: "SameLane" },
        Actions: [{ Type: "DealDamage", Target: "EventUnit", Amount: 2 }] },
    ],
  },

  {
    Id: 23,
    Name: "Chainsaw Guy",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 6,
    Attack: 5,
    Health: 5,
    Keywords: ["SilenceImmune"],
    Description: "On Kill: Heal to Full, gain +2 HP.",
    Effects: [
      { Trigger: "OnKill",
        Actions: [
          { Type: "HealToFull", Target: "Self" },
          { Type: "BuffStats", Target: "Self", BuffHp: 2 },
        ] },
    ],
  },

  {
    Id: 24,
    Name: "Gerard from Rivia",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 6,
    Attack: 5,
    Health: 5,
    Description: "While in Play: When You mark an Enemy Unit, do a Bonus Attack.",
    Effects: [
      { Trigger: "OnStatusApplied",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsStatus", TargetParam: "Marked" },
            { Condition: "IsEnemy" },
          ] },
        Actions: [{ Type: "BonusAttack", Target: "Self" }] },
    ],
  },

  {
    Id: 25,
    Name: "Bounty Hunter",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Description: "While in Play: Whenever You mark an Enemy Unit, Stun it.",
    Effects: [
      { Trigger: "OnStatusApplied",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsStatus", TargetParam: "Marked" },
            { Condition: "IsEnemy" },
          ] },
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }] },
    ],
  },

  {
    Id: 26,
    Name: "Occultist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 2,
    Health: 4,
    Description: "Before Combat: Mark an Enemy Unit.",
    Effects: [
      { Trigger: "OnPreCombatLine",
        Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }] },
    ],
  },

  {
    Id: 27,
    Name: "Drawing Raptor",
    Type: "Unit",
    Subtypes: ["Animal", "Aberration"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "While in Play: When You draw a Card, gain +1 ATK. When this Hurt an Enemy Hero, Draw a Card.",
    Effects: [
      { Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSelf" },
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] },
      { Trigger: "OnFriendlyCardDrawn",
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }] },
    ],
  },

  {
    Id: 28,
    Name: "Exploding Present",
    Type: "Spell",
    Cost: 4,
    Description: "Deal 7 Damage to the Enemy Unit. The Enemy Hero gains a copy of this card that costs 2 more.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 7 },
          { Type: "GiveToOpponent", Target: "Self", CostChange: 2 },
        ] },
    ],
  },

  {
    Id: 29,
    Name: "Blighteinstein",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 7,
    Attack: 7,
    Health: 5,
    Description: "On Kill: Move Right. If an Enemy Unit is in that lane, do a Bonus Attack.",
    Effects: [
      { Trigger: "OnKill",
        Actions: [{ Type: "MoveRight", Target: "Self", ThenAttack: true }] },
    ],
  },

  {
    Id: 30,
    Name: "SharkCannon",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 6,
    Attack: 0,
    Health: 7,
    Description: "Before Combat: Deal 4 Damage to the Enemy Hero.",
    Effects: [
      { Trigger: "OnPreCombatLine",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 4 }] },
    ],
  },

  {
    Id: 31,
    Name: "Silence",
    Type: "Spell",
    Cost: 2,
    Description: "Silence an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Silence", Target: "TargetEnemyUnit" }] },
    ],
  },

  {
    Id: 32,
    Name: "Marked for Death",
    Type: "Spell",
    Cost: 2,
    Description: "Mark an Enemy Unit. Draw a Card.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" },
          { Type: "DrawCard", Target: "FriendlyHero" },
        ] },
    ],
  },

  {
    Id: 33,
    Name: "Mouse",
    Type: "Unit",
    Subtypes: ["Animal", "Machine"],
    Cost: 5,
    Attack: 5,
    Health: 12,
    Keywords: ["Stunned"],
    Description: "When this Does Damage: Stun It.",
    Effects: [
      { Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" }] },
      { Trigger: "OnDamagedEnemyHero",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" }] },
    ],
  },

  {
    Id: 34,
    Name: "Maid Mask",
    Type: "Unit",
    Subtypes: ["Human", "Aberration"],
    Cost: 3,
    Attack: 3,
    Health: 1,
    Description: "On Kill: Gain Soul Guard.",
    Effects: [
      { Trigger: "OnKill",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "SoulGuard" }] },
    ],
  },

  {
    Id: 35,
    Name: "Cathullu Captain",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Description: "While in Play: Whenever a Friendly Aberration hurts the Enemy Hero, that Unit gains +1/+1.",
    Effects: [
      { Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSubtype", TargetParam: "Aberration" },
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 }] },
    ],
  },

  {
    Id: 36,
    Name: "Death",
    Type: "Unit",
    Subtypes: ["Human", "Aberration"],
    Cost: 7,
    Attack: 4,
    Health: 4,
    Keywords: ["SoulGuard"],
    Rule: "hpOneTrigger",
    Description: "Whenever a Friendly Unit is Destroyed or Drops to 1 HP: Deal 3 Damage to the Enemy Hero.",
    DescriptionClassic: "Whenever a Friendly Unit is Destroyed: Deal 3 Damage to the Enemy Hero.",
    Effects: [
      { Trigger: "OnFriendlyUnitDied",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 3 }] },
      { Trigger: "OnFriendlyUnitHpOne",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 3 }] },
    ],
  },

  {
    Id: 37,
    Name: "Archer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 1,
    Health: 4,
    Description: "Before Combat: Apply Burning to an Enemy Unit.",
    Effects: [
      { Trigger: "OnPreCombatLine",
        Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Burning" }] },
    ],
  },

  {
    Id: 38,
    Name: "Inhuman Torch",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 3,
    Health: 2,
    Keywords: ["Burning"],
    Description: "",
  },

  {
    Id: 39,
    Name: "Regifter",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "When Played: Both Heroes Draw a Card. Sacrifice: Draw a Card.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "DrawCard", Target: "EnemyHero", Amount: 1 },
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1, OnlyIfSacrificed: true },
        ] },
    ],
  },

  {
    Id: 40,
    Name: "Widows Spider",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 5,
    Attack: 4,
    Health: 4,
    Description: "While in Play: Whenever an Enemy Unit hurts a Friendly Animal, Stun that Unit.",
    Effects: [
      { Trigger: "OnFriendlyUnitDamaged",
        Condition: { Condition: "IsSubtype", TargetParam: "Animal" },
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }] },
    ],
  },

  {
    Id: 41,
    Name: "Pegasus",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 4,
    Attack: 3,
    Health: 2,
    Keywords: ["Flying"],
    Description: "When Played: Another Friendly Animal does a Bonus Attack.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BonusAttack", Target: "TargetFriendlyUnit", Where: { Subtype: "Animal" } }] },
    ],
  },

  {
    Id: 42,
    Name: "Artificer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 1,
    Health: 1,
    Description: "When Played: If You control a Machine, gain +2/+2.",
    Effects: [
      { Trigger: "OnPlayed",
        Condition: { Condition: "HasSubtypeOnBoard", TargetParam: "Machine" },
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 2, BuffHp: 2 }] },
    ],
  },

  {
    Id: 43,
    Name: "Royal Ghost",
    Type: "Unit",
    Subtypes: ["Aberration", "Machine"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Description: "When this Does Damage: Summon Souldiers in Adjacent Lanes.",
    Effects: [
      { Trigger: "OnAttackDone",
        Actions: [{ Type: "MakeAUnit", ValueParam: 901, StringParam: "AdjacentLanes" }] },
    ],
  },

  {
    Id: 44,
    Name: "Area Drone",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 1,
    Health: 2,
    Keywords: ["SplashDamage"],
    KeywordParams: { SplashDamage: 1 },
    Description: "",
  },

  {
    Id: 45,
    Name: "Dagger Throw",
    Type: "Spell",
    Cost: 1,
    Description: "Deal 2 Damage to a Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 }] },
    ],
  },

  {
    Id: 46,
    Name: "Tea Maid",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 1,
    Health: 4,
    Description: "While in Play: The First Action You play each Round costs 3 less.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ModifyCost", Side: "Friendly", Amount: -3, CardFilter: { Type: "Spell" }, FirstEachRound: true }] },
    ],
  },

  {
    Id: 47,
    Name: "Rustler",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 13,
    Attack: 6,
    Health: 6,
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Costs 1 Less for each Action You played. When Played: Do a Bonus Attack.",
    DescriptionClassic: "While in Hand: Costs 1 Less for each Action You played. When Played: Do a Bonus Attack.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BonusAttack", Target: "Self" }] },
      { Trigger: "OnFriendlyActionPlayed",
        Zone: ["Deck", "Hand", "Discard"],
        ZoneClassic: "Hand",
        Actions: [{ Type: "BuffStats", Target: "Self", Amount: -1 }] },
    ],
  },

  {
    Id: 48,
    Name: "Butcher",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 1,
    Health: 3,
    Description: "While in Play: Each time You Sacrifice a Unit, gain +1/+1 or +2/+2 if it was a Human instead.",
    Effects: [
      { Trigger: "OnOtherUnitSacrificed",
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 }] },
      { Trigger: "OnOtherUnitSacrificed",
        Condition: { Condition: "IsSubtype", TargetParam: "Human" },
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 }] },
    ],
  },

  {
    Id: 49,
    Name: "Farewell",
    Type: "Spell",
    Cost: 5,
    Description: "Destroy a Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "DestroyUnit", Target: "TargetEnemyUnit" }] },
    ],
  },

  {
    Id: 50,
    Name: "Magic Touch",
    Type: "Spell",
    Cost: 1,
    Description: "A Friendly Unit gets +1/+3.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 3 }] },
    ],
  },

  {
    Id: 51,
    Name: "Trapper",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 1,
    Description: "When Played: Gain a Trap. It costs 0 this turn.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 903, FreeThisTurn: true }] },
    ],
  },

  {
    Id: 52,
    Name: "Adaptive Unit",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 1,
    Health: 2,
    Description: "While in Play: Each time You play another Machine gain +1/+1.",
    Effects: [
      { Trigger: "OnPlayed",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsFriendly" },
            { Condition: "IsSubtype", TargetParam: "Machine" },
            { Condition: "Not", SubConditions: [{ Condition: "IsSelf" }] },
          ] },
        Zone: "Board",
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 }] },
    ],
  },

  {
    Id: 53,
    Name: "The Curtain Call",
    Type: "Spell",
    Cost: 7,
    Description: "For the Rest of The Game, Marking a Marked Unit Destroys it. Mark all Enemy Units, then Deal 2 Damage to Them.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "GrantRule", Rule: "mk" },
          { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Marked" },
          { Type: "DealDamage", Target: "AllEnemyUnits", Amount: 2 },
        ] },
    ],
  },

  {
    Id: 54,
    Name: "Thor",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 0,
    Health: 6,
    Rule: "persistentGrowth",
    Description: "While in Hand, Deck, Discard or on Board: Gain +1 ATK whenever a Friendly Machine is Destroyed.",
    DescriptionClassic: "While in Hand: Gain +1 ATK whenever a Friendly Machine is Destroyed.",
    Effects: [
      { Trigger: "OnFriendlyUnitDied",
        Zone: ["Deck", "Hand", "Discard", "Board"],
        ZoneClassic: "Hand",
        Condition: { Condition: "IsSubtype", TargetParam: "Machine" },
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }] },
    ],
  },

  {
    Id: 55,
    Name: "ZaUm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 7,
    Attack: 6,
    Health: 4,
    Keywords: ["Unactionable", "Armored"],
    KeywordParams: { Armored: 3 },
    Description: "While in Play: Other Friendly Machines get +2 ATK.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "AuraBuff", Target: "OtherFriendlyUnits", Where: { Subtype: "Machine" }, BuffAtk: 2 }] },
    ],
  },

  {
    Id: 56,
    Name: "Collector",
    TokenGroup: "The Collection",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 8,
    Attack: 3,
    Health: 7,
    Description: "When Played: Summon The Collection.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "MakeAUnit", ValueParam: 904 },
          { Type: "MakeAUnit", ValueParam: 905 },
          { Type: "MakeAUnit", ValueParam: 906 },
        ] },
    ],
  },

  {
    Id: 57,
    Name: "Pale Mirror",
    Type: "Spell",
    Cost: 4,
    Description: "Summon an Exact copy of a Friendly Unit that costs 4 or less in an empty lane of Your choice.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [{ Type: "CopyUnit", Target: "SelectedTarget", Where: { MaxCost: 4 } }] },
    ],
  },

  {
    Id: 58,
    Name: "Excision Conjucture",
    Type: "Spell",
    Cost: 3,
    Description: "Enemy Units here and in adjacent lanes get -2 ATK this round. Draw a Card.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "LaneChoice",
        Actions: [
          { Type: "LaneDebuff", Target: "EnemyUnitsNearLane", Select: "P", Amount: 2, Regain: 2 },
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
        ] },
    ],
  },

  {
    Id: 59,
    Name: "Gargoyle",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 2,
    Attack: 2,
    Health: 1,
    Keywords: ["Flying"],
    Description: "",
  },

  {
    Id: 60,
    Name: "Wyvern",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 9,
    Attack: 6,
    Health: 6,
    Keywords: ["SplashDamage"],
    KeywordParams: { SplashDamage: 6 },
    Description: "While in Play: Enemy Actions cost 6 more.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "BuffStats", Target: "EnemySpellsInHand", Amount: 6 }] },
    ],
  },

  {
    Id: 61,
    Name: "Prototype",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Destroyed: Gain an Iron Claw.",
    Effects: [
      { Trigger: "OnDeath",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 911 }] },
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Transform", Target: "Self", Into: 907, Partner: 62, PartnerInto: 908 }] },
    ],
  },

  {
    Id: 62,
    Name: "Therapist",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 1,
    Health: 4,
    Description: "When Played: Fully heal a Friendly Unit. If You control another Machine, it also gets +2 HP.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "HealToFull", Target: "TargetFriendlyUnit" },
          { Type: "BuffStats", Target: "TargetFriendlyUnit", BuffHp: 2, Condition: { Condition: "HasSubtypeOnBoard", TargetParam: "Machine" } },
        ] },
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Transform", Target: "Self", Into: 908, Partner: 61, PartnerInto: 907 }] },
    ],
  },

  {
    Id: 63,
    Name: "Uncle Menel",
    Type: "Unit",
    Subtypes: ["Human", "Animal"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "Sacrifice: Deal 2 Damage to an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2, OnlyIfSacrificed: true },
        ] },
    ],
  },

  {
    Id: 64,
    Name: "Black Goat",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 0,
    Health: 4,
    Keywords: ["Taunt"],
    Description: "When Sacrificed: Gain +2 Blood this turn.",
    Effects: [
      { Trigger: "OnSacrificed",
        Actions: [{ Type: "AddResource", Target: "FriendlyHero", Amount: 2 }] },
    ],
  },

  {
    Id: 65,
    Name: "Cuckooist",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 1,
    Health: 4,
    Description: "While in Play: Each time You Sacrifice a Unit, Draw a Card and Heal 1.",
    Effects: [
      { Trigger: "OnOtherUnitSacrificed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "Heal", Target: "FriendlyHero", Amount: 1 },
        ] },
    ],
  },

  {
    Id: 66,
    Name: "Bouncer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Description: "When this Damages an Enemy Unit: Bounce it.",
    Effects: [
      { Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget", IfAlive: true }] },
    ],
  },

  {
    Id: 67,
    Name: "Aura",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "When Played: Increase Your Hero's Max HP by 2. Heal Your Hero and all Friendly Units for 2.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "IncreaseMaxHp", Target: "FriendlyHero", Amount: 2 },
          { Type: "Heal", Target: "FriendlyHero", Amount: 2 },
          { Type: "Heal", Target: "AllFriendlyUnits", Amount: 2 },
        ] },
    ],
  },

  {
    Id: 68,
    Name: "Angel Bird",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 6,
    Attack: 4,
    Health: 4,
    Keywords: ["Flying"],
    Description: "Sacrifice: You may Choose as Many Friendly Units as You want and absorb their stats.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "SacrificeUnits", Target: "OtherFriendlyUnits", Absorb: true }] },
    ],
  },

  {
    Id: 69,
    Name: "Evo Neighbour",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 6,
    Attack: 2,
    Health: 6,
    Keywords: ["Breakthrough"],
    Description: "After Combat Here, do a Bonus Attack. Whenever this Damages a Unit: Bounce it.",
    Effects: [
      { Trigger: "OnPostCombatLine",
        Actions: [{ Type: "BonusAttack", Target: "Self" }] },
      { Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget", IfAlive: true }] },
    ],
  },

  {
    Id: 70,
    Name: "Titan's Head",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 3,
    Health: 7,
    Keywords: ["Unactionable"],
    Description: "When Destroyed: Draw a Random Titan Card from Your Deck. When Played: If You control all 4 Titan Pieces, Merge The Titan here.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 }] },
      { Trigger: "OnDeath",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } }] },
    ],
  },

  {
    Id: 71,
    Name: "Titan's Torso",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 2,
    Health: 5,
    Keywords: ["Unactionable"],
    Description: "When Destroyed: Draw a Random Titan Card from Your Deck. When Played: If You control all 4 Titan Pieces, Merge The Titan here.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 }] },
      { Trigger: "OnDeath",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } }] },
    ],
  },

  {
    Id: 72,
    Name: "Titan's Left Arm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 2,
    Health: 1,
    Keywords: ["Unactionable"],
    Description: "When Destroyed: Draw a Random Titan Card from Your Deck. When Played: If You control all 4 Titan Pieces, Merge The Titan here.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 }] },
      { Trigger: "OnDeath",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } }] },
    ],
  },

  {
    Id: 73,
    Name: "Titan's Right Arm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Keywords: ["Unactionable"],
    Description: "When Destroyed: Draw a Random Titan Card from Your Deck. When Played: If You control all 4 Titan Pieces, Merge The Titan here.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 }] },
      { Trigger: "OnDeath",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } }] },
    ],
  },

  {
    Id: 74,
    Name: "Undrawn",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 1,
    Health: 5,
    Description: "While in Play: Whenever the Enemy Hero gains a Card, deal 1 Damage to Them.",
    Effects: [
      { Trigger: "OnOpponentCardGained",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 1 }] },
    ],
  },

  {
    Id: 75,
    Name: "Morsel",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 1,
    Health: 2,
    Description: "When Played: Other Friendly Animals gain +1 ATK.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BuffStats", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" }, BuffAtk: 1 }] },
    ],
  },

  {
    Id: 76,
    Name: "Black Hound",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "While in Play: Gain +1 ATK for each Animal You control.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ScaleAttack", Target: "Self", PerSubtype: "Animal", Side: "Friendly", Amount: 1 }] },
    ],
  },

  {
    Id: 77,
    Name: "Black Spider",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Sacrificed: Draw a Card from Your deck that costs 5 or more.",
    Effects: [
      { Trigger: "OnSacrificed",
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Amount: 1, Filter: { MinCost: 5 } }] },
    ],
  },

  {
    Id: 78,
    Name: "Cultist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Played: Gain a Sacrificial Dagger.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 902 }] },
    ],
  },

  {
    Id: 79,
    Name: "Shapeshifter",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Description: "When Played: Transform into the last Aberration You Played.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Transform", Target: "Self", IntoFrom: "LastPlayed", Filter: { Subtype: "Aberration" } }] },
    ],
  },

  {
    Id: 80,
    Name: "Cardweaver",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 1,
    Health: 2,
    Description: "While in Play: It gains ATK equal to the number of cards in Your Hand.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ScaleAttack", Target: "Self", Amount: 1, Per: "CardsInHand" }] },
    ],
  },

  {
    Id: 81,
    Name: "Double Tap",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Description: "Deals Double the Damage to the Enemy Hero.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ModifyDamage", Against: "EnemyHero", Multiplier: 2 }] },
    ],
  },

  {
    Id: 82,
    Name: "Mindstrucker",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 4,
    Attack: 2,
    Health: 3,
    Description: "When Played: Silence an Enemy Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Silence", Target: "TargetEnemyUnit" }] },
    ],
  },

  {
    Id: 83,
    Name: "Magpie",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 1,
    Health: 1,
    Keywords: ["Flying"],
    Description: "When Played: Choose a Card from Your Deck and add it to your hand.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "TutorCard", Target: "Self" },
          { Type: "ShuffleDeck", Target: "Self" },
        ] },
    ],
  },

  {
    Id: 84,
    Name: "Investor",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 1,
    Health: 4,
    Description: "Before Combat Here: Spend all Your Blood. Gain +1/+1 for each Blood Spent.",
    Effects: [
      { Trigger: "OnPreCombatLine",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: { Count: "Blood" }, BuffHp: { Count: "Blood" } },
          { Type: "SpendBlood", Target: "FriendlyHero" },
        ] },
    ],
  },

  {
    Id: 85,
    Name: "Knock-out",
    Type: "Spell",
    Cost: 3,
    Description: "Return a Unit to its owner's Hand. It costs 1 more.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "ReturnToHand", Target: "TargetEnemyUnit", CostChange: 1 }] },
    ],
  },

  {
    Id: 86,
    Name: "Disintegrade",
    Type: "Spell",
    Cost: 1,
    Description: "Destroy a Damaged Unit.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "DestroyUnit", Target: "TargetAnyUnit", Where: { Damaged: true } }] },
    ],
  },

  {
    Id: 87,
    Name: "Attentive Parent",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 4,
    Attack: 4,
    Health: 1,
    Description: "When Played: Summon a Random Aberration that costs 2 or less.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "MakeAUnit", Filter: { MaxCost: 2, Subtype: "Aberration" } }] },
    ],
  },

  {
    Id: 88,
    Name: "Fireplant",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 5,
    Attack: 2,
    Health: 4,
    Description: "When Played: Apply Burning to Each Enemy Unit. While in Play: Gain ATK equal to the Number of Burning Units on Board.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Burning" }] },
      { Trigger: "Passive",
        Actions: [{ Type: "ScaleAttack", Target: "Self", Per: "BurningUnits", Amount: 1 }] },
    ],
  },

  {
    Id: 89,
    Name: "Bloodblot",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Played: Spend all Your Blood. Gain +1/+1 for Each Blood Spent.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: { Count: "Blood" }, BuffHp: { Count: "Blood" } },
          { Type: "SpendBlood", Target: "FriendlyHero" },
        ] },
    ],
  },

  {
    Id: 90,
    Name: "Evolution",
    Type: "Spell",
    Cost: 1,
    Description: "Give a Friendly Unit Evolving.",
    Effects: [
      { Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Evolving" }] },
    ],
  },

  {
    Id: 91,
    Name: "Factoid Factory",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 1,
    Health: 4,
    Description: "End of Round: Summon an Artificer in a Lane of Your choosing.",
    Effects: [
      { Trigger: "OnEndOfRound",
        Actions: [{ Type: "MakeAUnit", ValueParam: 42 }] },
    ],
  },

  {
    Id: 92,
    Name: "Unitslinger",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 3,
    Health: 5,
    Description: "While in Play: When an Enemy Unit is Move, move it here. If it can't be Moved, deal 2 Damage to it instead.",
    Effects: [
      { Trigger: "OnEnemyUnitPlayed",
        Condition: { Condition: "Not", SubConditions: [{ Condition: "SameLane" }] },
        Actions: [{ Type: "MoveToSourceLane", Target: "EventUnit", Else: { Type: "DealDamage", Amount: 2, OncePerTurn: true } }] },
    ],
  },

  {
    Id: 93,
    Name: "Dual Wield",
    Type: "Spell",
    Cost: 2,
    Description: "The next Action you play is Played Twice. Conjure a Random Spell.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", Filter: { Type: "Spell", NotIds: [93] } },
          { Type: "PlayNextTwice", Target: "FriendlyHero" },
        ] },
    ],
  },

  {
    Id: 94,
    Name: "Imperial Dropship",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Description: "When Destroyed: Summon Mecha-Troopers in Adjacent Lanes.",
    Effects: [
      { Trigger: "OnDeath",
        Actions: [{ Type: "MakeAUnit", ValueParam: 912, StringParam: "AdjacentLanes" }] },
    ],
  },

  {
    Id: 95,
    Name: "One-Punch Man",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 1,
    Health: 3,
    Description: "While in Play: All Humans have Deadly.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Deadly", Where: { Subtype: "Human" } }] },
    ],
  },

  {
    Id: 96,
    Name: "Echo Chamber",
    Type: "Unit",
    Subtypes: ["Aberration", "Machine"],
    Cost: 6,
    Attack: 2,
    Health: 2,
    Description: "When Played: Do a \"When Played\" Effect of Each Card You played this game.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "ReplayPlayed", Target: "Self" }] },
    ],
  },

  {
    Id: 97,
    Name: "Cyborg",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Description: "While in Play: Adjacent Machines gain +1 ATK.",
    Effects: [
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "AuraBuff", Target: "AdjacentFriendlyUnits", Where: { Subtype: "Machine" }, BuffAtk: 1 }] },
    ],
  },

  {
    Id: 98,
    Name: "Door-Machine",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Keywords: ["Taunt", "Armored"],
    KeywordParams: { Armored: 1 },
    Description: "",
  },

  {
    Id: 99,
    Name: "Exhume",
    Type: "Spell",
    Cost: 3,
    Description: "Summon a Random Friendly Unit that costs 3 or less from Your Discard Pile.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "Reanimate", Filter: { MaxCost: 3 } }] },
    ],
  },

  {
    Id: 100,
    Name: "Alpha Wolf",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 7,
    Attack: 6,
    Health: 6,
    Description: "When Played: Other Friendly Animals do a Bonus Attack. While in Play: Whenever a Friendly Animal destroys an Enemy Unit, it gains that Unit's ATK.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BonusAttack", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" } }] },
      { Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "AbsorbAttackOnKill", Where: { Subtype: "Animal" } }] },
    ],
  },

  // ==================== NEW CARDS FROM XLSX ====================

  {
    Id: 101,
    Name: "Deadbeat",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 2,
    Health: 2,
    Description: "Before Combat Here: Deal 1 Damage to Your Hero.",
    Effects: [
      { Trigger: "OnPreCombatLine",
        Actions: [{ Type: "DealDamage", Target: "FriendlyHero", Amount: 1 }] },
    ],
  },

  {
    Id: 102,
    Name: "Re:Surgance",
    Type: "Spell",
    Cost: 2,
    Description: "A Unit gains +3 HP. Conjure a Random Unit of the same subtype.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "BuffStats", Target: "TargetFriendlyUnit", BuffHp: 3 },
          { Type: "AddCardToHand", Target: "FriendlyHero", FilterFrom: "TargetSubtype" },
        ] },
    ],
  },

  {
    Id: 103,
    Name: "4-inch Bot",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 1,
    Health: 3,
    Description: "When Played: Draw a Card. If the Card Drawn was a Machine, this gains +1 ATK.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "BuffStats", Target: "Self", BuffAtk: 1, OnlyIfDrawnSubtype: "Machine" },
        ] },
    ],
  },

  {
    Id: 104,
    Name: "Doormant Knight",
    Type: "Unit",
    Subtypes: ["Aberration", "Human"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "While in Play: Whenever an Enemy Unit gains stats, it and adjacent Enemy Units get -1 ATK.",
    Effects: [
      { Trigger: "OnEnemyUnitGainedStats",
        Actions: [{ Type: "BuffStats", Target: "EventUnitAndAdjacent", BuffAtk: -1 }] },
    ],
  },

  {
    Id: 105,
    Name: "Victory Feast",
    Type: "Spell",
    Cost: 4,
    Description: "All Friendly Units get +1/+1.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "BuffStats", Target: "AllFriendlyUnits", BuffAtk: 1, BuffHp: 1 }] },
    ],
  },

  {
    Id: 106,
    Name: "Gambler's Call",
    Type: "Spell",
    Cost: 5,
    Description: "Summon a Slot-Machine.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "MakeAUnit", ValueParam: 913 }] },
    ],
  },

  {
    Id: 107,
    Name: "The Lighter",
    Type: "Unit",
    Subtypes: ["Aberration", "Machine"],
    Cost: 5,
    Attack: 2,
    Health: 4,
    Description: "When Played: The Enemy Hero gains 2 Ashes from Clashes. When this Does Damage: Shuffle Ashes from Clashes to the Enemy's Hero deck.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{ Type: "AddCardToHand", Target: "EnemyHero", ValueParam: 914, Count: 2 }] },
      { Trigger: "OnDamagedEnemyUnit", Condition: { Condition: "IsSelf" },
        Actions: [{ Type: "AddCardToEnemyDeck", ValueParam: 914, Count: 1 }] },
      { Trigger: "OnDamagedEnemyHero", Condition: { Condition: "IsSelf" },
        Actions: [{ Type: "AddCardToEnemyDeck", ValueParam: 914, Count: 1 }] },
    ],
  },

  {
    Id: 108,
    Name: "Abyss Lector",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 7,
    Attack: 3,
    Health: 3,
    Description: "When Played: For Each 3 Points of Missing Health of Your Hero, Conjure a Random Blessing. They Cost 0 This Round.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [{
          Type: "AddCardToHand", Target: "FriendlyHero",
          Filter: { Ids: [915, 916, 917, 918, 919, 920, 921, 922, 923, 924], Token: true },
          Count: { Count: "MissingHealth", Div: 3, Max: 10 },
          FreeThisTurn: true,
        }] },
    ],
  },

  {
  Id: 109,
  Name: "The Amalgamation",
  Type: "Unit",
  Subtypes: ["Aberration"],
  Cost: 8,
  Attack: 6,
  Health: 6,
  Description: "When Hurt: Summon a Random Unit. When Played: Summon a Random Unit. While in Play: When You Summon a Unit, Conjure a random Unit. While in Play: All Units in Your Hand cost 1 less.",
  Effects: [
      { Trigger: "OnFriendlyUnitDamaged", Condition: { Condition: "IsSelf" },
      Actions: [{ Type: "MakeAUnit", Filter: { Type: "Unit", MaxCost: 4 } }] },

     { Trigger: "OnPlayed",
      Actions: [{ Type: "MakeAUnit", Filter: { Type: "Unit", MaxCost: 4 } }] },

     { Trigger: "OnPlayed", Zone: "Board",
      Condition: { Condition: "And", SubConditions: [
        { Condition: "IsFriendly" },
        { Condition: "Not", SubConditions: [{ Condition: "IsSelf" }] },
        { Condition: "NotFromHistory" },
      ] },
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero",
        Filter: { Type: "Unit", MaxCost: 4 } }] },

      { Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "ModifyCost", Side: "Friendly", Amount: -1, CardFilter: { Type: "Unit" } }] },
  ],
},

  {
    Id: 110,
    Name: "Morsel Mantis",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 4,
    Attack: 2,
    Health: 2,
    Description: "When Played: All Other Friendly Animals get +1/+1. Sacrifice: All Other Friendly Animals get +1/+1.",
    Effects: [
      { Trigger: "OnPlayed",
        Actions: [
          { Type: "BuffStats", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" }, BuffAtk: 1, BuffHp: 1 },
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
          { Type: "BuffStats", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" }, BuffAtk: 1, BuffHp: 1, OnlyIfSacrificed: true },
        ] },
    ],
  },

  // ==================== ORIGINAL TOKENS (unchanged) ====================

  {
    Id: 900, Name: "The Tempting Goblet", Type: "Spell", Subtypes: ["Token"], Cost: 1,
    Description: "Give a Friendly Unit Unkillable, then Sacrifice it.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Unkillable" },
        { Type: "SacrificeUnit", Target: "SelectedTarget" },
      ] }],
  },

  { Id: 901, Name: "Royal Souldier", Type: "Unit", Subtypes: ["Aberration", "Token"], Cost: 1, Attack: 1, Health: 1, Description: "" },

  {
    Id: 902, Name: "Sacrificial Dagger", Type: "Spell", Subtypes: ["Token"], Cost: 0,
    Description: "Sacrifice a Friendly Unit.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "SacrificeUnit", Target: "SelectedTarget" }] }],
  },

  {
    Id: 903, Name: "Trap", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 1, Attack: 0, Health: 1,
    Description: "When Destroyed: Stun the Enemy Unit opposite it.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "ApplyStatus", Target: "OppositeEnemyUnit", StatusKeyword: "Stunned" }] }],
  },

  {
    Id: 904, Name: "SE", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 3, Attack: 1, Health: 3,
    Keywords: ["Taunt"],
    Description: "While in Play: All Friendly Units have Armored 1.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Armored" }] }],
  },

  { Id: 905, Name: "Janal", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 3, Attack: 2, Health: 2, Keywords: ["Lifesteal"], Description: "" },

  {
    Id: 906, Name: "Front Man", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 3, Attack: 3, Health: 1,
    Description: "While in Play: All Friendly Units get +1 ATK.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "AuraBuff", Target: "AllFriendlyUnits", BuffAtk: 1 }] }],
  },

  {
    Id: 907, Name: "Brother", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 1, Attack: 1, Health: 1,
    Description: "When Destroyed: Gain a Solid Iron Claw.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 910 }] }],
  },

  { Id: 908, Name: "Sister", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 1, Health: 4, Keywords: ["Lifesteal"], Description: "" },

  {
    Id: 909, Name: "The Titan", Type: "Unit", Subtypes: ["Token", "Machine"], Cost: 5, Attack: 10, Health: 20,
    Keywords: ["Taunt", "Unactionable", "SilenceImmune", "BounceImmune"],
    Description: "",
  },

  {
    Id: 910, Name: "Solid Iron Claw", Type: "Spell", Subtypes: ["Machine", "Token"], Cost: 1,
    Description: "A Friendly Unit gets +2/+2.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 2 }] }],
  },

  {
    Id: 911, Name: "Iron Claw", Type: "Spell", Subtypes: ["Machine", "Token"], Cost: 1,
    Description: "A Friendly Unit gets +2 ATK.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 0 }] }],
  },

  { Id: 912, Name: "Stormtrooper", Type: "Unit", Subtypes: ["Human", "Token"], Cost: 2, Attack: 2, Health: 2, Description: "" },

  // ==================== NEW TOKENS ====================

  {
    Id: 913, Name: "Slot-Machine", Type: "Unit", Subtypes: ["Machine", "Token"],
    Cost: 3, Attack: 2, Health: 5,
    Description: "When Hurt: Conjure a random Machine. It costs 1 less.",
    Effects: [{ Trigger: "OnFriendlyUnitDamaged", Condition: { Condition: "IsSelf" },
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero",
        Filter: { Type: "Unit", Subtype: "Machine" }, CostChange: -1 }] }],
  },

  {
    Id: 914, Name: "Ashes from Clashes", Type: "Spell", Subtypes: ["Token"],
    Cost: 1,
    Description: "Deal 1 Damage to a Friendly Unit or Friendly Hero. Start of Round: If this is in your Hand, gain Ashes from Clashes.",
    Effects: [
      { Trigger: "OnPlayed", Targeting: "Choice",
        ChoiceLabels: ["Target Friendly Unit", "Friendly Hero"],
        Actions: [
          { Type: "DealDamage", Target: "TargetFriendlyUnit", Amount: 1 },
          { Type: "DealDamage", Target: "FriendlyHero", Amount: 1 },
        ] },
      { Trigger: "OnStartOfRound", Zone: "Hand",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 914 }] },
    ],
  },

  {
    Id: 915, Name: "Blessing of Might", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Give a Friendly Unit +3/+3.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 3, BuffHp: 3 }] }],
  },
  {
    Id: 916, Name: "Blessing of Warding", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Give a Friendly Unit Soul Guard.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "SoulGuard" }] }],
  },
  {
    Id: 917, Name: "Blessing of Mending", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Heal Your Hero for 5.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "Heal", Target: "FriendlyHero", Amount: 5 }] }],
  },
  {
    Id: 918, Name: "Blessing of Wisdom", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Draw 2 cards.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Amount: 2 }] }],
  },
  {
    Id: 919, Name: "Blessing of Vengeance", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Deal 3 Damage to an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 }] }],
  },
  {
    Id: 920, Name: "Blessing of Silence", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Silence an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "Silence", Target: "TargetEnemyUnit" }] }],
  },
  {
    Id: 921, Name: "Blessing of Fortune", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Add a random card to Your Hand. It costs 0 this turn.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", FreeThisTurn: true }] }],
  },
  {
    Id: 922, Name: "Blessing of Renewal", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Return a Friendly Unit to Your Hand. It costs 1 less.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget", CostChange: -1 }] }],
  },
  {
    Id: 923, Name: "Blessing of Fury", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "All Friendly Units get +1 ATK.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BuffStats", Target: "AllFriendlyUnits", BuffAtk: 1 }] }],
  },
  {
    Id: 924, Name: "Blessing of Fortitude", Type: "Spell", Subtypes: ["Token"], Cost: 3,
    Description: "Your Hero gains +3 Max HP and heals 3.",
    Effects: [{ Trigger: "OnPlayed", Actions: [
      { Type: "IncreaseMaxHp", Target: "FriendlyHero", Amount: 3 },
      { Type: "Heal", Target: "FriendlyHero", Amount: 3 },
    ] }],
  },

];

(function(){
  var on = false;
  try { on = localStorage.getItem('rj_exp') === '1'; } catch(e) {}
  window.RJ_EXP = on;
  if (!on) return;
  CARDS.length = 0;
  CARDS_EXP.forEach(function(c){ CARDS.push(c); });
})();