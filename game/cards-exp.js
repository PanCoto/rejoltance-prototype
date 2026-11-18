// ============================================================
// CARDS_EXP — karty z balansu TXT, ale z ID zmapowanymi na cards.js.
// Name/Cost/Attack/Health/Subtypes/Description z TXT.
// Id = Id odpowiadającej karty z cards.js (mapowanie po efekcie/roli).
// Komentarz przy każdej karcie: "TXT#n -> cards.js Id (nazwa w cards.js)".
// Tokeny (900-938) bez zmian - mają te same ID w obu plikach.
// ============================================================
const CARDS_EXP = [

  // TXT#1 -> 12 (Black Cat)
  { Id: 12, Name: "Black Cat", Type: "Unit", Subtypes: ["Animal"], Cost: 0, Attack: 1, Health: 1,
    Description: "When Sacrificed: Return to Your Hand instead.",
    Effects: [{ Trigger: "OnSacrificed", Zone: "Board",
      Actions: [{ Type: "ReturnToHand", Target: "Self" }] }] },

  // TXT#2 -> 13 (Seek)
  { Id: 13, Name: "Critical Thinking", Type: "Spell", Cost: 1,
    Description: "Choose a Card from Your Deck and add it to your hand.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "TutorCard", Target: "Self" },
                { Type: "ShuffleDeck", Target: "Self" }] }] },

  // TXT#3 -> 45 (Dagger Throw)
  { Id: 45, Name: "Dagger Throw", Type: "Spell", Cost: 1,
    Description: "Deal 2 Damage.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 }] }] },

  // TXT#4 -> 32 (Marked for Death)
  { Id: 32, Name: "Marked for Death", Type: "Spell", Cost: 1,
    Description: "Mark an Enemy Unit. Draw a Card.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" },
                { Type: "DrawCard", Target: "FriendlyHero" }] }] },

  // TXT#5 -> 124 (Last Call)
  { Id: 124, Name: "Teleport", Type: "Spell", Cost: 1,
    Description: "This Round, you may play a Unit during the Action Phase. Draw a Card.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "GrantActionPlay" },
                { Type: "DrawCard", Target: "FriendlyHero" }] }] },

  // TXT#6 -> 126 (Bandit)
  { Id: 126, Name: "Bandit", Type: "Unit", Subtypes: ["Human"], Cost: 1, Attack: 1, Health: 3,
    Description: "When this damages an Enemy Unit: Stun it.",
    Effects: [{ Trigger: "OnDamagedEnemyUnit",
      Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }] }] },

  // TXT#7 -> 2 (BoomBot)
  { Id: 2, Name: "Boombots", Type: "Unit", Subtypes: ["Machine"], Cost: 1, Attack: 1, Health: 3,
    Description: "When Destroyed: Deal 2 Damage to the Enemy Hero.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] }] },

  // TXT#8 -> 9 (Corpse Eater)
  { Id: 9, Name: "Corpse Eater", Type: "Unit", Subtypes: ["Animal", "Aberration"], Cost: 1, Attack: 2, Health: 2,
    Description: "When Sacrificed: Gain 1 Blood and Draw a Card.",
    Effects: [{ Trigger: "OnSacrificed",
      Actions: [{ Type: "AddResource", Target: "FriendlyHero", Amount: 1 },
                { Type: "DrawCard", Target: "FriendlyHero" }] }] },

  // TXT#9 -> 111 (Engineer)
  { Id: 111, Name: "Engineer", Type: "Unit", Subtypes: ["Human"], Cost: 1, Attack: 1, Health: 3,
    Description: "When Played: Gain a Sentry Gun.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 935 }] }] },

  // TXT#10 -> 112 (Bug Knight)
  { Id: 112, Name: "Hollow Knight", Type: "Unit", Subtypes: ["Aberration"], Cost: 1, Attack: 2, Health: 2,
    ActionPlay: true, Description: "Can be played during the Action Phase." },

  // TXT#11 -> 4 (Scout)
  { Id: 4, Name: "Informer", Type: "Unit", Subtypes: ["Human"], Cost: 1, Attack: 1, Health: 2,
    Description: "When Played: Mark an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }] }] },

  // TXT#12 -> 44 (Area Drone)
  { Id: 44, Name: "Katyusha", Type: "Unit", Subtypes: ["Machine"], Cost: 1, Attack: 1, Health: 2,
    Keywords: ["SplashDamage"], KeywordParams: { SplashDamage: 1 },
    Description: "" },

  // TXT#13 -> 103 (Fem-Bot)
  { Id: 103, Name: "Little Bob", Type: "Unit", Subtypes: ["Machine"], Cost: 1, Attack: 1, Health: 3,
    Description: "When Played: Draw a Card. If the Card Drawn was a Machine, this gains +1 ATK.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Amount: 1 },
                { Type: "BuffStats", Target: "Self", BuffAtk: 1, OnlyIfDrawnSubtype: "Machine" }] }] },

  // TXT#14 -> 1 (Black Rabbitlings)
  { Id: 1, Name: "Mokke", Type: "Unit", Subtypes: ["Animal", "Aberration"], Cost: 1, Attack: 1, Health: 2,
    Description: "When Destroyed: Heal all Friendly Units for 2 and Your Hero for 1.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "Heal", Target: "AllFriendlyUnits", Amount: 2 },
                { Type: "Heal", Target: "FriendlyHero", Amount: 1 }] }] },

  // TXT#15 -> 74 (Undrawn)
  { Id: 74, Name: "Quickdraw Gunmain", Type: "Unit", Subtypes: ["Human", "Aberration"], Cost: 1, Attack: 1, Health: 3,
    Description: "While in Play: When the Enemy Hero draws a Card, deal 1 Damage to them.",
    Effects: [{ Trigger: "OnOpponentCardGained",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 1 }] }] },

  // TXT#16 -> 42 (Artificer)
  { Id: 42, Name: "Soldat", Type: "Unit", Subtypes: ["Human"], Cost: 1, Attack: 1, Health: 1,
    Description: "When Played: If you control a Friendly Machine, gain +2/+2.",
    Effects: [{ Trigger: "OnPlayed",
      Condition: { Condition: "HasSubtypeOnBoard", TargetParam: "Machine" },
      Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 2, BuffHp: 2 }] }] },

  // TXT#17 -> 128 (Ember Drake)
  { Id: 128, Name: "Toxic Reapa", Type: "Unit", Subtypes: ["Aberration", "Machine"], Cost: 1, Attack: 1, Health: 2,
    Description: "When this damages an Enemy Unit: Apply 2 Burning to it.",
    Effects: [{ Trigger: "OnDamagedEnemyUnit",
      Actions: [
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Burning" },
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Burning" },
      ] }] },

  // TXT#18 -> 51 (Trapper)
  { Id: 51, Name: "Trapper", Type: "Unit", Subtypes: ["Human"], Cost: 1, Attack: 2, Health: 2,
    Description: "When Played: Gain a Trap.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 903, FreeThisTurn: true }] }] },

  // TXT#19 -> 3 (Bone Baronet)
  { Id: 3, Name: "Bone Courtier", Type: "Unit", Subtypes: ["Aberration"], Cost: 1, Attack: 1, Health: 3,
    Description: "When Destroyed: Gain a Tempting Goblet.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 900 }] }] },

  // TXT#20 -> 85 (Knock-out; brak bliższego odpowiednika, "stun-ish" spell)
  { Id: 85, Name: "Dazzling Light", Type: "Spell", Cost: 2,
    Description: "Deal 2 Damage to an Enemy Unit and Stun it.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetEnemyUnit",
      Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 2 },
                { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Stunned" }] }] },

  // TXT#21 -> 93 (Dual Wield)
  { Id: 93, Name: "Dual Wield", Type: "Spell", Cost: 2,
    Description: "Your next Action is played twice.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "PlayNextTwice", Target: "FriendlyHero" }] }] },

  // TXT#22 -> 86 (Disintegrade)
  { Id: 86, Name: "Evaporate", Type: "Spell", Cost: 2,
    Description: "Destroy a Damaged Unit. Draw a Card.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DestroyUnit", Target: "TargetAnyUnit", Where: { Damaged: true } },
                { Type: "DrawCard", Target: "FriendlyHero" }] }] },

    // TXT#23 -> 15 (Expectancy)
  { Id: 15, Name: "Expectancy", Type: "Spell", Cost: 2,
    Description: "Draw 2 Cards from Your Draw Pile or Your Discard Pile.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "Choice",
      ChoiceLabels: ["Draw from Deck", "Draw from Discard"],
      Actions: [
        { Type: "DrawCard",       Target: "FriendlyHero", Amount: 2 },
        { Type: "DrawFromDiscard", Target: "FriendlyHero", Amount: 2 },
      ] }] },

  // TXT#24 -> 18 (Final Mission)
  { Id: 18, Name: "Final Mission", Type: "Spell", Cost: 2,
    Description: "Sacrifice a Friendly Unit. Deal 4 Damage to an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "SacrificeUnit", Target: "TargetFriendlyUnit" },
                { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 4 }] }] },

  // TXT#25 -> 7 (Glock-17)
  { Id: 7, Name: "Glock 17", Type: "Spell", Cost: 2,
    Description: "Deal 3 Damage to an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 }] }] },

  // TXT#26 -> 19 (Lunch)
  { Id: 19, Name: "Lurch for Lunch", Type: "Spell", Cost: 2,
    Description: "A Friendly Unit does a Bonus Attack.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BonusAttack", Target: "TargetFriendlyUnit" }] }] },

  // TXT#27 -> 31 (Silence)
  { Id: 31, Name: "Shhhh", Type: "Spell", Cost: 2,
    Description: "Silence an Enemy Unit.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "Silence", Target: "TargetEnemyUnit" }] }] },

  // TXT#28 -> 117 (Stalinium)
  { Id: 117, Name: "Stalinium", Type: "Spell", Cost: 2,
    Description: "A Friendly Unit is Protected this Round.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Protected" }] }] },

  // TXT#29 -> 8 (Knight)
  { Id: 8, Name: "Crusader", Type: "Unit", Subtypes: ["Human"], Cost: 2, Attack: 2, Health: 3,
    Keywords: ["Armored"], KeywordParams: { Armored: 1 }, Description: "" },

  // TXT#30 -> 10 (Polar Bear)
  { Id: 10, Name: "Bear", Type: "Unit", Subtypes: ["Animal", "Aberration"], Cost: 2, Attack: 2, Health: 3,
    Description: "Sacrifice: Absorb the sacrificed Unit's stats.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "OtherFriendlyUnits",
      Actions: [{ Type: "AbsorbStats", Target: "SelectedTarget" },
                { Type: "SacrificeUnit", Target: "SelectedTarget", Optional: true }] }] },

  // TXT#31 -> 81 (Double Tap)
  { Id: 81, Name: "Isu 152", Type: "Unit", Subtypes: ["Machine"], Cost: 2, Attack: 2, Health: 3,
    Description: "Deals double Damage to the Enemy Hero.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "ModifyDamage", Against: "EnemyHero", Multiplier: 2 }] }] },

  // TXT#32 -> 97 (Cyborg)
  { Id: 97, Name: "Jacek Miedź", Type: "Unit", Subtypes: ["Human"], Cost: 2, Attack: 2, Health: 3,
    Description: "While in Play: Adjacent Friendly Machines get +1 ATK.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "AuraBuff", Target: "AdjacentFriendlyUnits", Where: { Subtype: "Machine" }, BuffAtk: 1 }] }] },

  // TXT#33 -> 34 (Maid Mask)
  { Id: 34, Name: "Maid Mask", Type: "Unit", Subtypes: ["Human"], Cost: 2, Attack: 3, Health: 1,
    Description: "On Kill: Gain Soul Guard.",
    Effects: [{ Trigger: "OnKill",
      Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "SoulGuard" }] }] },

  // TXT#34 -> 37 (Archer)
  { Id: 37, Name: "Mars", Type: "Unit", Subtypes: ["Human"], Cost: 2, Attack: 1, Health: 4,
    Description: "Before Combat Here: Deal 1 Damage and apply Burning to the Enemy Unit.",
    Effects: [{ Trigger: "OnPreCombatLine",
      Actions: [{ Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 1 },
                { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Burning" }] }] },

  // TXT#35 -> 39 (Regifter)
   // TXT#35 -> 39 (Regifter)
  { Id: 39, Name: "Regifter", Type: "Unit", Subtypes: ["Aberration"], Cost: 2, Attack: 3, Health: 2,
    Description: "Sacrifice: Both Players Draw 2 Cards.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [
        { Type: "SacrificeUnit", Target: "TargetFriendlyUnit", Optional: true },
        { Type: "DrawCard", Target: "FriendlyHero", Amount: 2, OnlyIfSacrificed: true },
        { Type: "DrawCard", Target: "EnemyHero", Amount: 2, OnlyIfSacrificed: true },
      ] }] },

  // TXT#36 -> 35 (Cathullu Captain)
  { Id: 35, Name: "SwashBuckler", Type: "Unit", Subtypes: ["Aberration"], Cost: 2, Attack: 2, Health: 2,
    Description: "While in Play: When an Aberration deals Damage to the Enemy Hero, it gains +1/+1.",
    Effects: [{ Trigger: "OnDamagedEnemyHero",
      Condition: { Condition: "IsSubtype", TargetParam: "Aberration" },
      Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 }] }] },

  // TXT#37 -> 121 (Con Artist)
  { Id: 121, Name: "Teleportation Zombie", Type: "Unit", Subtypes: ["Aberration"], Cost: 2, Attack: 1, Health: 5,
    Description: "While in Play: You may play Units during the Action Phase.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "AllowUnitsInAction" }] }] },

  // TXT#38 -> 25 (Bounty Hunter)
  { Id: 25, Name: "Bounty Hunter", Type: "Unit", Subtypes: ["Human"], Cost: 3, Attack: 3, Health: 3,
    Description: "While in Play: When you mark an Enemy Unit, Stun it.",
    Effects: [{ Trigger: "OnStatusApplied",
      Condition: { Condition: "And", SubConditions: [
        { Condition: "IsStatus", TargetParam: "Marked" },
        { Condition: "IsEnemy" }] },
      Actions: [{ Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Stunned" }] }] },

  // TXT#39 -> 91 (Factoid Factory)  [MakeAUnit 16 -> 42 = Soldat]
  { Id: 91, Name: "BWP", Type: "Unit", Subtypes: ["Machine"], Cost: 3, Attack: 2, Health: 2,
    Description: "End of Round: Summon Soldat.",
    Effects: [{ Trigger: "OnEndOfRound",
      Actions: [{ Type: "MakeAUnit", ValueParam: 42 }] }] },

  // TXT#40 -> 92 (Unitslinger)
  { Id: 92, Name: "Deathslinger", Type: "Unit", Subtypes: ["Human", "Aberration"], Cost: 3, Attack: 2, Health: 5,
    Keywords: ["AntiAirborne"],
    Description: "While in Play: If an Enemy Unit is Played in a different Lane, move that Unit here. If it can't be moved here, deal 2 Damage to it instead.",
    Effects: [{ Trigger: "OnEnemyUnitPlayed",
      Condition: { Condition: "Not", SubConditions: [{ Condition: "SameLane" }] },
      Actions: [{ Type: "MoveToSourceLane", Target: "EventUnit",
                  Else: { Type: "DealDamage", Amount: 2, OncePerTurn: true } }] }] },

  // TXT#41 -> 95 (One-Punch Man)
  { Id: 95, Name: "One-Punch Man", Type: "Unit", Subtypes: ["Human"], Cost: 3, Attack: 3, Health: 2,
    Description: "While in Play: All Friendly Humans have Deadly.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Deadly",
                  Where: { Subtype: "Human" } }] }] },

  // TXT#42 -> 41 (Pegasus)
  { Id: 41, Name: "Pegasus", Type: "Unit", Subtypes: ["Animal"], Cost: 3, Attack: 3, Health: 2,
    Keywords: ["Flying"],
    Description: "When Played: Another Friendly Animal does a Bonus Attack.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BonusAttack", Target: "TargetFriendlyUnit", Where: { Subtype: "Animal" } }] }] },

  // TXT#43 -> 27 (Drawing Raptor)
  { Id: 27, Name: "Drawing Raptor", Type: "Unit", Subtypes: ["Animal", "Aberration"], Cost: 3, Attack: 2, Health: 4,
    Description: "While in Play: When you draw a Card, gain +1 ATK. When this hurts an Enemy Hero, Draw a Card.",
    Effects: [{ Trigger: "OnDamagedEnemyHero", Condition: { Condition: "IsSelf" },
      Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] },
    { Trigger: "OnFriendlyCardDrawn",
      Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }] }] },

  // TXT#44 -> 46 (Tea Maid)
  { Id: 46, Name: "Rem", Type: "Unit", Subtypes: ["Human"], Cost: 3, Attack: 1, Health: 4,
    Description: "While in Play: The first Action you play each Round costs 3 less.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "ModifyCost", Side: "Friendly", Amount: -3,
                  CardFilter: { Type: "Spell" }, FirstEachRound: true }] }] },

  // TXT#45 -> 5 (Queen of Cards)
  { Id: 5, Name: "Umbral Rose", Type: "Unit", Subtypes: ["Human"], Cost: 3, Attack: 2, Health: 4,
    Description: "While in Play: Whenever a Friendly Unit is Destroyed, Draw a Card.",
    Effects: [{ Trigger: "OnFriendlyUnitDied",
      Actions: [{ Type: "DrawCard", Target: "FriendlyHero" }] }] },

  // TXT#46 -> 16 (HellFire)
  { Id: 16, Name: "Hellfire", Type: "Spell", Cost: 4,
    Description: "Deal 2 Damage to all Enemy Units and apply Burning to them.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DealDamage", Target: "AllEnemyUnits", Amount: 2 },
                { Type: "ApplyStatus", Target: "AllEnemyUnits", StatusKeyword: "Burning" }] }] },

  // TXT#47 -> 113 (Soul Harvest)
  { Id: 113, Name: "Soul Harvest", Type: "Spell", Cost: 4,
    Description: "Draw the Units that were killed last Round. Deal Damage equal to the number of Cards drawn to an Enemy Unit or Hero.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DrawKilledLastRound" },
                { Type: "DealDamage", Target: "TargetEnemyUnitOrHero", AmountFrom: "CardsDrawn" }] }] },

  // TXT#48 -> 14 (Survivalist)
  { Id: 14, Name: "Cheryl Mason", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 2, Health: 3,
    Keywords: ["SoulGuard"],
    Description: "While in Play: All Friendly Units have Soul Guard.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "ApplyStatus", Target: "OtherFriendlyUnits", StatusKeyword: "SoulGuard" }] }] },

  // TXT#49 -> 20 (Genie)
  { Id: 20, Name: "Genie", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 2, Health: 3,
    Description: "When Played: Bounce a Unit.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "SelectedTarget",
      Actions: [{ Type: "ReturnToHand", Target: "SelectedTarget" }] }] },

  // TXT#50 -> 96 (Echo Chamber)
  { Id: 96, Name: "Himiko Toga", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 3, Health: 3,
    Description: "When Played: Trigger the \"When Played\" effect of each card You played this game.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "ReplayPlayed", Target: "Self" }] }] },

  // TXT#51 -> 94 (Imperial Dropship)
  { Id: 94, Name: "Imperial Dropship", Type: "Unit", Subtypes: ["Machine"], Cost: 4, Attack: 3, Health: 3,
    Keywords: ["Flying"],
    Description: "When Destroyed: Summon Stormtroopers in adjacent Lanes.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "MakeAUnit", ValueParam: 912, StringParam: "AdjacentLanes" }] }] },

  // TXT#52 -> 21 (Juggernaut)
  { Id: 21, Name: "Juggernaut", Type: "Unit", Subtypes: ["Machine"], Cost: 4, Attack: 4, Health: 2,
    Keywords: ["Armored"], KeywordParams: { Armored: 1 },
    Description: "When this deals Damage to an Enemy Unit: Deal 2 Damage to the Enemy Hero.",
    Effects: [{ Trigger: "OnDamagedEnemyUnit",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] }] },

  // TXT#53 -> 17 (Magician)
  { Id: 17, Name: "Megumin", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 3, Health: 2,
    Keywords: ["SplashDamage", "BurnSource"], KeywordParams: { SplashDamage: 3 },
    Description: "When this deals Damage to an Enemy Unit: Apply Burning to it." },

  // TXT#54 -> 26 (Occultist)
  { Id: 26, Name: "Occultist", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 2, Health: 4,
    Description: "Before Combat Here: Mark an Enemy Unit.",
    Effects: [{ Trigger: "OnPreCombatLine",
      Actions: [{ Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Marked" }] }] },

  // TXT#55 -> 98 (Door-Machine)
  { Id: 98, Name: "T34", Type: "Unit", Subtypes: ["Machine"], Cost: 4, Attack: 4, Health: 4,
    Keywords: ["Unactionable"], Description: "" },

  // TXT#56 -> 127 (Samurai)
  { Id: 127, Name: "Yae Sakura", Type: "Unit", Subtypes: ["Human"], Cost: 4, Attack: 2, Health: 3,
    Description: "While in Play: When you draw a Card, gain +1/+1. After Combat Here: Do a Bonus Attack.",
    Effects: [{ Trigger: "OnFriendlyCardDrawn",
      Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1, BuffHp: 1 }] },
    { Trigger: "OnPostCombatLine",
      Actions: [{ Type: "BonusAttack", Target: "Self" }] }] },

  // TXT#57 -> 115 (AI AL)
  { Id: 115, Name: "Al-An", Type: "Unit", Subtypes: ["Machine"], Cost: 5, Attack: 4, Health: 5,
    Description: "Before Combat Here: You may move it to a different Lane.",
    Effects: [{ Trigger: "OnPreCombatLine",
      Actions: [{ Type: "MoveLane", Target: "Self" }] }] },

  // TXT#58 -> 6 (The Jersey Demon)
  { Id: 6, Name: "Buff-Demon", Type: "Unit", Subtypes: ["Aberration"], Cost: 5, Attack: 2, Health: 2,
    Description: "When Played: For the rest of the game, all Friendly Units gain +1/+1.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "ModifyGlobalBuff", Target: "FriendlyHero", BuffAtk: 1, BuffHp: 1 }] }] },

  // TXT#59 -> 29 (Blighteinstein)
  { Id: 29, Name: "The Blight", Type: "Unit", Subtypes: ["Aberration"], Cost: 5, Attack: 5, Health: 6,
    Description: "On Kill: Move Right.",
    Effects: [{ Trigger: "OnKill",
      Actions: [{ Type: "MoveRight", Target: "Self", ThenAttack: true }] }] },

  // TXT#60 -> 23 (Chainsaw Guy)
  { Id: 23, Name: "Chainsaw Guy", Type: "Unit", Subtypes: ["Human", "Machine"], Cost: 6, Attack: 5, Health: 5,
    Keywords: ["SilenceImmune"],
    Description: "On Kill: Heal to full and gain +2 HP.",
    Effects: [{ Trigger: "OnKill",
      Actions: [{ Type: "HealToFull", Target: "Self" },
                { Type: "BuffStats", Target: "Self", BuffHp: 2 }] }] },

  // TXT#61 -> 125 (Grandfather Bomb)
  { Id: 125, Name: "Giant Skeleton", Type: "Unit", Subtypes: ["Aberration"], Cost: 5, Attack: 3, Health: 5,
    Description: "When Destroyed: Destroy all Enemy Units in this Lane and adjacent Lanes.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "DestroyUnit", Target: "SelfLaneEnemyAndAdjacentAny" }] }] },

  // TXT#62 -> 36 (Death)
  { Id: 36, Name: "Death", Type: "Unit", Subtypes: ["Human", "Aberration"], Cost: 5, Attack: 3, Health: 3,
    Keywords: ["SoulGuard"], Rule: "hpOneTrigger",
    Description: "Whenever a Friendly Unit is Destroyed or drops to 1 HP: Deal 2 Damage to the Enemy Hero.",
    Effects: [{ Trigger: "OnFriendlyUnitDied",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] },
    { Trigger: "OnFriendlyUnitHpOne",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 2 }] }] },

  // TXT#63 -> 33 (Mouse)
  { Id: 33, Name: "Mouse", Type: "Unit", Subtypes: ["Machine"], Cost: 5, Attack: 5, Health: 10,
    Description: "After Combat Here: Stun itself.",
    Effects: [{ Trigger: "OnPostCombatLine",
      Actions: [{ Type: "ApplyStatus", Target: "Self", StatusKeyword: "Stunned" }] }] },

  // TXT#64 -> 30 (SharkCannon)
  { Id: 30, Name: "Shark Cannon", Type: "Unit", Subtypes: ["Animal", "Machine", "Aberration"], Cost: 5, Attack: 0, Health: 7,
    Description: "Before Combat Here: Deal 5 Damage to the Enemy Hero.",
    Effects: [{ Trigger: "OnPreCombatLine",
      Actions: [{ Type: "DealDamage", Target: "EnemyHero", Amount: 5 }] }] },

  // TXT#65 -> 54 (Thor)
  { Id: 54, Name: "Thor", Type: "Unit", Subtypes: ["Human", "Machine"], Cost: 5, Attack: 0, Health: 4,
	Rule: "persistentGrowth",
    Description: "While in Hand, Deck, Discard or on Board: Gain +1 ATK whenever a Friendly Machine is Destroyed.",
    Effects: [{ Trigger: "OnFriendlyUnitDied",
      Zone: ["Deck", "Hand", "Discard", "Board"],
      Condition: { Condition: "IsSubtype", TargetParam: "Machine" },
      Actions: [{ Type: "BuffStats", Target: "Self", BuffAtk: 1 }] }] },

  // TXT#66 -> 24 (Gerard from Rivia)
  { Id: 24, Name: "Witcher", Type: "Unit", Subtypes: ["Human"], Cost: 5, Attack: 5, Health: 5,
    Description: "While in Play: When you mark an Enemy Unit, do a Bonus Attack.",
    Effects: [{ Trigger: "OnStatusApplied",
      Condition: { Condition: "And", SubConditions: [
        { Condition: "IsStatus", TargetParam: "Marked" },
        { Condition: "IsEnemy" }] },
      Actions: [{ Type: "BonusAttack", Target: "Self" }] }] },

  // TXT#67 -> 108 (Abyss Lector)
  { Id: 108, Name: "Abyss Lector", Type: "Unit", Subtypes: ["Aberration"], Cost: 6, Attack: 3, Health: 3,
    Description: "When Played: For each other Friendly Aberration, Conjure a Blessing. They cost 0 this Round.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero",
                  Filter: { Ids: [915, 916, 917, 918, 919, 920, 924, 926, 928, 934], Token: true },
                  Count: { Count: "FriendlyUnits", Subtype: "Aberration" },
                  FreeThisTurn: true }] }] },

  // TXT#68 -> 56 (Collector)
  { Id: 56, Name: "Collector", Type: "Unit", TokenGroup: "The Collection",
    Subtypes: ["Aberration"], Cost: 6, Attack: 2, Health: 6,
    Description: "When Played: Summon The Collection.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "MakeAUnit", ValueParam: 904 },
                { Type: "MakeAUnit", ValueParam: 905 },
                { Type: "MakeAUnit", ValueParam: 906 }] }] },

  // TXT#69 -> 53 (The Curtain Call)
  { Id: 53, Name: "Finale", Type: "Spell", Cost: 7,
    Description: "Destroy all Enemy Units on the Board.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DestroyUnit", Target: "AllEnemyUnits" }] }] },

  // TXT#70 -> 11 (The Creature)
  { Id: 11, Name: "The Creature", Type: "Unit",
    Subtypes: ["Animal", "Machine", "Aberration", "Human"], Cost: 7, Attack: 3, Health: 5,
    Keywords: ["Unkillable", "Unactionable"], Rule: "persistentGrowth",
    Description: "While in Hand, Deck or Discard: Costs 2 less whenever a Unit is Sacrificed.",
    Effects: [{ Trigger: "OnOtherUnitSacrificed",
      Zone: ["Deck", "Hand", "Discard"],
      Actions: [{ Type: "BuffStats", Target: "Self", Amount: -2 }] }] },

  // TXT#71 -> 47 (Rustler)
  { Id: 47, Name: "Rustler", Type: "Unit", Subtypes: ["Human"], Cost: 10, Attack: 6, Health: 6,
    Rule: "persistentGrowth",
    Description: "While in Hand, Deck or Discard: Costs 1 less for each Action You played this game. When Played: Do a Bonus Attack.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BonusAttack", Target: "Self" }] },
    { Trigger: "OnFriendlyActionPlayed",
      Zone: ["Deck", "Hand", "Discard"],
      Actions: [{ Type: "BuffStats", Target: "Self", Amount: -1 }] }] },

  // TXT#72 -> 118 (Pay To Win)
  { Id: 118, Name: "EA", Type: "Spell", Cost: 0,
    Description: "Spend all your Blood. The Enemy Hero loses Blood equal to the amount you spent.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "LoseBlood", Target: "EnemyHero", Amount: { Count: "Blood" } },
                { Type: "SpendBlood", Target: "FriendlyHero" }] }] },

  // TXT#73 -> 89 (Bloodblot)
  { Id: 89, Name: "Blooblob", Type: "Unit", Subtypes: ["Aberration"], Cost: 0, Attack: 0, Health: 2,
    Description: "When Played: Spend all of your Blood. Gain +1/+1 for each Blood spent.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BuffStats", Target: "Self",
                  BuffAtk: { Count: "Blood" }, BuffHp: { Count: "Blood" } },
                { Type: "SpendBlood", Target: "FriendlyHero" }] }] },

  // ==================== TOKENS (bez zmian) ====================

  {
    Id: 900, Name: "The Tempting Goblet", Type: "Spell", Subtypes: ["Token"], Cost: 1,
    Description: "Give a Friendly Unit Unkillable, then Sacrifice it.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Unkillable" },
        { Type: "SacrificeUnit", Target: "SelectedTarget" },
      ] }],
  },

  { Id: 901, Name: "Royal Soldier", Type: "Unit", Subtypes: ["Aberration", "Token"], Cost: 1, Attack: 1, Health: 1, Description: "" },

  {
    Id: 902, Name: "Sacrificial Dagger", Type: "Spell", Subtypes: ["Token"], Cost: 1,
    Description: "Sacrifice a Friendly Unit. Draw a Card.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "SacrificeUnit", Target: "SelectedTarget" },
                { Type: "DrawCard", Target: "FriendlyHero" }] }],
  },

  {
    Id: 903, Name: "Trap", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 0, Attack: 0, Health: 1,
    Description: "When Destroyed: Stun the Enemy Unit opposite it.",
    Effects: [{ Trigger: "OnDeath",
      Actions: [{ Type: "ApplyStatus", Target: "OppositeEnemyUnit", StatusKeyword: "Stunned" }] }],
  },

  {
    Id: 904, Name: "SE", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 1, Health: 3,
    Keywords: ["Taunt"],
    Description: "While in Play: All Friendly Units have Armored 1.",
    Effects: [{ Trigger: "Passive", Zone: "Board",
      Actions: [{ Type: "GrantKeyword", Target: "AllFriendlyUnits", Keyword: "Armored" }] }],
  },

  { Id: 905, Name: "Janal", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 2, Health: 2, Keywords: ["Lifesteal"], Description: "" },

  {
    Id: 906, Name: "Front Man", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 3, Health: 1,
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

  { Id: 908, Name: "Sister", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 1, Attack: 1, Health: 4, Keywords: ["Lifesteal"], Description: "" },

  {
    Id: 909, Name: "The Titan", Type: "Unit", Subtypes: ["Token", "Machine"], Cost: 4, Attack: 10, Health: 20,
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

  { Id: 912, Name: "Stormtrooper", Type: "Unit", Subtypes: ["Human", "Token"], Cost: 1, Attack: 2, Health: 2, Description: "" },

  {
    Id: 913, Name: "Slot-Machine", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 2, Health: 5,
    Description: "When Hurt: Conjure a random Machine. It costs 1 less.",
    Effects: [{ Trigger: "OnFriendlyUnitDamaged", Condition: { Condition: "IsSelf" },
      Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero",
        Filter: { Type: "Unit", Subtype: "Machine" }, CostChange: -1 }] }],
  },

  {
    Id: 914, Name: "Cinder Ash", Type: "Spell", Subtypes: ["Token"], Cost: 0,
    Description: "Deal Damage to a Friendly Unit or Your Hero equal to the number of Cinder Ash You have played this game. Start of Round: If this is in Your Hand, gain a copy of Cinder Ash.",
    Effects: [
      { Trigger: "OnPlayed", Targeting: "TargetFriendlyUnitOrHero",
        Actions: [{ Type: "DealDamage", Target: "SelectedTarget", Amount: { Count: "AshesPlayed" } }] },
      { Trigger: "OnStartOfRound", Zone: "Hand",
        Actions: [{ Type: "AddCardToHand", Target: "FriendlyHero", ValueParam: 914 }] },
    ],
  },

  {
    Id: 915, Name: "Blessing of Might", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Give a Friendly Unit +3/+3.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [{ Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 3, BuffHp: 3 }] }],
  },

  {
    Id: 916, Name: "Blessing of Warding", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Give a Friendly Unit Soul Guard and +1/+1.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "SoulGuard" },
        { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 1, BuffHp: 1 },
      ] }],
  },

  {
    Id: 917, Name: "Blessing of Mending", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Heal Your Hero for 4 and all Friendly Units for 4.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [
        { Type: "Heal", Target: "FriendlyHero", Amount: 4 },
        { Type: "Heal", Target: "AllFriendlyUnits", Amount: 4 },
      ] }],
  },

  {
    Id: 918, Name: "Blessing of Wisdom", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Draw 2 Cards.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DrawCard", Target: "FriendlyHero", Amount: 2 }] }],
  },

  {
    Id: 919, Name: "Blessing of Vengeance", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Deal 3 Damage to an Enemy Unit and 1 Damage to the Enemy Hero.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetEnemyUnit",
      Actions: [
        { Type: "DealDamage", Target: "TargetEnemyUnit", Amount: 3 },
        { Type: "DealDamage", Target: "EnemyHero", Amount: 1 },
      ] }],
  },

  {
    Id: 920, Name: "Blessing of Silence", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Silence an Enemy Unit and Stun it.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetEnemyUnit",
      Actions: [
        { Type: "Silence", Target: "TargetEnemyUnit" },
        { Type: "ApplyStatus", Target: "TargetEnemyUnit", StatusKeyword: "Stunned" },
      ] }],
  },

  {
    Id: 924, Name: "Blessing of Fortitude", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Your Hero gains +3 Max HP and heals 4.",
    Effects: [{ Trigger: "OnPlayed", Actions: [
      { Type: "IncreaseMaxHp", Target: "FriendlyHero", Amount: 3 },
      { Type: "Heal", Target: "FriendlyHero", Amount: 4 },
    ] }],
  },

  {
    Id: 926, Name: "Blessing of Meteors", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Deal 2 Damage to all Enemy Units.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "DealDamage", Target: "AllEnemyUnits", Amount: 2 }] }],
  },

  {
    Id: 928, Name: "Blessing of Revival", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Summon a Random Friendly Unit that costs 3 or less from Your Discard Pile.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "Reanimate", Filter: { MaxCost: 3 } }] }],
  },

  {
    Id: 934, Name: "Blessing of Wings", Type: "Spell", Subtypes: ["Token"], Cost: 2,
    Description: "Give a Friendly Unit Flying and +2/+1.",
    Effects: [{ Trigger: "OnPlayed", Targeting: "TargetFriendlyUnit",
      Actions: [
        { Type: "ApplyStatus", Target: "SelectedTarget", StatusKeyword: "Flying" },
        { Type: "BuffStats", Target: "SelectedTarget", BuffAtk: 2, BuffHp: 1 },
      ] }],
  },

  {
    Id: 935, Name: "Sentry Gun", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 1, Attack: 1, Health: 2,
    Description: "While in Your Hand: When You play 2 Machine Cards, Transform this into Sentry Minigun.",
    Effects: [{ Trigger: "OnFriendlyCardPlayed", Zone: "Hand", Count: 2,
      Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
      Actions: [{ Type: "TransformInHand", Into: 936 }] }],
  },

  {
    Id: 936, Name: "Sentry Minigun", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 2, Attack: 3, Health: 2,
    Description: "While in Your Hand: When You play 2 Machine Cards, Transform this into Missile Gun.",
    Effects: [{ Trigger: "OnFriendlyCardPlayed", Zone: "Hand", Count: 2,
      Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
      Actions: [{ Type: "TransformInHand", Into: 937 }] }],
  },

  {
    Id: 937, Name: "Missile Gun", Type: "Unit", Subtypes: ["Machine", "Token"], Cost: 4, Attack: 3, Health: 3,
    Keywords: ["SplashDamage"], KeywordParams: { SplashDamage: 1 },
    Description: "While in Your Hand: When You play 2 Machine Cards, Transform this into Mini Sentry.",
    Effects: [{ Trigger: "OnFriendlyCardPlayed", Zone: "Hand", Count: 2,
      Condition: { Condition: "PlayedSubtype", TargetParam: "Machine" },
      Actions: [{ Type: "TransformInHand", Into: 938 }] }],
  },

  {
    Id: 938, Name: "Mini Sentry", Type: "Unit", Subtypes: ["Anime", "Machine", "Token"], Cost: 5, Attack: 2, Health: 3,
    Description: "When Played: All Friendly Machines do a Bonus Attack.",
    Effects: [{ Trigger: "OnPlayed",
      Actions: [{ Type: "BonusAttack", Target: "AllFriendlyUnits", Where: { Subtype: "Machine" } }] }],
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
