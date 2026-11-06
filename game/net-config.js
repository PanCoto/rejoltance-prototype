// Network configuration for online play. Loaded before net.js.
//
// Players on mobile data or on campus networks (eduroam and similar) usually can't connect
// directly to each other; their traffic has to go through a TURN relay. Configure ONE of:
//
// 1) Metered (free account, 20 GB/month): create an app at https://www.metered.ca/ and paste
//    the app name and its API key here. Credentials are fetched fresh each time a room is made.
//      window.RJ_TURN = { metered: { app: 'myapp', apiKey: 'xxxxxxxx' } };
//
// 2) Any endpoint that returns ICE servers as JSON (an RTCIceServer array, or { iceServers }),
//    e.g. a Cloudflare Worker, see tools/turn-worker/README.md:
//      window.RJ_TURN = { url: 'https://turn.example.workers.dev/ice' };
//
// 3) A fixed list (self-hosted coturn, etc.):
//      window.RJ_ICE = [{ urls: ['stun:...', 'turns:turn.example.com:443?transport=tcp'], username: '...', credential: '...' }];
//
// 4) Keep the password out of git: add it as the repository secret METERED_PASSWORD. The deploy
//    workflow then generates game/turn-secret.js (git-ignored), which sets window.RJ_ICE.
//    For local testing, create game/turn-secret.js by hand with the same content.
//    Note: the password still reaches players' browsers, it just isn't stored in the repo.
//
// Leave everything empty to use the shared best-effort public relay, which is unreliable.
window.RJ_TURN = { metered: { app: '', apiKey: '' }, url: '' };

// Matchmaking + ranking server (the Cloudflare Worker in server/, see server/README.md).
// Paste its address after deploying, e.g. 'https://rejoltance-mm.yourname.workers.dev'.
// Leave empty to use only the serverless peer-to-peer Quick Match.
window.RJ_MM = { url: '' };
