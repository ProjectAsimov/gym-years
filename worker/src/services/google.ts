import { b64urlToBytes, b64urlToString } from '../lib/crypto';

const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export interface GoogleClaims {
  sub: string;
  name?: string;
  email?: string;
}

interface Jwk extends JsonWebKey {
  kid: string;
}

let jwksCache: { keys: Jwk[]; until: number } = { keys: [], until: 0 };

export function authUrl(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return GOOGLE_AUTH + '?' + q;
}

/** Exchanges the auth code for tokens. Returns the ID token, or the HTTP status on rejection. */
export async function exchangeCode(
  code: string, clientId: string, clientSecret: string, redirectUri: string,
): Promise<{ idToken: string } | { status: number }> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    // Google explains rejections in the body; keep that in the logs and send a short reason to the app.
    const detail = await res.text().catch(() => '');
    console.error('token exchange failed', res.status, detail.slice(0, 300));
    return { status: res.status };
  }
  const tokens = (await res.json()) as { id_token?: unknown };
  return { idToken: typeof tokens.id_token === 'string' ? tokens.id_token : '' };
}

/**
 * Checks a Google ID token: RS256 signature against Google's published keys,
 * issuer, audience (our client id) and expiry. Returns the claims or null.
 */
export async function verifyIdToken(idToken: string, clientId: string): Promise<GoogleClaims | null> {
  if (!idToken || !clientId) return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch {
    return null;
  }
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
  return {
    sub: payload.sub,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

async function googleKey(kid: string): Promise<Jwk | null> {
  if (!jwksCache.keys.length || Date.now() > jwksCache.until) {
    const res = await fetch(GOOGLE_CERTS, { cf: { cacheTtl: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { keys?: Jwk[] };
    jwksCache = { keys: data.keys || [], until: Date.now() + 3600 * 1000 };
  }
  return jwksCache.keys.find((k) => k.kid === kid) || null;
}
