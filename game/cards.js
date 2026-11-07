const CARDS = [
  {
    Id: 1,
    Name: "Black Rabbitlings",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Destroyed: Heal Your Hero for 3.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "Heal", Target: "FriendlyHero", Amount: 3 },
        ],
      },
    ],
  },

  {
    Id: 2,
    Name: "BoomBot",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Destroyed: Deal 2 damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 3,
    Name: "Bone Baronet",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Destroyed: Gain The Tempting Goblet.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 900 },
        ],
      },
    ],
  },

  {
    Id: 4,
    Name: "Scout",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Played: Mark an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" },
        ],
      },
    ],
  },

  {
    Id: 5,
    Name: "Queen of Cards",
    Type: "Unit",
    Subtypes: ["Aberration", "Animal"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description: "While in Play: Draw a card whenever a Friendly Unit is Destroyed.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 6,
    Name: "The Jersey Demon",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Description: "When Played: All Friendly Units get +1/+1 for the rest of the game.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ModifyGlobalBuff", Target: "FriendlyHero", BuffAtk: 1, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 7,
    Name: "Glock-17",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 3 damage to an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 },
        ],
      },
    ],
  },

  {
    Id: 8,
    Name: "Clockwork Knight",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
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
    Description: "While in Hand: Whenever a Friendly Unit is Destroyed, Play this in its lane.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Zone: "Hand",
        Actions: [
          { Type: "SummonUnit", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 10,
    Name: "Polar Bear",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "When Played: You may Sacrifice a Friendly Unit to gain its stats.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "OtherFriendlyUnits",
        Actions: [
          { Type: "AbsorbStats", Target: "SelectedTarget" },
          { Type: "SacrificeUnit", Target: "SelectedTarget", Optional: true },
        ],
      },
    ],
  },

  {
    Id: 11,
    Name: "The Creature",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 9,
    Attack: 7,
    Health: 7,
    Keywords: ["Unkillable"],
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Costs 1 less whenever You Sacrifice a Unit.",
    DescriptionClassic: "While in Hand: Costs 1 less whenever You Sacrifice a Unit.",
    Effects: [
      {
        Trigger: "OnOtherUnitSacrificed",
        Zone: ["Deck", "Hand", "Discard"],
        ZoneClassic: "Hand",
        Actions: [
          { Type: "BuffStats", Target: "Self", Amount: -1 },
        ],
      },
    ],
  },

  {
    Id: 12,
    Name: "Black Cat",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 0,
    Attack: 0,
    Health: 1,
    Description: "When Sacrificed: Return to Your Hand instead.",
    Effects: [
      {
        Trigger: "OnSacrificed",
        Zone: "Board",
        Actions: [
          { Type: "ReturnToHand", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 13,
    Name: "Seek",
    Type: "Spell",
    Cost: 1,
    Description: "Choose a card from Your Deck and add it to Your Hand, then shuffle.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "TutorCard", Target: "Self" },
          { Type: "ShuffleDeck", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 14,
    Name: "Survivalist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 2,
    Health: 3,
    Keywords: ["SoulGuard"],
    Description: "While in Play: Other Friendly Units have SoulGuard.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ApplyStatus", Target: "OtherFriendlyUnits", StatusKeyword: "SoulGuard" },
        ],
      },
    ],
  },

  {
    Id: 15,
    Name: "Expectancy",
    Type: "Spell",
    Cost: 2,
    Description: "Draw a card from Your Deck or Discard. At the start of next round, draw another from the same place.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "Choice",
        ChoiceLabels: ["Draw from Deck", "Draw from Discard"],
        Actions: [
          { Type: "DrawCard", Amount: 1, Target: "FriendlyHero", Later: true },
          { Type: "DrawFromDiscard", Amount: 1, Target: "FriendlyHero", Later: true },
        ],
      },
    ],
  },

  {
    Id: 16,
    Name: "HellFire",
    Type: "Spell",
    Cost: 4,
    Description: "Deal 2 damage and apply Burning to all Units.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ApplyStatus", Target: "AllUnitsOnBoard", StatusKeyword: "Burning" },
          { Type: "DealDamage", Target: "AllUnitsOnBoard", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 17,
    Name: "Magician",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Keywords: ["SplashDamage", "BurnSource"],
    KeywordParams: { SplashDamage: 3 },
    Description: "Whenever this damages an Enemy Unit: Apply Burning to it.",
  },

  {
    Id: 18,
    Name: "Final Mission",
    Type: "Spell",
    Cost: 1,
    Description: "Sacrifice a Friendly Unit. Deal 4 damage to an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit" },
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 4 },
        ],
      },
    ],
  },

  {
    Id: 19,
    Name: "Lunch",
    Type: "Spell",
    Cost: 2,
    Description: "A Friendly Unit does a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BonusAttack", Target: "TargetFriendlyUnit" },
        ],
      },
    ],
  },

  {
    Id: 20,
    Name: "Genie",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 3,
    Health: 4,
    Description: "When Played: Bounce a Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "SelectedTarget",
        Actions: [
          { Type: "ReturnToHand", Target: "SelectedTarget" },
        ],
      },
    ],
  },

  {
    Id: 21,
    Name: "Juggernaut",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 4,
    Health: 2,
    Keywords: ["Armored"],
    KeywordParams: { Armored: 2 },
    Description: "Whenever this damages an Enemy Unit: Deal 2 damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 22,
    Name: "QuickDraw Gun Man",
    Type: "Unit",
    Subtypes: ["Aberration", "Human"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "Whenever an Enemy Unit is Played in this lane: Deal 2 damage to it.",
    Effects: [
      {
        Trigger: "OnEnemyUnitPlayed",
        Condition: { Condition: "SameLane" },
        Actions: [
          { Type: "DealDamage", Target: "EventUnit", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 23,
    Name: "Chainsaw Guy",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 4,
    Attack: 4,
    Health: 4,
    Keywords: ["SilenceImmune"],
    Description: "On Kill: Heal to full and gain +2 HP.",
    Effects: [
      {
        Trigger: "OnKill",
        Actions: [
          { Type: "HealToFull", Target: "Self" },
          { Type: "BuffStats", Target: "Self", BuffHp: 2 },
        ],
      },
    ],
  },

  {
    Id: 24,
    Name: "Gerard from Rivia",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 5,
    Health: 5,
    Description: "Whenever an Enemy Unit is Marked: Do a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnStatusApplied",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsStatus", TargetParam: "Marked" },
            { Condition: "IsEnemy" },
          ],
        },
        Actions: [
          { Type: "BonusAttack", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 25,
    Name: "Bounty Hunter",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 3,
    Health: 3,
    Description: "Whenever an Enemy Unit is Marked: Stun it.",
    Effects: [
      {
        Trigger: "OnStatusApplied",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsStatus", TargetParam: "Marked" },
            { Condition: "IsEnemy" },
          ],
        },
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 26,
    Name: "Occultist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "Before Combat Here: Mark an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" },
        ],
      },
    ],
  },

  {
    Id: 27,
    Name: "Drawing Raptor",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description: "While in Play: Gain +1 ATK whenever You draw a card. Whenever this damages the Enemy Hero: Draw a card.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSelf" },
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
      {
        Trigger: "OnFriendlyCardDrawn",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 1 },
        ],
      },
    ],
  },

  {
    Id: 28,
    Name: "Exploding Present",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 7 damage to an Enemy Unit. The Enemy Hero gains a copy of this card that costs 1 more.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 7 },
          { Type: "GiveToOpponent", Target: "Self", CostChange: 1 },
        ],
      },
    ],
  },

  {
    Id: 29,
    Name: "Blighteinstein",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 5,
    Attack: 5,
    Health: 6,
    Description: "On Kill: Move Right. If an Enemy Unit is in that lane, do a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnKill",
        Actions: [
          { Type: "MoveRight", Target: "Self", ThenAttack: true },
        ],
      },
    ],
  },

  {
    Id: 30,
    Name: "SharkCannon",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 0,
    Health: 7,
    Description: "Before Combat Here: Deal 4 damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 4 },
        ],
      },
    ],
  },

  {
    Id: 31,
    Name: "Silence",
    Type: "Spell",
    Cost: 1,
    Description: "Silence a Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Silence", Target: "TargetAnyUnit" },
        ],
      },
    ],
  },

  {
    Id: 32,
    Name: "Marked for Death",
    Type: "Spell",
    Cost: 1,
    Description: "Mark an Enemy Unit and draw a card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" },
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 33,
    Name: "Mouse",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 6,
    Health: 6,
    Keywords: ["Stunned"],
    Description: "Whenever this damages an Enemy: Stun this Unit.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" },
        ],
      },
      {
        Trigger: "OnDamagedEnemyHero",
        Actions: [
          { Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 34,
    Name: "Maid Mask",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 3,
    Health: 1,
    Description: "On Kill: Gain SoulGuard.",
    Effects: [
      {
        Trigger: "OnKill",
        Actions: [
          { Type: "ApplyStatus", Target: "Self", StatusKeyword: "SoulGuard" },
        ],
      },
    ],
  },

  {
    Id: 35,
    Name: "Cathullu Captain",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "Whenever a Friendly Aberration damages the Enemy Hero: It gets +1/+1.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSubtype", TargetParam: "Aberration" },
        Actions: [
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 36,
    Name: "Death",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Keywords: ["SoulGuard"],
    Rule: "hpOneTrigger",
    Description: "Whenever a Friendly Unit is Destroyed or drops to 1 HP: Deal 2 damage to the Enemy Hero.",
    DescriptionClassic: "Whenever a Friendly Unit is Destroyed: Deal 2 damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 2 },
        ],
      },
      {
        // New: also fires when a friendly unit's HP becomes 1 (damage, or a Soul Guard breaking).
        // Turn off with RULES.hpOneTrigger = false in engine.js.
        Trigger: "OnFriendlyUnitHpOne",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 37,
    Name: "Archer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 1,
    Health: 4,
    Description: "Before Combat Here: Apply Burning to an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Burning" },
        ],
      },
    ],
  },

  {
    Id: 38,
    Name: "Inhuman Torch",
    Type: "Unit",
    Subtypes: ["Aberration", "Human"],
    Cost: 1,
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
    Cost: 1,
    Attack: 2,
    Health: 1,
    Description: "When Played: Both Heroes draw a card. You may Sacrifice a Friendly Unit to draw another.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "SacrificeUnit", Target: "SelectedTarget", Optional: true },
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "DrawCard", Target: "EnemyHero", Amount: 1 },
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1, OnlyIfSacrificed: true },
        ],
      },
    ],
  },

  {
    Id: 40,
    Name: "Widows Spider",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 3,
    Health: 3,
    Description: "While in Play: Whenever an Enemy Unit damages a Friendly Animal, Stun it.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDamaged",
        Condition: { Condition: "IsSubtype", TargetParam: "Animal" },
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 41,
    Name: "Pegasus",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 3,
    Attack: 3,
    Health: 2,
    Keywords: ["Flying"],
    Description: "When Played: Do a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BonusAttack", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 42,
    Name: "Mechanic",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Played: If You control a Machine, gain +2/+2.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Condition: { Condition: "HasSubtypeOnBoard", TargetParam: "Machine" },
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 2, BuffHp: 2 },
        ],
      },
    ],
  },

  {
    Id: 43,
    Name: "Royal Ghost",
    Type: "Unit",
    Subtypes: ["Aberration", "Machine"],
    Cost: 3,
    Attack: 3,
    Health: 2,
    Keywords: ["Unactionable"],
    Description: "After this Attacks: Summon Royal Souldiers in the adjacent lanes.",
    Effects: [
      {
        Trigger: "OnAttackDone",
        Actions: [
          { Type: "MakeAUnit", ValueParam: 901, StringParam: "AdjacentLanes" },
        ],
      },
    ],
  },

  {
    Id: 44,
    Name: "Area Drone",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
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
    Description: "Deal 2 damage to an Enemy Unit or the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "Choice",
        ChoiceLabels: ["Target Enemy Unit", "Enemy Hero"],
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 },
          { Type: "DealDamage", Target: "EnemyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 46,
    Name: "Tea Maid",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Description: "While in Play: Your Spells cost 1 less.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "BuffStats", Target: "FriendlySpellsInHand", Amount: -1 },
        ],
      },
    ],
  },

  {
    Id: 47,
    Name: "Rustler",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 10,
    Attack: 6,
    Health: 6,
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Costs 1 less for each Spell You play. When Played: Do a Bonus Attack.",
    DescriptionClassic: "While in Hand: Costs 1 less for each Spell You play. When Played: Do a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BonusAttack", Target: "Self" },
        ],
      },
      {
        Trigger: "OnFriendlyActionPlayed",
        Zone: ["Deck", "Hand", "Discard"],
        ZoneClassic: "Hand",
        Actions: [
          { Type: "BuffStats", Target: "Self", Amount: -1 },
        ],
      },
    ],
  },

  {
    Id: 48,
    Name: "Butcher of Gluttony",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "Whenever You Sacrifice a Unit: Gain +1/+1, or +2/+2 if it was a Human.",
    Effects: [
      {
        Trigger: "OnOtherUnitSacrificed",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 },
        ],
      },
      {
        Trigger: "OnOtherUnitSacrificed",
        Condition: { Condition: "IsSubtype", TargetParam: "Human" },
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 49,
    Name: "Farewell",
    Type: "Spell",
    Cost: 4,
    Description: "Destroy an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DestroyUnit", Target: "TargetEnemyUnit" },
        ],
      },
    ],
  },

  {
    Id: 50,
    Name: "Magic Touch",
    Type: "Spell",
    Cost: 1,
    Description: "A Friendly Unit gets +1/+3.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 3 },
        ],
      },
    ],
  },

  {
    Id: 51,
    Name: "Trapper",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "When Played: Gain a Trap that costs 0 this turn.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 903, FreeThisTurn: true },
        ],
      },
    ],
  },

  {
    Id: 52,
    Name: "Adaptive Unit",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "Whenever You play another Machine: Gain +1/+1.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Condition: {
          Condition: "And",
          SubConditions: [
            { Condition: "IsFriendly" },
            { Condition: "IsSubtype", TargetParam: "Machine" },
            {
              Condition: "Not",
              SubConditions: [
                { Condition: "IsSelf" },
              ],
            },
          ],
        },
        Zone: "Board",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 53,
    Name: "The Curtain Call",
    Type: "Spell",
    Cost: 6,
    Description: "For the rest of the game, Marking a Marked Unit Destroys it. Mark all Enemy Units, then deal 1 damage to them.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "GrantRule", Rule: "mk" },
          { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Marked" },
          { Type: "DealDamage", Target: "AllEnemyUnits", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 54,
    Name: "Thor",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 0,
    Health: 5,
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Gain +1 ATK whenever a Friendly Machine is Destroyed.",
    DescriptionClassic: "While in Hand: Gain +3 ATK whenever a Friendly Machine is Destroyed.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Zone: ["Deck", "Hand", "Discard"],
        ZoneClassic: "Hand",
        Condition: { Condition: "IsSubtype", TargetParam: "Machine" },
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: 1 },
        ],
      },
    ],
  },

  {
    Id: 55,
    Name: "ZaUm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 6,
    Attack: 5,
    Health: 4,
    Keywords: ["Unactionable", "Armored"],
    KeywordParams: { Armored: 3 },
    Description: "While in Play: Other Friendly Machines get +2 ATK.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "AuraBuff", Target: "OtherFriendlyUnits", Where: { Subtype: "Machine" }, BuffAtk: 2 },
        ],
      },
    ],
  },

  {
    Id: 56,
    Name: "Collector",
    TokenGroup: "The Collection",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 7,
    Attack: 3,
    Health: 7,
    Description: "When Played: Summon The Collection.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "MakeAUnit", ValueParam: 904 },
          { Type: "MakeAUnit", ValueParam: 905 },
          { Type: "MakeAUnit", ValueParam: 906 },
        ],
      },
    ],
  },

  {
    Id: 57,
    Name: "The Pale",
    Type: "Spell",
    Cost: 3,
    Description: "Silence all Units.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Silence", Target: "AllUnitsOnBoard" },
        ],
      },
    ],
  },

  {
    Id: 58,
    Name: "Excision Conjucture",
    Type: "Spell",
    Cost: 4,
    Description: "All Enemy Units get -2 ATK.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "AllEnemyUnits",
        Actions: [
          { Type: "BuffStats", Target: "AllEnemyUnits", BuffAtk: -2, BuffHp: 0 },
        ],
      },
    ],
  },

  {
    Id: 59,
    Name: "Gargoyle",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 2,
    Health: 1,
    Keywords: ["Flying"],
    Description: "",
  },

  {
    Id: 60,
    Name: "Wyvern",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 8,
    Attack: 6,
    Health: 6,
    Keywords: ["SplashDamage"],
    KeywordParams: { SplashDamage: 6 },
    Description: "While in Play: Enemy Spells cost 6 more.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "BuffStats", Target: "EnemySpellsInHand", Amount: 6 },
        ],
      },
    ],
  },

  {
    Id: 63,
    Name: "Uncle Menel",
    Type: "Unit",
    Subtypes: ["Human", "Animal"],
    Cost: 1,
    Attack: 2,
    Health: 1,
    Description: "When Played: You may Sacrifice a Friendly Unit to deal 2 damage to an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2, OnlyIfSacrificed: true },
        ],
      },
    ],
  },

  {
    Id: 64,
    Name: "Black Dog",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 0,
    Health: 4,
    Description: "When Sacrificed: Gain 2 Blood this turn.",
    Effects: [
      {
        Trigger: "OnSacrificed",
        Actions: [
          { Type: "AddResource", Target: "FriendlyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 65,
    Name: "Ritualist",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 1,
    Health: 4,
    Description: "Whenever You Sacrifice a Unit: Draw a card and Heal Your Hero for 1.",
    Effects: [
      {
        Trigger: "OnOtherUnitSacrificed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "Heal", Target: "FriendlyHero", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 66,
    Name: "Bouncer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "Whenever this damages an Enemy Unit: Bounce it.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [
          { Type: "ReturnToHand", Target: "SelectedTarget", IfAlive: true },
        ],
      },
    ],
  },

  {
    Id: 67,
    Name: "Aura",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description: "When Played: Heal Your Hero and all Friendly Units for 2.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Heal", Target: "FriendlyHero", Amount: 2 },
          { Type: "Heal", Target: "AllFriendlyUnits", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 68,
    Name: "Angel Bird",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Keywords: ["Flying"],
    Description: "When Played: You may Sacrifice any number of Friendly Units to gain their stats.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnits", Target: "OtherFriendlyUnits", Absorb: true },
        ],
      },
    ],
  },

  {
    Id: 69,
    Name: "Evo Neighbour",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 5,
    Attack: 2,
    Health: 5,
    Keywords: ["Breakthrough"],
    Description: "After Combat Here: Do a Bonus Attack. Whenever this damages a Unit: Bounce it.",
    Effects: [
      {
        Trigger: "OnPostCombatLine",
        Actions: [
          { Type: "BonusAttack", Target: "Self" },
        ],
      },
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [
          { Type: "ReturnToHand", Target: "SelectedTarget", IfAlive: true },
        ],
      },
    ],
  },

  {
    Id: 900,
    Name: "The Tempting Goblet",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 1,
    Description: "Give a Friendly Unit Unkillable, then Sacrifice it.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Unkillable" },
          { Type: "SacrificeUnit", Target: "SelectedTarget" },
        ],
      },
    ],
  },

  {
    Id: 901,
    Name: "Royal Souldier",
    Type: "Unit",
    Subtypes: ["Aberration", "Token"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "",
  },

  {
    Id: 902,
    Name: "Sacrificial Dagger",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 0,
    Description: "Sacrifice a Friendly Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "SacrificeUnit", Target: "SelectedTarget" },
        ],
      },
    ],
  },

  {
    Id: 903,
    Name: "Trap",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Attack: 0,
    Health: 1,
    Description: "When Destroyed: Stun the Enemy Unit opposite it.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "ApplyStatus", Target: "OppositeEnemyUnit", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 904,
    Name: "SE",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 3,
    Attack: 1,
    Health: 3,
    Keywords: ["Taunt"],
    Description: "While in Play: All Friendly Units have Armored 1.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Armored" },
        ],
      },
    ],
  },

  {
    Id: 905,
    Name: "Janal",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Keywords: ["Lifesteal"],
    Description: "",
  },

  {
    Id: 906,
    Name: "Front Man",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 3,
    Attack: 3,
    Health: 1,
    Description: "While in Play: All Friendly Units get +1 ATK.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "AuraBuff", Target: "AllFriendlyUnits", BuffAtk: 1 },
        ],
      },
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
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 911 },
        ],
      },
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Transform", Target: "Self", Into: 907, Partner: 62, PartnerInto: 908 },
        ],
      },
    ],
  },

  {
    Id: 62,
    Name: "Therapist",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 1,
    Health: 4,
    Description: "When Played: Fully heal a Friendly Unit. If You control another Machine, it also gets +0/+2.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "HealToFull", Target: "TargetFriendlyUnit" },
          { Type: "BuffStats", Target: "TargetFriendlyUnit", BuffHp: 2, Condition: { Condition: "HasSubtypeOnBoard", TargetParam: "Machine" } },
        ],
      },
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Transform", Target: "Self", Into: 908, Partner: 61, PartnerInto: 907 },
        ],
      },
    ],
  },

  {
    Id: 907,
    Name: "Brother",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Attack: 1,
    Health: 1,
    Description: "When Destroyed: Gain a Solid Iron Claw.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 910 },
        ],
      },
    ],
  },

  {
    Id: 908,
    Name: "Sister",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 2,
    Attack: 2,
    Health: 5,
    Keywords: ["Lifesteal"],
    Description: "",
  },

  {
    Id: 74,
    Name: "Undrawn",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 1,
    Health: 5,
    Description: "While in Play: Whenever the Enemy Hero gains a card, deal 1 damage to them.",
    Effects: [
      {
        Trigger: "OnOpponentCardGained",
        Actions: [
          { Type: "DealDamage", Target: "EnemyHero", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 75,
    Name: "Morsel",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Played: Other Friendly Animals gain +1 HP.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BuffStats", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" }, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 76,
    Name: "Black Hound",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "While in Play: Gains +1 ATK for each other Friendly Animal.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ScaleAttack", Target: "Self", PerSubtype: "Animal", Side: "Friendly", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 77,
    Name: "Black Widow Spider",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 2,
    Health: 1,
    Description: "When Sacrificed: Draw a card that costs 5 or more from Your Deck.",
    Effects: [
      {
        Trigger: "OnSacrificed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1, Filter: { MinCost: 5 } },
        ],
      },
    ],
  },

  {
    Id: 78,
    Name: "Acolyte",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Played: Gain a Sacrificial Dagger.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 902 },
        ],
      },
    ],
  },

  {
    Id: 79,
    Name: "Shapeshifter",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 1,
    Health: 1,
    Description: "When Played: Transform into the last Aberration You played.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Transform", Target: "Self", IntoFrom: "LastPlayed", Filter: { Subtype: "Aberration" } },
        ],
      },
    ],
  },

  {
    Id: 80,
    Name: "Cardweaver",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 0,
    Health: 3,
    Description: "While in Play: ATK equals the number of cards in Your Hand.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ScaleAttack", Target: "Self", Amount: 1, Per: "CardsInHand" },
        ],
      },
    ],
  },

  {
    Id: 81,
    Name: "Double Tap",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "Deals double damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ModifyDamage", Against: "EnemyHero", Multiplier: 2 },
        ],
      },
    ],
  },

  {
    Id: 82,
    Name: "Librarian",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "When Played: Silence an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Silence", Target: "TargetEnemyUnit" },
        ],
      },
    ],
  },

  {
    Id: 83,
    Name: "Magpie",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 2,
    Attack: 1,
    Health: 2,
    Keywords: ["Flying"],
    Description: "When Played: Choose a card from Your Deck and add it to Your Hand, then shuffle.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "TutorCard", Target: "Self" },
          { Type: "ShuffleDeck", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 84,
    Name: "Investor",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 1,
    Health: 4,
    Description: "Before Combat Here: Spend all Your Blood. Gain +1/+1 for each Blood spent.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: { Count: "Blood" }, BuffHP: { Count: "Blood" }},
 	  { Type: "SpendBlood", Target: "FriendlyHero" },

        ],
      },
    ],
  },

  {
    Id: 85,
    Name: "Stunning Blow",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 2 damage to an Enemy Unit and Stun it.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 },
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 86,
    Name: "Disintergrade",
    Type: "Spell",
    Cost: 1,
    Description: "Destroy a Damaged Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DestroyUnit", Target: "TargetAnyUnit", Where: { Damaged: true } },
        ],
      },
    ],
  },

  {
    Id: 87,
    Name: "Attentive Parent",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 3,
    Attack: 4,
    Health: 1,
    Description: "When Played: Summon a random Aberration that costs 1 or less.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "MakeAUnit", Filter: { MaxCost: 1, Subtype: "Aberration" } },
        ],
      },
    ],
  },

  {
    Id: 88,
    Name: "FireGirl",
    Type: "Unit",
    Subtypes: ["Animal", "Human"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Description: "When Played: Apply Burning to all Enemy Units. While in Play: Gains +1 ATK for each Burning Unit on the board.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Burning" },
        ],
      },
      {
        Trigger: "Passive",
        Actions: [
          { Type: "ScaleAttack", Target: "Self", Per: "BurningUnits", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 89,
    Name: "Bloodblob",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Played: Spend all Your Blood. Gain +1/+1 for each Blood spent.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BuffStats", Target: "Self", BuffAtk: { Count: "Blood" }, BuffHp: { Count: "Blood" } },
          { Type: "SpendBlood", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 90,
    Name: "Evolution",
    Type: "Spell",
    Cost: 0,
    Description: "Give a Friendly Unit Evolving.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Evolving" },
        ],
      },
    ],
  },

  {
    Id: 91,
    Name: "Factory",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 3,
    Description: "End of Round: Summon a Mechanic.",
    Effects: [
      {
        Trigger: "OnEndOfRound",
        Actions: [
          { Type: "MakeAUnit", ValueParam: 42 },
        ],
      },
    ],
  },

  {
    Id: 92,
    Name: "Unitslinger",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description: "While in Play: Whenever an Enemy Unit is Played in another lane, Move it here. If it can't move, deal 2 damage to it instead.",
    Effects: [
      {
        Trigger: "OnEnemyUnitPlayed",
        Condition: { Condition: "Not", SubConditions: [{ Condition: "SameLane" }] },
        Actions: [
          { Type: "MoveToSourceLane", Target: "EventUnit", Else: { Type: "DealDamage", Amount: 2 } },
        ],
      },
    ],
  },

  {
    Id: 93,
    Name: "Dual Wield",
    Type: "Spell",
    Cost: 2,
    Description: "Your next Spell is played twice.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "PlayNextTwice", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 94,
    Name: "Imperial Dropship",
    Type: "Unit",
    Subtypes: ["Machine", "Animal"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Keywords: ["Flying"],
    Description: "When Destroyed: Summon Stormtroopers in the adjacent lanes.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "MakeAUnit", ValueParam: 912, StringParam: "AdjacentLanes" },
        ],
      },
    ],
  },

  {
    Id: 95,
    Name: "One-Punch Man",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "While in Play: Friendly Humans have Deadly.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Deadly", Where: { Subtype: "Human" } },
        ],
      },
    ],
  },

  {
    Id: 96,
    Name: "Echo Chamber",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 4,
    Attack: 2,
    Health: 2,
    Description: "When Played: Trigger every \"When Played\" effect of the cards You have played this game.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "ReplayPlayed", Target: "Self" },
        ],
      },
    ],
  },

  {
    Id: 97,
    Name: "Cyborg",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "While in Play: Adjacent Machines get +1 ATK.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "AuraBuff", Target: "AdjacentFriendlyUnits", Where: { Subtype: "Machine" }, BuffAtk: 1 },
        ],
      },
    ],
  },


  {
    Id: 98,
    Name: "Doorman",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Keywords: ["Taunt", "Armored"],
    Description: "",
  },

  {
    Id: 99,
    Name: "Exhume",
    Type: "Spell",
    Cost: 2,
    Description: "Summon a random Friendly Unit that costs 3 or less from Your Discard.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Reanimate", Filter: { MaxCost: 3 } },
        ],
      },
    ],
  },

  {
    Id: 100,
    Name: "Alpha Wolf",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 6,
    Attack: 6,
    Health: 6,
    Description: "When Played: Other Friendly Animals do a Bonus Attack. While in Play: Whenever a Friendly Animal destroys an Enemy Unit, it gains that Unit's ATK.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BonusAttack", Target: "OtherFriendlyUnits", Where: { Subtype: "Animal" } },
        ],
      },
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "AbsorbAttackOnKill", Where: { Subtype: "Animal" } },
        ],
      },
    ],
  },


  {
    Id: 70,
    Name: "Titan Head",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 3,
    Health: 7,
    Keywords: ["Unactionable"],
    Description: "When Played: If You control all 4 Titan Pieces, Merge them into The Titan. When Destroyed: Draw a random Titan Piece from Your Deck.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 },
        ],
      },
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } },
        ],
      },
    ],
  },

  {
    Id: 71,
    Name: "Titan Torso",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 5,
    Keywords: ["Unactionable"],
    Description: "When Played: If You control all 4 Titan Pieces, Merge them into The Titan. When Destroyed: Draw a random Titan Piece from Your Deck.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 },
        ],
      },
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } },
        ],
      },
    ],
  },

  {
    Id: 72,
    Name: "Titan Left Arm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 2,
    Health: 1,
    Keywords: ["Unactionable"],
    Description: "When Played: If You control all 4 Titan Pieces, Merge them into The Titan. When Destroyed: Draw a random Titan Piece from Your Deck.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 },
        ],
      },
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } },
        ],
      },
    ],
  },

  {
    Id: 73,
    Name: "Titan Right Arm",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Keywords: ["Unactionable"],
    Description: "When Played: If You control all 4 Titan Pieces, Merge them into The Titan. When Destroyed: Draw a random Titan Piece from Your Deck.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Merge", Target: "Self", Pieces: [70, 71, 72, 73], Into: 909, At: 71, SumStats: true, AddAtk: 1, AddHp: 1 },
        ],
      },
      {
        Trigger: "OnDeath",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Filter: { Ids: [70, 71, 72, 73], NotOnBoard: true } },
        ],
      },
    ],
  },

  {
    Id: 909,
    Name: "The Titan",
    Type: "Unit",
    Subtypes: ["Token", "Machine"],
    Cost: 5,
    Attack: 10,
    Health: 20,
    Keywords: ["Taunt", "Unactionable", "SilenceImmune", "BounceImmune"],
    Description: "",
  },

  {
    Id: 912,
    Name: "Stormtrooper",
    Type: "Unit",
    Subtypes: ["Human", "Token"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Description: "",
  },

  {
    Id: 911,
    Name: "Iron Claw",
    Type: "Spell",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Description: "A Friendly Unit gets +2 ATK.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 0 },
        ],
      },
    ],
  },

  {
    Id: 910,
    Name: "Solid Iron Claw",
    Type: "Spell",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Description: "A Friendly Unit gets +2/+2.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 2 },
        ],
      },
    ],
  },
];
