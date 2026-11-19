/* ============================================================
   Version + changelogs. Edit only this file to publish updates.
   There are TWO separate changelogs: CHANGELOG (normal build) and CHANGELOG_EXP
   (shown instead when the Legacy version is on - Extras -> Legacy).

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
     cards.js cards and in CHANGELOG_EXP use cards-legacy.js cards. Unknown names stay plain text.

   Updates menu: "Patch Notes" shows every section EXCEPT balance ones; "Balance Changes" shows only sections whose
   title starts with "Balance" or "Card Changes" (put card stat / text changes there, everything else elsewhere).
   An entry with nothing for a page is skipped on that page.

   Balance patches have their own numbering, independent of the game version (a balance patch can go live without a game update).
   On the "Balance Changes" page every entry that has balance sections is shown as "Balance Patch N" + its date (the version is not shown).
   N is counted automatically, oldest entry = 1. To set the number yourself, or to publish a balance patch with no game update, add an
   entry of its own:
     ## Balance Patch 12 - 2026-11-17
     ### Balance Changes
     - **Card Name**: Cost 3 -> 2
   Later balance entries continue from that number. An entry with only balance sections does not appear on the Patch Notes page.
   Both pages show one folding bar per entry (the newest is open, the rest are folded; the player can open / fold them).

   Also update GAME_VERSION / GAME_VERSION_EXP below so the main menu label matches.
   ============================================================ */
