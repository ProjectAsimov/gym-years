import { randomToken, sha256 } from '../lib/crypto';
import type { Env, Session } from '../types';

const SESSION_TTL = 90 * 24 * 3600;

// Only the hash of the token is stored, so a KV dump does not yield usable sessions.
const key = async (token: string) => 's:' + (await sha256(token));

export function bearer(req: Request): string {
  const auth = req.headers.get('Authorization') || '';
  const t = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return /^[A-Za-z0-9_-]{40,128}$/.test(t) ? t : '';
}

export async function createSession(env: Env, session: Session): Promise<string> {
  const token = randomToken();
  await env.DAYS.put(await key(token), JSON.stringify(session), { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(env: Env, req: Request): Promise<Session | null> {
  const token = bearer(req);
  if (!token) return null;
  return env.DAYS.get<Session>(await key(token), 'json');
}

export async function deleteSession(env: Env, req: Request): Promise<void> {
  const token = bearer(req);
  if (token) await env.DAYS.delete(await key(token));
}
