# RE:Joltance

A browser-based, two-player lane card game. Build a 30-card deck, then play against a bot or a friend online. No installs, no accounts, no backend: everything runs as static files in the browser.

## Features

- **Lane combat.** Each player fields units in four lanes. Units fight the unit opposite them, and damage that gets through hits the enemy hero.
- **100+ cards** with a data-driven effect system: triggers, targets, keywords (Taunt, Flying, Armored, Lifesteal, Breakthrough, SoulGuard, Burning and more), tokens, transformations and merges.
- **Deck builder** with filters, cost-curve view, default deck, and import/export via short deck codes.
- **Five premade decks** covering different playstyles, from fast to slow.
- **Bot opponent** in two difficulties. The Smart bot simulates candidate plays on a cloned game state and scores the resulting positions. It never reads the opponent's hand or deck.
- **Peer-to-peer multiplayer** over WebRTC (PeerJS). Create a room, share the five-character code or invite link, and play. The host's browser runs the authoritative game; the guest receives a mirrored state.
- **Dynamic soundtrack.** Seven loop-synced music stems are mixed in real time based on the state of the match, plus 51 sound-effect variants.
- **Settings** for display name, bot difficulty, font, and music and effects volume, saved in `localStorage`.

## How a round works

1. The starting player plays Units.
2. The other player plays Units and Actions.
3. The starting player plays Actions.
4. All four lanes fight, then end-of-round effects resolve.

Cards are paid for with Blood. Heroes start at 20 HP. Reduce the enemy hero to zero to win. Select a card in hand, then click a highlighted lane or target.

## Repository layout

```
game/   The shipped game: HTML, JS, CSS, card data, engine, bot, netcode, art, audio, fonts.
lab/    Development tooling: simulations, balance patches, bot tuning, deck search, asset generators.
```

`game/` has no dependency on `lab/`. The lab tools load the real `cards.js`, `engine.js` and `bot.js` from `game/`, so simulations always test the code that ships. See [`lab/README.md`](lab/README.md).

| File | Purpose |
|---|---|
| `cards.js` | Card definitions and premade decks |
| `engine.js` | Rules engine: rounds, combat, triggers, keywords, effects |
| `bot.js` | Basic and Smart bot opponents |
| `net.js` | Online play (PeerJS / WebRTC) |
| `net-config.js` | TURN relay / ICE server configuration |
| `ui.js` | Rendering, input, deck builder |
| `menu.js` | Main menu and settings |
| `sfx.js`, `music.js` | Sound effects and dynamic music |
| `live-config.js`, `cards-live.js` | Optional remote balance patching (disabled by default) |

## Run locally

The game is plain static files. Serve the `game/` folder with any static server and open it in a browser:

```bash
cd game
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk works for basic play, but audio falls back to a simpler mode on `file://`, so use a local server for the full experience.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). `.github/workflows/pages.yml` publishes only the `game/` folder.

The site will be available at `https://<user>.github.io/<repo>/`. Any other static host works too; point it at `game/`.

## Multiplayer notes

- Multiplayer works on GitHub Pages as is. It is browser-to-browser, so there is no game server to run, and Pages serves HTTPS, which WebRTC requires.
- The public PeerJS broker is only used to introduce the two browsers to each other. To use your own, set `window.RJ_PEER = { host, port, path, secure }` before `net.js` loads.
- Players on mobile data or campus networks (eduroam and similar) can't connect directly: carrier-grade NAT and firewalls block peer-to-peer traffic, so a TURN relay is required. If both players are on such networks, a working relay is the only thing that makes the game connectable.
- Configure one in [`game/net-config.js`](game/net-config.js): a free [Metered](https://www.metered.ca/) app name + API key (credentials are fetched fresh per room, and TURNS on port 443 gets through restrictive firewalls), any URL returning ICE servers as JSON (see [`tools/turn-worker`](tools/turn-worker/README.md) for a Cloudflare Worker), or a fixed list via `window.RJ_ICE`.
- With nothing configured the game falls back to a shared public relay that is best-effort and often unavailable. The lobby checks for a working relay and warns if none can be reached.
- Both players must load the same deployed version. A join is refused if the card data differs.

## Optional: live balance patches

`game/cards-live.js` can fetch a small JSON file and patch card values on page load, so balance tweaks don't need a redeploy. It is disabled by default. To enable it, set a URL in `game/live-config.js`:

```js
window.RJ_LIVE = { url: 'https://example.com/cards-live.json' };
```

For testing, open the game with `?live=<url>` instead. The file format is:

```json
{ "version": 1, "cards": { "12": { "Attack": 3 } } }
```

Each entry overwrites only the fields it lists. An unknown `Id` is added as a new card. If the host is unreachable, the last good copy is used from `localStorage`.

## Adding or editing cards

Cards are plain objects in `game/cards.js` (`Id`, `Name`, `Type`, `Subtypes`, `Cost`, `Attack`, `Health`, `Keywords`, `KeywordParams`, `Description`, `Effects`). Ids 1-100 are regular cards and 900+ are tokens and generated cards. Card art lives in `game/img/` and is matched by the number at the start of the filename. After adding or renaming art, regenerate the index:

```bash
cd lab && python3 tools/make_img_index.py
```

## Tech

Vanilla JavaScript, HTML and CSS with no build step. [PeerJS](https://peerjs.com/) for networking. Node.js and Python 3 are only needed for the lab tooling.
