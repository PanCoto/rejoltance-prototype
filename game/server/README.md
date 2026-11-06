# RE:Joltance matchmaking + ranking server (Cloudflare Workers, free plan)

Accounts, Elo ratings, matchmaking queues (ranked + casual), match records and the leaderboard.
The game itself stays peer-to-peer (PeerJS) - this server only pairs players, gives both the same room code and records the agreed result.

## Deploy (about 5 minutes, no credit card)

1. Create a free Cloudflare account.
2. In this folder:
   ```
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
   Wrangler prints the address, e.g. `https://rejoltance-mm.<your-subdomain>.workers.dev`.
   (SQLite-backed Durable Objects are included in the free plan; the migration in `wrangler.toml` creates it.)
3. Put that address into the game's `net-config.js`:
   ```js
   window.RJ_MM = { url: 'https://rejoltance-mm.<your-subdomain>.workers.dev' };
   ```
4. Optional, recommended: in `wrangler.toml` set `ALLOW_ORIGIN` to the website that hosts the game (e.g. `https://you.github.io`) and deploy again.
   Without it any website can talk to the API and use your free quota.

Check it works: open `https://<your-worker>/api/ping` -> `{"ok":1,...}`. In the game: main menu > Ranked.

Local test: `npx wrangler dev --local` and, in another terminal, `node test.mjs` (end-to-end test of accounts, pairing, results, disputes, leaderboard).

## Discord login (optional, recommended)

Lets players log in on any device and gives each person one identity (harder to farm with alt accounts). Guest accounts keep working; a guest can **link** Discord to keep its rating.

1. https://discord.com/developers/applications > **New Application**. Open **OAuth2**: copy the **Client ID** and **Client Secret**.
2. In OAuth2 > **Redirects** add exactly: `https://<your-worker-address>/auth/discord/callback` (the address `wrangler deploy` printed) and save.
3. In `wrangler.toml` > `[vars]` set `DISCORD_CLIENT_ID`, and `GAME_URL` = the full address of the game page, e.g. `https://pancoto.github.io/rejoltance-prototype/`
   (unlike `ALLOW_ORIGIN`, this one includes the path - it is where players land after logging in).
4. Store the secret (it asks you to paste it): `npx wrangler secret put DISCORD_CLIENT_SECRET`
5. `npx wrangler deploy`. The game shows the Discord buttons in Ranked > Account once the server reports it is configured.
6. Optional: `REQUIRE_DISCORD = "1"` makes Ranked need a linked Discord account (Quick Match stays open to guests).

Only the `identify` scope is requested (Discord user id + name); no email, no servers. The server stores the Discord id and name, shown nowhere except to the owner (the leaderboard shows the game name).
Players can delete their account (Ranked > Account > Delete account), which removes it, its sessions and the Discord link.
How it works: the game asks the server for a Discord URL, the browser goes to Discord and comes back to the worker, which redirects to `GAME_URL#dc=<one-time code>`; the game claims the code together with a random nonce
it kept in localStorage, so a login link started by somebody else cannot be finished in your browser. Each device gets its own session key, so logging in on a new device does not log out the others (max 10 per account).

Local test of the Discord flow (no real Discord needed): copy `.dev.vars.example` to `.dev.vars`, run `node mock-discord.mjs`, `npx wrangler dev --local`, then `node test-discord.mjs`.

## How it behaves

* **Account** = either a Discord login (see above) or a guest account: a random secret key created on first use and kept in the browser (localStorage). The server stores only its SHA-256.
  Players can copy it (Ranked > Account > Transfer code) to use the same account on another device. No e-mail/password, so nothing to reset - but a lost key means a lost account.
* **Quick Match** (casual): FIFO queue, no rating change, rematch allowed. If the server is down or not configured, the button silently falls back to the old serverless peer-to-peer search in `net.js`.
* **Ranked**: players are paired by rating; the allowed gap starts at 75 points and grows by 20 per second waited (everyone matches everyone after ~1 minute).
  Only clients with identical card data (same `NETV`) are paired. Start rating 1000, Elo with K=40 for the first 10 games, then 24. Rating never drops below 100.
* **Results**: both players report; if the reports agree the rating changes. If they contradict, the match is voided. If only one report arrives (the other player closed the tab),
  it is accepted after 2 minutes. Connection failures before the game starts are reported as `abort` (void, no penalty).
  A pair of players can have at most 3 rated games per 24 h (the rest are "unrated"), which blocks simple win-trading.
* **Limits**: 8 new accounts per IP per day, 120 API calls per IP per minute.

## Known limits (honest list)

* The game is peer-to-peer and host-authoritative, so the server cannot *verify* a result, only cross-check the two reports. Two people colluding, or a player who edits their own client,
  can still cheat. Fixing that for real means running the game engine on the server (engine.js is plain JS, so it is possible later, but it is a big change).
* One Durable Object serves everything. That is plenty for a hobby-sized player base; if it ever outgrows that, split queues and accounts into separate objects / D1.
* Free-plan quotas (100k Worker requests/day, 100k Durable Object requests/day, WebSocket messages billed 20:1): a search costs roughly one request per 8 s (live "N searching" counter)
  plus a few for login/report, so thousands of matches per day fit. The queue ping keep-alive is answered by Cloudflare without waking the object.
* Names from Discord are reduced to letters, digits and a few symbols. No profanity filter on names (only a character whitelist, 16 chars). Add a word list in `cleanName` if needed.
