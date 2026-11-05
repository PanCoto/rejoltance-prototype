// Cloudflare Worker that mints short-lived TURN credentials (Cloudflare Realtime TURN).
// Secrets: TURN_KEY_ID, TURN_API_TOKEN. Optional var: ALLOW_ORIGIN (your site, e.g. https://user.github.io).
export default {
  async fetch(req, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', 'Cache-Control': 'no-store' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 3600 }),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
