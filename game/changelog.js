/* ============================================================
   Version + changelog. Edit only this file to publish updates.

   Format (newest entry FIRST):
     ## v1.0.1 - 2026-11-12        <- version - date (date optional)
     ### Balance                   <- optional section title
     - **Card Name**: Cost 3 -> 2  <- **bold** works anywhere
     plain lines become paragraphs

   Also update GAME_VERSION below so the main menu label matches.
   ============================================================ */
const GAME_STAGE='Pre-alpha',GAME_VERSION='1.0.1';
const CHANGELOG=`
## v1.0.1 - 2026-11-10
### Card Changes
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
## v1.0.0 - 2026-11-09
### Card Changes
-  **Rustler** [NERF] : Cost 10 -> **12**
- **The Pale** [REWORK] : "Silence all Units." -> "Summon an exact copy of a friendly unit that costs 4 or less in an empty lane of your choice."
- **Excistion Conjure** [REWORK] : Cost 4 -> **2**, "All Enemy Units get -2 ATK." -> "Enemy Units here and in adjacent lanes get -2 ATK this round. Draw a Card."
- **Echo Chamber** [NERFED] : Cost 4 -> **5**
### Fixes
- Summoned / Transformed / Revived units with when played abilities will now do them correclty, letting the owner target the unit of their choosing if such targeting is required.
`;