const GAME_STAGE='Pre-alpha',GAME_VERSION='0.0.4',GAME_VERSION_EXP='LEGACY 0.0.4';
const CHANGELOG=`
## v0.0.4 - 2026-11-17
### New Keyword
- **Dodge**: A Unit with Dodge ignores the first damage instance it would take, then its Dodge value goes down by 1. Gaining Dodge again adds to the value (Dodge 2 ignores two hits). Silence removes it.
### New Cards
[[cards: 123, 124, 125, 126, 127, 128, 129, 130]]
- **Skeleton Dancer** (Aberration, 7 cost, 2/2): After Combat Here: Deal 4 Damage to an Enemy Unit in this lane. Start of Turn and when Played: Gain +1 Dodge.
- **Last Call** (Action, 1 cost): This Round, You may play a Unit during the Action Phase. It can only be played in the Action Phase and expires at the end of the round. Con Artist and Bug Knight are used first, so they never waste it.
- **Grandfather Bomb** (Machine, 8 cost, 6/6): When Destroyed: Destroy all Enemy Units in this lane and adjacent lanes.
- **Bandit** (Human, 2 cost, 1/3): When this deals Damage to an Enemy Unit: Stun it.
- **Samurai** (Human, 5 cost, 2/3): While in Play: When You draw a Card, gain +1/+1. After Combat Here: Do a Bonus Attack.
- **Ember Drake** (Machine / Animal, 1 cost, 1/1): When this deals Damage to an Enemy Unit: Apply Burning to it.
- **T34** (Machine, 5 cost, 4/4): Unactionable.
- **Parasol Couple** (Aberration, 4 cost, 1/6): Unactionable. While in Play: Adjacent Friendly Units have Unactionable.
### Spectating
- Anyone can now **watch** a room game live: Play with a friend -> **Watch a Game**, enter the room code (or open the link ?watch=CODE). The **Watch** button in the game header copies that link and shows how many people are watching.
- There is **no limit** on the number of spectators: viewers relay the game to each other, so the players' connection is not affected.
- Spectators only see face-down cards in both hands and decks. They get the replay player's LIVE mode: pause, step back, and jump back to live at any time.
- **Watch a friend**: when a friend is in a room game or a friend challenge, a **Watch** button appears next to them in the Friends list and on their profile. Turn this off with **Settings -> Let friends watch my games**. Ranked and Quick Match games cannot be watched.
### Replays
- Every finished game is now saved automatically as a **replay** (Extras -> Replays): vs the bot, Mirror Match, Quick Match, Ranked and friend / room games. Tutorial and Endless Mode are not recorded.
- The Replays screen lists your saved games with the result, opponent, mode, date, number of rounds and game version. **Watch** plays a replay on the board with a hand band for each player and their draw and discard piles (click a pile to see its cards), cards flying from the hand to the board, and the opponent's hand and deck revealed after the game.
- Replay player controls: play / pause (Space), step back / forward (Left / Right arrows), previous / next round, a seek slider and playback speed 0.5x - 4x. Esc or Exit replay leaves it.
- **Keep** marks a replay so it is never removed automatically, **Save file** exports it as a .rjreplay file to share, **Import file** loads one, **Delete** removes it.
- Replays are stored in your browser (compressed). By default the latest 20 are kept; when the browser storage is full the oldest ones that are not marked Kept are removed first.
### Settings
- Settings now has two tabs: **General** (decks, card numbers, volume) and **Replays**.
- **Replays** tab: turn recording on / off, choose how many of the latest replays to keep (5, 10, 20, 30 or 50), choose which games are recorded (against the bot, Mirror Match, Ranked, Quick Match, friend and room games), see how many replays are stored and how much space they take, and delete all replays that are not marked as Kept.
- Lowering the limit removes the oldest replays that are not marked as Kept (it asks first). Turning recording on in the middle of a game does not record that game, because the replay would start half-way.
- **Show card numbers (hotkeys 1-8)**: shows a small number above each card in your hand; press that number to select the card.
- **Hide premade decks in my deck lists** and **Random includes Premade decks** control which decks the deck pickers and the Random button use.
## Balance Patch 5 - 2026-11-17
### Balance Changes
- **Archer** [NERF] : Health 4 -> **3**.
- **Unitslinger** [BUFF] : Cost 5 -> **4**, Attack 3 -> **2**, gained **AntiAirborne**.
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
### Balance Changes
- **The big slowdown.** The original card pool was fully rebalanced in this patch. Guiding principle: push almost every cost up by 1 (and the biggest offenders by 2) to slow the game down, then adjust stats, keywords and effects on the cards that would otherwise become unplayable at the new price.
- **Cost increases.** 86 of the 113 existing cards cost more; none got cheaper in this patch. Eleven cards got **+2**: {{23}} (4 -> 6), {{29}} (5 -> 7), {{33}} (3 -> 5), {{40}} (3 -> 5), {{54}} (3 -> 5), {{68}} (4 -> 6), {{81}} (2 -> 4), {{82}} (2 -> 4), {{88}} (3 -> 5), {{92}} (3 -> 5), {{95}} (2 -> 4). The other 74 originals and {{902}} got +1. The 13 originals that kept their cost: {{2}}, {{4}}, {{7}}, {{9}}, {{13}}, {{45}}, {{50}}, {{51}}, {{61}}, {{77}}, {{78}}, {{86}}, {{89}}, {{93}}.
- **Stat redistribution (31 cards).** To compensate for the new costs. Highlights: {{23}} 4/4 -> 5/5, {{29}} 5/6 -> 7/5, {{33}} 6/6 -> 5/12, {{48}} 2/2 -> 1/3, {{88}} 2/2 -> 2/4, {{95}} 2/2 -> 1/3. Smaller bumps to the cheap slots: {{1}} hp 2 -> 3, {{39}} hp 1 -> 2, {{75}} hp 1 -> 2, {{76}} atk 1 -> 2; and small nerfs to keep tempo reasonable: {{2}} hp 2 -> 1, {{4}} hp 2 -> 1, {{78}} hp 2 -> 1, {{83}} hp 2 -> 1, {{89}} hp 2 -> 1. See the individual cards for the full list.
- **Keyword changes.** {{22}}, {{24}}, {{37}}, {{44}} and {{54}} gained **AntiAirborne**. {{43}} lost **Unactionable** (it can now be silenced, bounced and buffed like a normal unit). {{64}} gained **Taunt**.
- **Effect reworks:**
  - **Black Rabbitlings** [REWORK] : death heal now targets **a Friendly Unit or Your Hero** (was: Your Hero only).
  - **Survivalist** [REWORK] : now grants Soul Guard to **all** Friendly Units (including itself); previously it only applied to the others.
  - **Silence** [NERF] : can now only target **enemy** units (was: any unit).
  - **Dagger Throw** [NERF] : can no longer target the Enemy Hero; only enemy units.
  - **Tea Maid** [BUFF] : first-Action discount increased **2 -> 3** to compensate for the +1 cost.
  - **Thor** [REWORK] : growth zone expanded to **deck, hand, discard and board**.
  - **Synth-Medic** [REWORK] : was "fully heal a Friendly Unit; +0/+2 if a Machine is on board". Now "heal a Friendly Unit **or Your Hero** for 4; if another Machine is on board, a unit healed this way also gets **+2 HP**".
  - **Attentive Parent** [BUFF] : now summons Aberrations up to cost **2** (was: up to 1).
  - **Unitslinger** [CLARIFY] : description changed from "played in another lane" to "moves" — the trigger is still OnEnemyUnitPlayed.
  - **Corpse Eater** [CLARIFY] : "Play this in its lane" -> "Play this in its place".
- **Subtype changes.** {{5}} lost Aberration. {{8}} gained Human. {{22}} lost Aberration. {{23}} is now Human/Machine. {{27}} gained Animal. {{34}} gained Aberration. {{36}} gained Human. {{60}} gained Animal. {{78}} is now Human (was: Animal). {{80}} is now Animal. {{82}} is now Animal. {{87}} gained Animal. {{88}} lost Human. {{94}} lost Animal. {{96}} gained Machine.
- **Renames (19 cards).** {{8}} Clockwork Knight -> **Knight**. {{42}} Mechanic -> **Artificer**. {{48}} Butcher of Gluttony -> **Butcher**. {{62}} Therapist -> **Synth-Medic**. {{64}} Black Dog -> **Black Goat**. {{65}} Ritualist -> **Cuckooist**. {{70}} Titan Head -> **Titan's Head**. {{71}} Titan Torso -> **Titan's Torso**. {{72}} Titan Left Arm -> **Titan's Left Arm**. {{73}} Titan Right Arm -> **Titan's Right Arm**. {{77}} Black Widow Spider -> **Black Spider**. {{78}} Acolyte -> **Cultist**. {{82}} Librarian -> **Mindstrucker**. {{85}} Knockback -> **Knock-out**. {{86}} Disintergrade -> **Disintegrade** (spelling). {{88}} FireGirl -> **Fireplant**. {{91}} Factory -> **Factoid Factory**. {{98}} Doorman -> **Door-Machine**. {{901}} Royal Souldier -> **Royal Soldier** (spelling).
- **Token changes.** {{902}} now costs **1** (was 0) and also **draws a card**. {{903}} now costs **0** (was 1). {{900}} The Tempting Goblet was not touched in this patch (see 0.0.3).
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
  // ## v0.0.3 - 2026-11-16
  // ### UI Overhaul
  // - The new main menu (sections on the left, cards on the right, keyboard controls, Watch bots mode, Decks shortcut in the Collection) is now also used on the experimental branch. See the standard changelog for the full list.
  // ### Tutorial
  // - The new guided tutorial (Play offline -> Tutorial -> Start tutorial) is also available on the experimental branch. See the standard changelog for details.
  // ### Music
  // - New main menu and Collection / Decks screen themes.
  // ### New Cards
  // [[cards: 121, 122]]
  // - **Con Artist** (Aberration, 3 cost, 1/4): While in Play: You may play Units during Action phase.
  // - **Nesting Doll** (Human, 6 cost, 5/3): When Destroyed: Create a copy of this Unit here with -1/-1. It keeps coming back until its max Health would drop below 1, so a 3 Health Doll has to be destroyed 3 times (Silence stops the chain). The artwork changes after each death.
  // ## v0.0.4 - 2026-11-17
  // ### Replays
  // - Finished games are now saved as replays (Extras -> Replays) on the experimental branch as well, and Settings has a new **Replays** tab (recording on / off, how many replays to keep, which game types to record). See the standard changelog for details.
  // ## Legacy - Max copies option
  // ### Deck Building
  // - New setting **Max 2 copies per card** (Settings, only shown while the Legacy version is on). When it is on, player-built decks can have at most 2 copies of the same card.
  // - Premade decks are exempt. Your saved decks with 3 copies stay in your list marked **Over limit**, but cannot be played until you edit them.
  // - Online: both players must have the setting on or off.
`;
