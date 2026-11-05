# TURN credential worker (optional)

Alternative to Metered. Deploys a tiny Cloudflare Worker that hands out short-lived TURN credentials
from Cloudflare Realtime TURN, so no long-lived secret is shipped in the page.

1. Cloudflare dashboard > Realtime > TURN > create a TURN key. Note the key ID and API token.
2. Create a Worker with `worker.js`; add secrets `TURN_KEY_ID` and `TURN_API_TOKEN`
   (optionally `ALLOW_ORIGIN` = your game's origin).
3. In `game/net-config.js` set `window.RJ_TURN = { url: 'https://<your-worker>.workers.dev/' };`

Check Cloudflare's current pricing and free allowance before relying on it.
