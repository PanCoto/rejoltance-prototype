const CARDS_EXP = [
  {
    Id: 12,
    Name: "Black Cat",
    Type: "Unit",
    Subtypes: ["Animal"],
    Cost: 0,
    Attack: 1,
    Health: 1,
    Description: "When Sacrificed: Return to Your Hand instead.",
    Effects: [
      {
        Trigger: "OnSacrificed",
        Zone: "Board",
        Actions: [{ Type: "ReturnToHand", Target: "Self" }],
      },
    ],
  },

  {
    Id: 13,
    Name: "Critical Thinking",
    Type: "Spell",
    Cost: 1,
    Description: "Draw 3 Cards. Place 2 Cards from Your Hand on the bottom of Your Draw Pile.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 3 },
          { Type: "BottomFromHand", Target: "FriendlyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 45,
    Name: "Dagger Throw",
    Type: "Spell",
    Cost: 1,
    Description: "Deal 2 Damage. If this was the first card You played this Round: Draw a Card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 },
          {
            Type: "DrawCard",
            Target: "FriendlyHero",
            Condition: { Condition: "FirstPlayedThisRound", TargetParam: "Any" },
          },
        ],
      },
    ],
  },

  {
    Id: 32,
    Name: "Marked for Death",
    Type: "Spell",
    Cost: 1,
    Description: "Mark an Enemy Unit. Draw a Card.",
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
    Id: 124,
    Name: "Last Call",
    Type: "Spell",
    Cost: 1,
    Description: "This Round, You may play a Unit during the Action Phase. Draw a Card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [{ Type: "GrantActionPlay" }, { Type: "DrawCard", Target: "FriendlyHero" }],
      },
    ],
  },

  {
    Id: 126,
    Name: "Bandit",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 3,
    Description: "When this Damages an Enemy Unit: Stun it.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }],
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
    Health: 3,
    Description: "When Destroyed: Deal 2 Damage to the Enemy Hero.",
    Effects: [
      { Trigger: "OnDeath", Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] },
    ],
  },

  {
    Id: 9,
    Name: "Corpse Eater",
    Type: "Unit",
    Subtypes: ["Animal", "Aberration"],
    Cost: 1,
    Attack: 2,
    Health: 2,
    Description: "When Sacrificed: Gain 1 Blood and Draw a Card.",
    Effects: [
      {
        Trigger: "OnSacrificed",
        Actions: [
          { Type: "AddResource", Target: "FriendlyHero", Amount: 1 },
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 111,
    Name: "Engineer",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 1,
    Health: 3,
    Description: "When Played: Gain a Sentry Gun.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 935 }],
      },
    ],
  },

  {
    Id: 112,
    Name: "Bug Knight",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 2,
    Health: 2,
    ActionPlay: true,
    Description: "Can be Played During Action Phase.",
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
        Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }],
      },
    ],
  },

  {
    Id: 44,
    Name: "Katyusha",
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
    Id: 103,
    Name: "Fem-Bot",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 1,
    Attack: 1,
    Health: 3,
    Description: "When Played: Draw a Card. If the Card Drawn was a Machine, this gains +1 ATK.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
          { Type: "BuffStats", Target: "Self", BuffAtk: 1, OnlyIfDrawnSubtype: "Machine" },
        ],
      },
    ],
  },

  {
    Id: 1,
    Name: "Black Rabbitlings",
    Type: "Unit",
    Subtypes: ["Animal", "Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When Destroyed: Heal a Friendly Unit or Your Hero for 3.",
     Effects: [
      { Trigger: "OnDeath", Targeting: "TargetFriendlyUnitOrHero",
        Actions: [{ Type: "Heal", Target: "SelectedTarget", Amount: 3 }] },
    ],

  },

  {
    Id: 74,
    Name: "Undrawn",
    Type: "Unit",
    Subtypes: ["Human", "Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 3,
    Description: "While in Play: Whenever the Enemy Hero draws a Card, deal 1 Damage to that Hero.",
    Effects: [
      {
        Trigger: "OnOpponentCardDrawn",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 1 }],
      },
    ],
  },

  {
    Id: 42,
    Name: "Soldat",
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
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 2, BuffHp: 2 }],
      },
    ],
  },

  {
    Id: 128,
    Name: "Ember Drake",
    Type: "Unit",
    Subtypes: ["Aberration", "Machine"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description: "When this Damages an Enemy Unit: Apply 2 Burning to it.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Burning" },
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Burning" },
        ],
      },
    ],
  },

  {
    Id: 51,
    Name: "Trapper",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 1,
    Attack: 2,
    Health: 2,
    Description: "When Played: Gain a Trap.",
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
    Id: 3,
    Name: "Bone Baronet",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 1,
    Attack: 1,
    Health: 3,
    Description: "When Destroyed: Gain The Tempting Goblet.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 900 }],
      },
    ],
  },

  {
    Id: 85,
    Name: "Knock-out",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 2 Damage to an Enemy Unit and Stun it.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetEnemyUnit",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 },
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 93,
    Name: "Dual Wield",
    Type: "Spell",
    Cost: 2,
    Description: "Your next Action is played twice.",
    Effects: [
      { Trigger: "OnPlayed", Actions: [{ Type: "PlayNextTwice", Target: "FriendlyHero" }] },
    ],
  },

  {
    Id: 86,
    Name: "Disintegrade",
    Type: "Spell",
    Cost: 2,
    Description: "Destroy a Damaged Unit. Draw a Card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DestroyUnit", Target: "TargetAnyUnit", Where: { Damaged: true } },
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 15,
    Name: "Expectancy",
    Type: "Spell",
    Cost: 2,
    Description: "Draw 2 Cards from Your Deck or Your Discard Pile.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "Choice",
        ChoiceLabels: ["Draw from Deck", "Draw from Discard"],
        Actions: [
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 2 },
          { Type: "DrawFromDiscard", Target: "FriendlyHero", Amount: 2 },
        ],
      },
    ],
  },

  {
    Id: 18,
    Name: "Final Mission",
    Type: "Spell",
    Cost: 2,
    Description: "Sacrifice a Friendly Unit. Deal 4 Damage to an Enemy Unit.",
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
    Id: 7,
    Name: "Glock-17",
    Type: "Spell",
    Cost: 2,
    Description: "Deal 3 Damage to an Enemy Unit. If the Unit was Marked: Draw a Card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 },
          { Type: "DrawCard", Target: "FriendlyHero", OnlyIfTargetStatus: "Marked" },
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
      { Trigger: "OnPlayed", Actions: [{ Type: "BonusAttack", Target: "TargetFriendlyUnit" }] },
    ],
  },

  {
    Id: 31,
    Name: "Silence",
    Type: "Spell",
    Cost: 2,
    Description: "Silence an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed", Actions: [{ Type: "Silence", Target: "TargetEnemyUnit" }] }],
  },

  {
    Id: 117,
    Name: "Stalinium",
    Type: "Spell",
    Cost: 2,
    Description: "A Friendly Unit gets Protected this Round.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Protected" }],
      },
    ],
  },

  {
    Id: 8,
    Name: "Knight",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Keywords: ["Armored"],
    KeywordParams: { Armored: 1 },
    Description: "",
  },

  {
    Id: 10,
    Name: "Polar Bear",
    Type: "Unit",
    Subtypes: ["Animal", "Aberration"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "Sacrifice: Absorb the Stats of the sacrificed Unit.",
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
    Id: 81,
    Name: "Isu",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "Deals double the Damage to the Enemy Hero and Enemy Machines.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ModifyDamage", Against: "EnemyHero", Multiplier: 2 },
          { Type: "ModifyDamage", Against: "EnemyUnit", Where: { Subtype: "Machine" }, Multiplier: 2 },
        ],
      },
    ],
  },

  {
    Id: 97,
    Name: "Cyborg",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 2,
    Attack: 2,
    Health: 3,
    Description: "While in Play: Adjacent Machines gain +1 ATK.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          {
            Type: "AuraBuff",
            Target: "AdjacentFriendlyUnits",
            Where: { Subtype: "Machine" },
            BuffAtk: 1,
          },
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
    Description: "On Kill: Gain Soul Guard.",
    Effects: [
      {
        Trigger: "OnKill",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "SoulGuard" }],
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
    Description: "Before Combat: Apply Burning to an Enemy Unit.",
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
    Id: 39,
    Name: "Regifter",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 3,
    Health: 2,
    Description: "Sacrifice: Both Heroes Draw 2 Cards.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
          { Type: "DrawCard", Target: "FriendlyHero", Amount: 2, OnlyIfSacrificed: true },
          { Type: "DrawCard", Target: "EnemyHero", Amount: 2, OnlyIfSacrificed: true },
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
    Description:
      "While in Play: Whenever a Friendly Aberration hurts the Enemy Hero, that Unit gains +1/+1.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSubtype", TargetParam: "Aberration" },
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 }],
      },
    ],
  },

  {
    Id: 121,
    Name: "Con Artist",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 2,
    Attack: 1,
    Health: 5,
    Description: "While in Play: You may play Units during the Action Phase.",
    Effects: [{ Trigger: "Passive", Zone: "Board", Actions: [{ Type: "AllowUnitsInAction" }] }],
  },

  {
    Id: 25,
    Name: "Bounty Hunter",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 3,
    Health: 3,
    Description: "While in Play: Whenever You mark an Enemy Unit, Stun it.",
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
        Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }],
      },
    ],
  },

  {
    Id: 91,
    Name: "BWP",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 3,
    Attack: 2,
    Health: 2,
    Description: "End of Round: Summon an Artificer in a Lane of Your choosing.",
    Effects: [{ Trigger: "OnEndOfRound", Actions: [{ Type: "MakeAUnit", ValueParam: 42 }] }],
  },

  {
    Id: 92,
    Name: "Unitslinger",
    Type: "Unit",
    Subtypes: ["Human", "Aberration"],
    Cost: 3,
    Attack: 2,
    Health: 5,
    Keywords: ["AntiAirborne"],
    Description:
      "While in Play: When an Enemy Unit is Played in a different Lane, move it here. If it can't be moved here, deal 2 Damage to it instead (Once per Round).",
    Effects: [
      {
        Trigger: "OnEnemyUnitPlayed",
        Condition: { Condition: "Not", SubConditions: [{ Condition: "SameLane" }] },
        Actions: [
          {
            Type: "MoveToSourceLane",
            Target: "EventUnit",
            Else: { Type: "DealDamage", Amount: 2, OncePerTurn: true },
          },
        ],
      },
    ],
  },

  {
    Id: 95,
    Name: "One-Punch Man",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 3,
    Health: 2,
    Description: "While in Play: All Friendly Humans have Deadly.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          {
            Type: "GrantKeyword",
            Target: "AllFriendlyUnits",
            Keyword: "Deadly",
            Where: { Subtype: "Human" },
          },
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
    Effects: [{ Trigger: "OnPlayed", Actions: [{ Type: "BonusAttack", Target: "Self" }] }],
  },

  {
    Id: 27,
    Name: "Drawing Raptor",
    Type: "Unit",
    Subtypes: ["Animal", "Aberration"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description:
      "While in Play: When You draw a Card, gain +1 ATK. When this hurts an Enemy Hero, Draw a Card.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyHero",
        Condition: { Condition: "IsSelf" },
        Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }],
      },
      {
        Trigger: "OnFriendlyCardDrawn",
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }],
      },
    ],
  },

  {
    Id: 46,
    Name: "Tea Maid",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 1,
    Health: 4,
    Description: "While in Play: Your Actions cost 1 less.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [
          { Type: "ModifyCost", Side: "Friendly", Amount: -1, CardFilter: { Type: "Spell" } },
        ],
      },
    ],
  },

  {
    Id: 5,
    Name: "Queen of Cards",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 3,
    Attack: 2,
    Health: 4,
    Description: "While in Play: When any Unit is Destroyed, Draw a Card.",
    Effects: [
      { Trigger: "OnFriendlyUnitDied", Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] },
      { Trigger: "OnEnemyUnitDied", Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] },
    ],
  },

  {
    Id: 16,
    Name: "HellFire",
    Type: "Spell",
    Cost: 4,
    Description: "Deal 2 Damage to all Enemy Units and apply 2 Burning to them.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DealDamage", Target: "AllEnemyUnits", Amount: 2 },
          { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Burning" },
          { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Burning" },
        ],
      },
    ],
  },

  {
    Id: 113,
    Name: "Soul Harvest",
    Type: "Spell",
    Cost: 4,
    Description:
      "Draw the Units that were Destroyed last Round. Deal Damage equal to the number of cards drawn to an Enemy Unit or Hero.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "DrawKilledLastRound" },
          { Type: "DealDamage", Target: "TargetEnemyUnitOrHero", AmountFrom: "CardsDrawn" },
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
    Description: "While in Play: All Friendly Units have Soul Guard.",
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
    Id: 20,
    Name: "Genie",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 2,
    Health: 3,
    Description: "When Played: Bounce a Unit.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "SelectedTarget",
        Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget" }],
      },
    ],
  },

  {
    Id: 114,
    Name: "Doppelgänger",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Description: "When Played: Copy the last Destroyed Unit's Ability, including its When Played.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [{ Type: "CopyDestroyed", Side: "Any", CopyHealth: false }],
      },
    ],
  },

  {
    Id: 94,
    Name: "Imperial Dropship",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Keywords: ["Flying"],
    Description: "When Destroyed: Summon Stormtroopers in Adjacent Lanes.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [{ Type: "MakeAUnit", ValueParam: 912, StringParam: "AdjacentLanes" }],
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
    KeywordParams: { Armored: 1 },
    Description:
      "When this deals Damage to an Enemy Unit: Deal half of the Damage dealt to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", AmountFrom: "DamageDealt", Div: 2 }],
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
    Health: 2,
    Keywords: ["SplashDamage", "BurnSource"],
    KeywordParams: { SplashDamage: 3 },
    Description: "When this deals Damage to an Enemy Unit: Apply Burning to it.",
  },

  {
    Id: 26,
    Name: "Occultist",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 2,
    Health: 4,
    Description: "Before Combat: Mark an Enemy Unit.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }],
      },
    ],
  },

  {
    Id: 129,
    Name: "T34",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 4,
    Attack: 4,
    Health: 4,
    Keywords: ["Unactionable"],
    Description: "Can't be Damaged by Human cards.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "DamageImmunity", From: { Subtype: "Human" } }],
      },
    ],
  },

  {
    Id: 127,
    Name: "Samurai",
    Type: "Unit",
    Subtypes: ["Human"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Description:
      "After Combat Here: Do a Bonus Attack.",
    Effects: [
      { Trigger: "OnPostCombatLine", Actions: [{ Type: "BonusAttack", Target: "Self" }] },
    ],
  },

  {
    Id: 115,
    Name: "AI AL",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 4,
    Health: 5,
    Description: "Before Combat Here: You may move it to a different Lane.",
    Effects: [{ Trigger: "OnPreCombatLine", Actions: [{ Type: "MoveLane", Target: "Self" }] }],
  },

  {
    Id: 6,
    Name: "The Jersey Demon",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 5,
    Attack: 2,
    Health: 2,
    Description: "When Played: All Friendly Units get +1/+1 for the rest of the game.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [{ Type: "ModifyGlobalBuff", Target: "FriendlyHero", BuffAtk: 1, BuffHp: 1 }],
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
    Description: "On Kill: Move Right.",
    Effects: [{ Trigger: "OnKill", Actions: [{ Type: "MoveRight", Target: "Self" }] }],
  },

  {
    Id: 23,
    Name: "Chainsaw Guy",
    Type: "Unit",
    Subtypes: ["Human", "Machine"],
    Cost: 5,
    Attack: 4,
    Health: 4,
    Description: "When this Does Damage: Double its current Attack and Health.",
    Effects: [
      { Trigger: "OnDamagedEnemyUnit", Actions: [{ Type: "DoubleStats", Target: "Self" }] },
      { Trigger: "OnDamagedEnemyHero", Actions: [{ Type: "DoubleStats", Target: "Self" }] },
    ],
  },

  {
    Id: 125,
    Name: "Giant Skeleton",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 5,
    Attack: 3,
    Health: 5,
    Description: "When Destroyed: Destroy all Units in this Lane and adjacent Lanes.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [{ Type: "DestroyUnit", Target: "SelfLaneEnemyAndAdjacentAny" }],
      },
    ],
  },

  {
    Id: 36,
    Name: "Death",
    Type: "Unit",
    Subtypes: ["Human", "Aberration"],
    Cost: 5,
    Attack: 3,
    Health: 3,
    Keywords: ["SoulGuard"],
    Rule: "hpOneTrigger",
    Description:
      "Whenever a Friendly Unit is Destroyed or drops to 1 HP: Deal 2 Damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }],
      },
      {
        Trigger: "OnFriendlyUnitHpOne",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }],
      },
    ],
  },

  {
    Id: 33,
    Name: "Mouse",
    Type: "Unit",
    Subtypes: ["Machine"],
    Cost: 5,
    Attack: 5,
    Health: 10,
    Description: "When this deals Damage: Stun itself.",
    Effects: [
      { Trigger: "OnDamagedEnemyUnit",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" }] },
      { Trigger: "OnDamagedEnemyHero",
        Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" }] },
    ],
  },

  {
    Id: 30,
    Name: "SharkCannon",
    Type: "Unit",
    Subtypes: ["Animal", "Machine", "Aberration"],
    Cost: 5,
    Attack: 0,
    Health: 7,
    Description: "Before Combat: Deal 5 Damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnPreCombatLine",
        Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 5 }],
      },
    ],
  },

  {
    Id: 54,
    Name: "Thor",
    Type: "Unit",
    Subtypes: ["Human", "Machine"],
    Cost: 5,
    Attack: 0,
    Health: 4,
    Rule: "persistentGrowth",
    Description:
      "While in Hand, Deck, Discard or on Board: Gain +1 ATK whenever a Friendly Unit is Destroyed.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDied",
        Zone: ["Deck", "Hand", "Discard", "Board"],
        Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }],
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
    Description: "While in Play: When You mark an Enemy Unit, do a Bonus Attack.",
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
        Actions: [{ Type: "BonusAttack", Target: "Self" }],
      },
    ],
  },

  {
    Id: 108,
    Name: "Abyss Lector",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 6,
    Attack: 3,
    Health: 3,
    Description:
      "When Played: For each other Friendly Aberration, Conjure a Random Blessing. They cost 0 this Round.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          {
            Type: "AddCardToHand",
            Target: "FriendlyHero",
            Filter: { Ids: [915, 916, 917, 918, 919, 920, 924, 926, 928, 934], Token: true },
            Count: { Count: "FriendlyUnits", Subtype: "Aberration" },
            FreeThisTurn: true,
            AllowZero: true,
          },
        ],
      },
    ],
  },

  {
    Id: 56,
    Name: "Collector",
    Type: "Unit",
    Subtypes: ["Aberration"],
    TokenGroup: "The Collection",
    Cost: 6,
    Attack: 2,
    Health: 6,
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
    Id: 53,
    Name: "The Curtain Call",
    Type: "Spell",
    Cost: 7,
    Description: "Destroy all Enemy Units on the Board.",
    Effects: [{ Trigger: "OnPlayed", Actions: [{ Type: "DestroyUnit", Target: "AllEnemyUnits" }] }],
  },

  {
    Id: 11,
    Name: "The Creature",
    Type: "Unit",
    Subtypes: ["Animal", "Machine", "Aberration", "Human"],
    Cost: 7,
    Attack: 3,
    Health: 5,
    Keywords: ["Unkillable", "Unactionable"],
    Rule: "persistentGrowth",
    Description: "While in Deck, Hand or Discard: Costs 2 less whenever a Unit is Sacrificed.",
    Effects: [
      {
        Trigger: "OnOtherUnitSacrificed",
        Zone: ["Deck", "Hand", "Discard"],
        Actions: [{ Type: "BuffStats", Target: "Self", Amount: -2 }],
      },
      {
        Trigger: "OnEnemyUnitSacrificed",
        Zone: ["Deck", "Hand", "Discard"],
        Actions: [{ Type: "BuffStats", Target: "Self", Amount: -2 }],
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
    Description:
      "While in Deck, Hand or Discard: Costs 1 less for each Action You played. When Played: Do a Bonus Attack.",
    Effects: [
      { Trigger: "OnPlayed", Actions: [{ Type: "BonusAttack", Target: "Self" }] },
      {
        Trigger: "OnFriendlyActionPlayed",
        Zone: ["Deck", "Hand", "Discard"],
        Actions: [{ Type: "BuffStats", Target: "Self", Amount: -1 }],
      },
    ],
  },

  {
    Id: 118,
    Name: "Pay To Win",
    Type: "Spell",
    Cost: 0,
    Description: "Spend all Your Blood. For each Blood spent, the Enemy Hero loses 1 Blood.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "LoseBlood", Target: "EnemyHero", Amount: { Count: "Blood" } },
          { Type: "SpendBlood", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 89,
    Name: "Bloodblot",
    Type: "Unit",
    Subtypes: ["Aberration"],
    Cost: 0,
    Attack: 0,
    Health: 2,
    Description: "When Played: Spend all Your Blood. Gain +1/+1 for each Blood spent.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          {
            Type: "BuffStats",
            Target: "Self",
            BuffAtk: { Count: "Blood" },
            BuffHp: { Count: "Blood" },
          },
          { Type: "SpendBlood", Target: "FriendlyHero" },
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
    Name: "Royal Soldier",
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
    Cost: 1,
    Description: "Sacrifice a Friendly Unit. Draw a Card.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "SacrificeUnit", Target: "SelectedTarget" },
          { Type: "DrawCard", Target: "FriendlyHero" },
        ],
      },
    ],
  },

  {
    Id: 903,
    Name: "Trap",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 0,
    Attack: 0,
    Health: 1,
    Description: "When Destroyed: Stun the Enemy Unit opposite it.",
    Effects: [
      {
        Trigger: "OnDeath",
        Actions: [{ Type: "ApplyStatus", Target: "OppositeEnemyUnit", StatusKeyword: "Stunned" }],
      },
    ],
  },

  {
    Id: 904,
    Name: "Barristan",
    Type: "Unit",
    Subtypes: ["Monster", "Token"],
    Cost: 2,
    Attack: 1,
    Health: 3,
    Keywords: ["Taunt", "Armored"],
    KeywordParams: { Armored: 1 },
    Description: "",
  },

  {
    Id: 905,
    Name: "July",
    Type: "Unit",
    Subtypes: ["Monster", "Token"],
    Cost: 2,
    Attack: 2,
    Health: 2,
    Keywords: ["Lifesteal"],
    Description: "",
  },

  {
    Id: 906,
    Name: "Dismas",
    Type: "Unit",
    Subtypes: ["Monster", "Token"],
    Cost: 2,
    Attack: 3,
    Health: 1,
    Description: "Deals double the Damage to Undamaged Units.",
    Effects: [
      {
        Trigger: "Passive",
        Zone: "Board",
        Actions: [{ Type: "ModifyDamage", Against: "Unit", Where: { Undamaged: true }, Multiplier: 2 }],
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
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 910 }],
      },
    ],
  },

  {
    Id: 908,
    Name: "Sister",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Attack: 1,
    Health: 4,
    Keywords: ["Lifesteal"],
    Description: "",
  },

  {
    Id: 909,
    Name: "The Titan",
    Type: "Unit",
    Subtypes: ["Token", "Machine"],
    Cost: 4,
    Attack: 10,
    Health: 20,
    Keywords: ["Taunt", "Unactionable", "SilenceImmune", "BounceImmune"],
    Description: "",
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
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 2 }],
      },
    ],
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
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 0 }],
      },
    ],
  },

  {
    Id: 912,
    Name: "Stormtrooper",
    Type: "Unit",
    Subtypes: ["Human", "Token"],
    Cost: 1,
    Attack: 2,
    Health: 2,
    Description: "",
  },

  {
    Id: 913,
    Name: "Slot-Machine",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 2,
    Attack: 2,
    Health: 5,
    Description: "When Hurt: Conjure a random Machine. It costs 1 less.",
    Effects: [
      {
        Trigger: "OnFriendlyUnitDamaged",
        Condition: { Condition: "IsSelf" },
        Actions: [
          {
            Type: "AddCardToHand",
            Target: "FriendlyHero",
            Filter: { Type: "Unit", Subtype: "Machine" },
            CostChange: -1,
          },
        ],
      },
    ],
  },

  {
    Id: 914,
    Name: "Cinder Ash",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 0,
    Description:
      "Deal Damage to a Friendly Unit or Your Hero equal to the number of Cinder Ash You have played this game. Start of Round: If this is in Your Hand, gain a copy of Cinder Ash.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnitOrHero",
        Actions: [
          { Type: "DealDamage", Target: "SelectedTarget", Amount: { Count: "AshesPlayed" } },
        ],
      },
      {
        Trigger: "OnStartOfRound",
        Zone: "Hand",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 914 }],
      },
    ],
  },

  {
    Id: 915,
    Name: "Blessing of Might",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Give a Friendly Unit +3/+3.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 3, BuffHp: 3 }],
      },
    ],
  },

  {
    Id: 916,
    Name: "Blessing of Warding",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Give a Friendly Unit Soul Guard and +1/+1.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "SoulGuard" },
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 917,
    Name: "Blessing of Mending",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Heal Your Hero for 4 and all Friendly Units for 4.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "Heal", Target: "FriendlyHero", Amount: 4 },
          { Type: "Heal", Target: "AllFriendlyUnits", Amount: 4 },
        ],
      },
    ],
  },

  {
    Id: 918,
    Name: "Blessing of Wisdom",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Draw 2 Cards.",
    Effects: [
      { Trigger: "OnPlayed", Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Amount: 2 }] },
    ],
  },

  {
    Id: 919,
    Name: "Blessing of Vengeance",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Deal 3 Damage to an Enemy Unit and 1 Damage to the Enemy Hero.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetEnemyUnit",
        Actions: [
          { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 },
          { Type: "DealDamage", Target: "EnemyHero", Amount: 1 },
        ],
      },
    ],
  },

  {
    Id: 920,
    Name: "Blessing of Silence",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Silence an Enemy Unit and Stun it.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetEnemyUnit",
        Actions: [
          { Type: "Silence", Target: "TargetEnemyUnit" },
          { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Stunned" },
        ],
      },
    ],
  },

  {
    Id: 924,
    Name: "Blessing of Fortitude",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Increase Your Hero's Max HP by 3. Heal Your Hero for 4.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "IncreaseMaxHp", Target: "FriendlyHero", Amount: 3 },
          { Type: "Heal", Target: "FriendlyHero", Amount: 4 },
        ],
      },
    ],
  },

  {
    Id: 926,
    Name: "Blessing of Meteors",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Deal 2 Damage to all Enemy Units.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [{ Type: "DealDamage", Target: "AllEnemyUnits", Amount: 2 }],
      },
    ],
  },

  {
    Id: 928,
    Name: "Blessing of Revival",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Summon a Random Friendly Unit that costs 3 or less from Your Discard Pile.",
    Effects: [{ Trigger: "OnPlayed", Actions: [{ Type: "Reanimate", Filter: { MaxCost: 3 } }] }],
  },

  {
    Id: 934,
    Name: "Blessing of Wings",
    Type: "Spell",
    Subtypes: ["Token"],
    Cost: 2,
    Description: "Give a Friendly Unit Flying and +2/+1.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Targeting: "TargetFriendlyUnit",
        Actions: [
          { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Flying" },
          { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 1 },
        ],
      },
    ],
  },

  {
    Id: 935,
    Name: "Sentry Gun",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 1,
    Attack: 1,
    Health: 2,
    Description:
      "While in Your Hand: When You play 2 Machine Cards, Transform this into Sentry Minigun.",
    Effects: [
      {
        Trigger: "OnFriendlyCardPlayed",
        Zone: "Hand",
        Count: 2,
        Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
        Actions: [{ Type: "TransformInHand", Into: 936 }],
      },
    ],
  },

  {
    Id: 936,
    Name: "Sentry Minigun",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 2,
    Attack: 3,
    Health: 2,
    Description:
      "While in Your Hand: When You play 2 Machine Cards, Transform this into Missile Gun.",
    Effects: [
      {
        Trigger: "OnFriendlyCardPlayed",
        Zone: "Hand",
        Count: 2,
        Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
        Actions: [{ Type: "TransformInHand", Into: 937 }],
      },
    ],
  },

  {
    Id: 937,
    Name: "Missile Gun",
    Type: "Unit",
    Subtypes: ["Machine", "Token"],
    Cost: 4,
    Attack: 3,
    Health: 3,
    Keywords: ["SplashDamage"],
    KeywordParams: { SplashDamage: 1 },
    Description:
      "While in Your Hand: When You play 2 Machine Cards, Transform this into Mini Sentry.",
    Effects: [
      {
        Trigger: "OnFriendlyCardPlayed",
        Zone: "Hand",
        Count: 2,
        Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
        Actions: [{ Type: "TransformInHand", Into: 938 }],
      },
    ],
  },

  {
    Id: 938,
    Name: "Mini Sentry",
    Type: "Unit",
    Subtypes: ["Anime", "Machine", "Token"],
    Cost: 5,
    Attack: 2,
    Health: 3,
    Description: "When Played: All Friendly Machines do a Bonus Attack.",
    Effects: [
      {
        Trigger: "OnPlayed",
        Actions: [
          { Type: "BonusAttack", Target: "AllFriendlyUnits", Where: { Subtype: "Machine" } },
        ],
      },
    ],
  },
];

(function () {
  let enabled = false;
  try {
    enabled = localStorage.getItem("rj_exp") === "1";
  } catch (e) {}
  window.RJ_EXP = enabled;
  if (!enabled) return;
  CARDS.length = 0;
  CARDS_EXP.forEach((card) => CARDS.push(card));
})();
