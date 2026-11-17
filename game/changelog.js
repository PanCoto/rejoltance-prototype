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

   Updates menu: "Patch Notes" shows every section EXCEPT balance ones; "Balance Changes" shows only sections whose
   title starts with "Balance" or "Card Changes" (put card stat / text changes there, everything else elsewhere).
   An entry with nothing for a page is skipped on that page.

   Also update GAME_VERSION / GAME_VERSION_EXP below so the main menu label matches.
   ============================================================ */
const GAME_STAGE='Pre-alpha',GAME_VERSION='0.0.3',GAME_VERSION_EXP='PTB 0.0.2';
const CHANGELOG=`
## v0.0.3 - 2026-11-16
### UI Overhaul
- The game uses now the **new** main menu on both the standard and experimental branches of the game.
- The main menu is now a list of sections on the left (Play offline, Play online, Collection, Settings, Social, Extras, Updates) with a panel of cards on the right. Click a section to open its panel, click it again to close it.
- Menu keyboard controls: Up/Down change the section, Right/Left move between the cards, Enter confirms and Esc closes the panel.
- Everything was regrouped: Tutorial, Play with the bot, Mirror Match UP and Endless Mode are under Play offline; Ranked, Quick Match, Play with a friend and online Mirror Match UP under Play online; Profile and Friends under Social; Achievements under Extras.
- The old pop-up windows are gone. Ranked, Quick Match / Play with a friend, Mirror Match, Play with the bot, Endless Mode, Tutorial, Settings, Profile, Friends, Achievements and the lobby now open as full screens like the Card Collection, with the Back button in the top left corner.
- **Updates** (previously News) has two pages: **Patch Notes** (new content, changes and fixes) and **Balance Changes** (only card balance changes).
- **Mirror Match UP** offline now starts straight away against the bot. Hosting or joining a Mirror Match is available under Play online.
- **Quick Match** is now a separate card in Play online.
- The Tutorial text (how a round works) has its own screen instead of being shown in the menu.
- Added the shortcut to the "Decks" screen through: collection -> decks.
- The version label under the game title is scaled to the width of the title.
- Added the ability to watch the games between the bots on the Main Menu. Bots play automatically in the dimmed background; the "Watch bots" button hides the menu so you can follow the match with sound and music (Esc, Enter or Space returns to the menu).
### Tutorial
- New **guided tutorial** (Play offline -> Tutorial -> Start tutorial): a short, fully scripted match against a Training Bot that holds your hand through the basics with pop-ups. It highlights what to click and only lets you do the step it asks for. It takes about 5 minutes.
- It covers the goal and the Heroes, the lanes, your hand, deck and discard pile, how to read a card, Mulligan, Blood, the phases of a round, playing Units and Actions, targeting, Mark, Taunt, Flying and how Combat resolves lane by lane.
- Nothing in it is random: the cards, the draw order and the opponent's moves are fixed. The tutorial uses its own copies of the cards, so card balance changes never affect it. **Exit tutorial** (bottom left) leaves at any time.
- The Tutorial card in the menu is marked NEW until you finish the tutorial once.
### Music
- New main menu theme and a separate calmer theme for the Collection / Decks screen. The themes crossfade when you switch screens and follow the Music volume slider.
- In "Watch bots" mode the in-game music plays; the background match on the menu is silent.
### New Cards
[[cards: 121, 122]]
- **Con Artist** (Aberration, 3 cost, 1/4): While in Play: You may play Units during Action phase. Normally Units can only be played in the Unit phases.
- **Nesting Doll** (Human, 6 cost, 5/3): When Destroyed: Create a copy of this Unit here with -1/-1. It keeps coming back until its max Health would drop below 1, so a 3 Health Doll has to be destroyed 3 times (Silence stops the chain). The artwork changes after each death.
- New premade deck: AshesTempo, built around **Cinderwright**.
### Balance Changes
- {{107}} [RENAME] : **The Lighter** renamed to **Cinderwright**.
- {{914}} [RENAME] : **Ashes from Clashes** renamed to **Cinder Ash**.
- **Cinderwright** [REWORK] : "When Played: The Enemy Hero gains 2 Cinder Ash. When this Does Damage: Shuffle 2 Cinder Ash to the Enemy's deck." -> "When Played: The Enemy Hero gains **a copy of Cinder Ash**, and You shuffle **a copy of Cinder Ash** into the Enemy's deck. When this deals Damage: Shuffle 2 copies of Cinder Ash into the Enemy's deck."
- **Cinder Ash** [REWORK] : "Deal 1 Damage to a Friendly Unit or Friendly Hero." -> "Deal damage to a Friendly Unit or Friendly Hero **equal to the number of Cinder Ash You have played this game**." Only Cinder Ash played by the player who received them count. The first one deals 1, the second 2, the third 3 and so on.
- **The Tempting Goblet** [NERF] : A Friendly Unit sacrificed to The Tempting Goblet now costs **1 more each time it returns to Your Hand from being Destroyed** (previously each Return cost the same as the first).
- **Bone Baronet** [REWORK] : Health 1 -> **3**, "When Destroyed: Gain The Tempting Goblet." -> "When Destroyed: **Shuffle** The Tempting Goblet **into Your Deck**."
- **Black Cat** [BUFF] : Cost 1 -> **0**, Attack 1 -> **0**, "When Sacrificed: Return to Your Hand instead. It costs 1 more this turn." -> "When Sacrificed: Return to Your Hand instead. It costs **1 more** this turn."
### Fixes
- The Host / Join / Quick Match screens no longer build up piece by piece. While the room is being created or the connection is opening they show a short loading line, then the whole screen appears at once.
- Bots playing in the menu background think faster, so they do not slow the menu down.
### Known Issues
- When starting a match against the bot/player there is a chance that the visual artifacts from the main menu simulation will be displayed on board (such us lane glowing red until the combat starts in that lane).
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
## v0.0.3 - 2026-11-16
### UI Overhaul
- The new main menu (sections on the left, cards on the right, keyboard controls, Watch bots mode, Decks shortcut in the Collection) is now also used on the experimental branch. See the standard changelog for the full list.
### Tutorial
- The new guided tutorial (Play offline -> Tutorial -> Start tutorial) is also available on the experimental branch. See the standard changelog for details.
### Music
- New main menu and Collection / Decks screen themes.
### New Cards
[[cards: 121, 122]]
- **Con Artist** (Aberration, 3 cost, 1/4): While in Play: You may play Units during Action phase.
- **Nesting Doll** (Human, 6 cost, 5/3): When Destroyed: Create a copy of this Unit here with -1/-1. It keeps coming back until its max Health would drop below 1, so a 3 Health Doll has to be destroyed 3 times (Silence stops the chain). The artwork changes after each death.
## PTB - Max copies test
### Deck Building
- New setting **Max 2 copies per card** (Settings, only shown while Experimental changes are on). When it is on, player-built decks can have at most 2 copies of the same card.
- Premade decks are exempt. Your saved decks with 3 copies stay in your list marked **Over limit**, but cannot be played until you edit them.
- Online: both players must have the setting on or off.
`;