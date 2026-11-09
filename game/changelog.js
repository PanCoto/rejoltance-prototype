/* ============================================================
   Version + changelog. Edit only this file to publish updates.

   Format (newest entry FIRST):
     ## v1.0.1 - 2026-11-12        <- version - date (date optional)
     ### Balance                   <- optional section title
     - **Card Name**: Cost 3 -> 2  <- **bold** works anywhere
     plain lines become paragraphs

   Also update GAME_VERSION below so the main menu label matches.
   ============================================================ */
const GAME_STAGE='Pre-alpha',GAME_VERSION='1.0.0';
const CHANGELOG=`
## v1.0.0 - 2026-11-09
### Card Changes
-  **Rustler** [NERF] : Cost 10 -> **12**
- **The Pale** [REWORK] : "Silence all Units." -> "Summon an exact copy of a friendly unit that costs 4 or less in an empty lane of your choice."
- **Excistion Conjure** [REWORK] : Cost 4 -> **2**, "All Enemy Units get -2 ATK." -> "Enemy Units here and in adjacent lanes get -2 ATK this round. Draw a Card."
- **Echo Chamber** [NERFED] : Cost 4 -> **5**
### Fixes
- Summoned / Transformed / Revived units with when played abilities will now do them correclty, letting the owner target the unit of their choosing if such targeting is required.
`;
