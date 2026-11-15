/* ============================================================
   Version + changelogs. Edit only this file to publish updates.
   There are TWO separate changelogs: CHANGELOG (normal build) and CHANGELOG_EXP
   (shown instead when "Experimental changes" is on in Settings).

   Format (newest entry FIRST):
     ## v1.0.1 - 2026-11-12        <- version - date (date optional)
     ### Balance                   <- optional section title
     - **Card Name**: Cost 3 -> 2  <- **bold** works anywhere
     plain lines become paragraphs

   Showing cards:
     - A **bold** text that is exactly a card name becomes hoverable: the card pops up.
     - {{Card Name}} or {{123}} (name or card Id) does the same without bold text.
     - A line on its own like   [[cards: Black Cat, 101, Morsel]]   shows those cards
       as a row of pictures (hover one to zoom it). Use it under a "### New Cards" title.
     Names are looked up in the cards of the build being viewed, so in CHANGELOG use
     cards.js cards and in CHANGELOG_EXP use cards-exp.js cards. Unknown names stay plain text.

   Also update GAME_VERSION / GAME_VERSION_EXP below so the main menu label matches.
   ============================================================ */
const GAME_STAGE='Pre-alpha',GAME_VERSION='0.0.2',GAME_VERSION_EXP='PTB 0.0.2';
const CHANGELOG=`
## v0.0.2 - 2026-11-15
### Balance Overhaul
- The whole card pool was rebalanced. **Most cards are now more expensive**: 86 of the 113 existing cards cost more (usually +1, strong cards +2), and none got cheaper. This replaces the card values listed in older entries; hover a card to see its current stats.
- Biggest price hikes (+2): **Mouse** (now 5 cost, 5/12), **Widows Spider**, **Thor**, **Double Tap**, **Mindstrucker**, **One-Punch Man**, **Chainsaw Guy** and **Blighteinstein**.
- 31 cards had their Attack and/or Health changed, mostly to compensate for the new costs.
- About 70 card descriptions were reworded and several abilities were reworked.
- 19 cards were renamed (for example Librarian is now **Mindstrucker**, Therapist is now **Synth-Medic** and Knockback is now **Knock-out**).
### New Cards
- 20 new cards. Hover a card to zoom it.
[[cards: 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]]
### New Tokens
- Created by other cards (they cannot be put in decks).
[[cards: 913, 914, 935, 936, 937, 938, 915, 916, 917, 918, 919, 920, 924, 926, 928, 934]]
### Fixes
- **Soul Harvest** now draws the Units destroyed last round from both your discard pile and the enemy's (yours first, up to a full hand) and deals damage equal to the cards drawn.
- Online: fixed a desync where, when a Hero died during combat (for example to Deadbeat), the owner got the Defeat screen but the opponent stayed stuck in the combat phase.
- Changelog: numbers (for example "Health 1 -> 2") no longer pop up a card by accident.
- New premade deck: NewCardsShowcase, built from the new cards.
## v0.0.1 - 2026-11-10
### Card Changes
- **Adaptive Unit** [BUFF] : Health 1 -> **2**
- **Echo Chamber** [BUFF] : Cost 5 -> **4**
- **Aura** [BUFF] : "When Played: Heal Your Hero and all Friendly Units for 2." -> "When Played: Increase Your Hero's Max HP by 2. Heal Your Hero and all Friendly Units for 2."
- **Morsel** [REWORK] : Health 2 -> **1**, "When Played: Other Friendly Animals gain +1 HP." -> "When Played: Other Friendly Animals gain **+1 ATK**."
- **Black Cat** [REWORK] : Cost 0 -> **1**, Attack 0 -> **1**, "When Sacrificed: Return to Your Hand instead." -> "When Sacrificed: Return to Your Hand instead. It costs 0 this turn."
- **Exploding Present** [NERF] : Cost 2 -> **3**, "The Enemy Hero gains a copy of this card that costs 1 more." -> "The Enemy Hero gains a copy of this card that costs **2** more."
- **Tea Maid** [REWORK] : Cost 2 -> **3**, Attack 2 -> **1**, Health 1 -> **4**, "While in Play: Your Spells cost 1 less." -> "While in Play: The first Spell you play each round costs 2 less."
- **Dual Wield** [REWORK] : "Your next Spell is played twice." -> "**Conjure a random Spell.** Your next Spell is played twice."
- **Unitslinger** [NERF] : "If it can't move, deal 2 damage to it instead." -> "If it can't move, deal 2 damage to it instead (**once each round**)."
- **Stunning Blow** [REWORK] : Renamed to **Knockback**. "Deal 2 damage to an Enemy Unit and Stun it." -> "**Return an Enemy Unit to its owner's Hand. It costs 1 more.**"
- **Pegasus** [REWORK] : "When Played: Do a Bonus Attack." -> "When Played: **Another** Friendly Animal does a Bonus Attack."
### Fixes
- **Echo Chamber** now supports sacrifice effects. Every "When Played: You may Sacrifice a Friendly Unit" card you have played can be replayed with **one** shared sacrifice: pick a Friendly Unit once and all of their sacrifice payouts (damage, stat gain, extra draws...) use it.
- Units summoned by a replayed effect (for example a unit created by Echo Chamber replaying Attentive Parent) now trigger their own When Played, and you can choose to Sacrifice a unit for them.
- Heroes now have a Max HP (20 by default), so heals and Lifesteal respect increases to it.
## v0.0.0 - 2026-11-09
### Card Changes
-  **Rustler** [NERF] : Cost 10 -> **12**
- **The Pale** [REWORK] : "Silence all Units." -> "Summon an exact copy of a friendly unit that costs 4 or less in an empty lane of your choice."
- **Excistion Conjure** [REWORK] : Cost 4 -> **2**, "All Enemy Units get -2 ATK." -> "Enemy Units here and in adjacent lanes get -2 ATK this round. Draw a Card."
- **Echo Chamber** [NERFED] : Cost 4 -> **5**
### Fixes
- Summoned / Transformed / Revived units with when played abilities will now do them correclty, letting the owner target the unit of their choosing if such targeting is required.
`;

const CHANGELOG_EXP=`
## PTB - Max copies test
### Deck Building
- New setting **Max 2 copies per card** (Settings, only shown while Experimental changes are on). When it is on, player-built decks can have at most 2 copies of the same card.
- Premade decks are exempt. Your saved decks with 3 copies stay in your list marked **Over limit**, but cannot be played until you edit them.
- Online: both players must have the setting on or off.
`;
