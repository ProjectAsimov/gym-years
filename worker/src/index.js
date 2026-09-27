// TaskTracker sync worker.
//
// Identity: GET /auth/start sends the browser to Google's sign-in page. Google
// returns to GET /auth/callback with a code, which the worker exchanges (using
// the client secret) for an ID token. The worker verifies it, issues its own
// 90-day session token, and redirects back to the app with the token in the
// URL fragment. Every later request carries that session token as a Bearer
// header. Days are keyed by the Google account id (the token's `sub`), so any
// device signed in with the same account shares them.
//
// Data: POST /sync sends every day the device knows about as
//   { days: { "2026-09-26": { on: 1, t: 1727000000000 }, ... } }
// where t is when that day was last changed. The worker merges per day (newest
// t wins), stores the result, and returns the merged map. Turning a day off is
// stored as on:0 so the removal reaches other devices too. GET /sync reads.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 20000;
const SESSION_TTL = 90 * 24 * 3600;
const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const STATE_TTL = 600;

let jwksCache = { keys: null, until: 0 };

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/auth/start' && req.method === 'GET') return await authStart(req, env, url);
      if (url.pathname === '/auth/callback' && req.method === 'GET') return await authCallback(req, env, url);
      if (url.pathname === '/auth/logout' && req.method === 'POST') return await signOut(req, env, cors);
      if (url.pathname === '/me' && req.method === 'GET') return await me(req, env, cors);
      if (url.pathname === '/sync' && (req.method === 'GET' || req.method === 'POST')) return await sync(req, env, cors);
    } catch (e) {
      return json({ error: 'server error' }, 500, cors);
    }
    return json({ error: 'not found' }, 404, cors);
  },
};

// --- auth -----------------------------------------------------------------

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Where Google should send the browser back to: this worker's callback route.
function callbackUrl(url) {
  return url.origin + '/auth/callback';
}

async function authStart(req, env, url) {
  const ret = url.searchParams.get('return') || '';
  let retUrl;
  try { retUrl = new URL(ret); } catch { return json({ error: 'bad return url' }, 400, {}); }
  if (!allowedOrigins(env).includes(retUrl.origin)) return json({ error: 'return url not allowed' }, 400, {});

  const state = randomToken();
  await env.DAYS.put('st:' + state, JSON.stringify({ ret: retUrl.origin + retUrl.pathname }), { expirationTtl: STATE_TTL });
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(url),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return Response.redirect(GOOGLE_AUTH + '?' + q, 302);
}

async function authCallback(req, env, url) {
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const stKey = 'st:' + state;
  const st = state ? await env.DAYS.get(stKey, 'json') : null;
  if (!st) return html('Sign-in link expired. Go back to the app and try again.', 400);
  await env.DAYS.delete(stKey);
  if (!code) return Response.redirect(st.ret + '#auth=cancelled', 302);

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(url),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return Response.redirect(st.ret + '#auth=failed', 302);
  const tokens = await tokenRes.json();
  const claims = await verifyGoogleIdToken(tokens.id_token, env.GOOGLE_CLIENT_ID);
  if (!claims) return Response.redirect(st.ret + '#auth=failed', 302);

  const token = randomToken();
  const session = { sub: claims.sub, name: claims.name || '', email: claims.email || '', at: Date.now() };
  await env.DAYS.put('s:' + (await sha256(token)), JSON.stringify(session), { expirationTtl: SESSION_TTL });
  // The fragment never reaches a server, so the token only lands in the app.
  return Response.redirect(st.ret + '#session=' + token, 302);
}

async function signOut(req, env, cors) {
  const token = bearer(req);
  if (token) await env.DAYS.delete('s:' + (await sha256(token)));
  return json({ ok: true }, 200, cors);
}

async function me(req, env, cors) {
  const s = await session(req, env);
  if (!s) return json({ error: 'unauthorized' }, 401, cors);
  return json({ name: s.name, email: s.email }, 200, cors);
}

function bearer(req) {
  const auth = req.headers.get('Authorization') || '';
  const t = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return /^[A-Za-z0-9_-]{40,128}$/.test(t) ? t : '';
}

async function session(req, env) {
  const token = bearer(req);
  if (!token) return null;
  return env.DAYS.get('s:' + (await sha256(token)), 'json');
}

// Checks a Google ID token: RS256 signature against Google's published keys,
// issuer, audience (our client id) and expiry. Returns the claims or null.
async function verifyGoogleIdToken(idToken, clientId) {
  if (typeof idToken !== 'string' || !clientId) return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch { return null; }
  if (header.alg !== 'RS256' || !header.kid) return null;

  const jwk = await googleKey(header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]),
  );
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') return null;
  if (payload.aud !== clientId) return null;
  if (typeof payload.exp !== 'number' || payload.exp < now - 60) return null;
  if (typeof payload.sub !== 'string' || !payload.sub) return null;
  return payload;
}

async function googleKey(kid) {
  if (!jwksCache.keys || Date.now() > jwksCache.until) {
    const res = await fetch(GOOGLE_CERTS, { cf: { cacheTtl: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    jwksCache = { keys: data.keys || [], until: Date.now() + 3600 * 1000 };
  }
  return jwksCache.keys.find((k) => k.kid === kid) || null;
}

// --- days -----------------------------------------------------------------

async function sync(req, env, cors) {
  const s = await session(req, env);
  if (!s) return json({ error: 'unauthorized' }, 401, cors);
  const key = 'g:' + s.sub;

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
}

// --- helpers --------------------------------------------------------------

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function html(text, status) {
  return new Response('<!doctype html><meta charset="utf-8"><title>TaskTracker</title><p style="font:16px system-ui;padding:24px">' + text + '</p>', {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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

function randomToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return bytesToB64url(b);
}

function bytesToB64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64urlToString(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}
