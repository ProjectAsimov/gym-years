// Gym years sync worker.
//
// One endpoint, POST /sync. The client sends every day it knows about as
//   { days: { "2026-09-26": { on: 1, t: 1727000000000 }, ... } }
// where t is when that day was last changed on the device. The worker merges
// it with what it has (newest t wins per day), stores the result, and returns
// the merged map. Turning a day off is stored as on:0 so the removal reaches
// other devices too. GET /sync returns the stored map without changing it.
//
// Identity is a random sync code the app generates; the worker only ever sees
// its SHA-256 hash, which is the KV key. No accounts, no personal data.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,128}$/;
const MAX_DAYS = 20000;

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    if (url.pathname !== '/sync') return json({ error: 'not found' }, 404, cors);
    if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!TOKEN.test(token)) return json({ error: 'unauthorized' }, 401, cors);
    const key = 'u:' + (await sha256(token));

    const stored = (await env.DAYS.get(key, 'json')) || { v: 1, days: {} };
    if (req.method === 'GET') return json({ days: stored.days }, 200, cors);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
    const incoming = body && body.days;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return json({ error: 'days must be an object' }, 400, cors);
    if (Object.keys(incoming).length > MAX_DAYS) return json({ error: 'too many days' }, 413, cors);

    let changed = false;
    for (const k of Object.keys(incoming)) {
      const v = incoming[k];
      if (!DAY.test(k) || !v || typeof v !== 'object') continue;
      const on = v.on ? 1 : 0;
      const t = Number(v.t);
      if (!Number.isFinite(t) || t < 0) continue;
      const cur = stored.days[k];
      if (!cur || t > cur.t) { stored.days[k] = { on, t }; changed = true; }
    }
    if (Object.keys(stored.days).length > MAX_DAYS) return json({ error: 'too many days' }, 413, cors);

    if (changed) await env.DAYS.put(key, JSON.stringify(stored));
    return json({ days: stored.days }, 200, cors);
  },
};

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
