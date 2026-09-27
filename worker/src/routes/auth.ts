import { upsertUser } from '../db/queries';
import { randomToken } from '../lib/crypto';
import { html, json } from '../lib/json';
import { allowedOrigins } from '../middleware/cors';
import { authUrl, exchangeCode, verifyIdToken } from '../services/google';
import { createSession, deleteSession } from '../services/sessions';
import type { Ctx } from '../types';

const STATE_TTL = 600;

// Where Google should send the browser back to: this worker's callback route.
const callbackUrl = (url: URL) => url.origin + '/auth/callback';

/** Sends the browser to Google. `return` (the app URL) is remembered under the OAuth state. */
export async function authStart({ env, url }: Ctx): Promise<Response> {
  const ret = url.searchParams.get('return') || '';
  let retUrl: URL;
  try {
    retUrl = new URL(ret);
  } catch {
    return json({ error: 'bad return url' }, 400);
  }
  if (!allowedOrigins(env).includes(retUrl.origin)) return json({ error: 'return url not allowed' }, 400);

  const state = randomToken();
  await env.DAYS.put('st:' + state, JSON.stringify({ ret: retUrl.origin + retUrl.pathname }), { expirationTtl: STATE_TTL });
  return Response.redirect(authUrl(env.GOOGLE_CLIENT_ID, callbackUrl(url), state), 302);
}

export async function authCallback({ env, url }: Ctx): Promise<Response> {
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const stKey = 'st:' + state;
  const st = state ? await env.DAYS.get<{ ret: string }>(stKey, 'json') : null;
  if (!st) return html('Sign-in link expired. Go back to the app and try again.', 400);
  await env.DAYS.delete(stKey);
  if (!code) return Response.redirect(st.ret + '#auth=cancelled', 302);

  const exchanged = await exchangeCode(code, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, callbackUrl(url));
  if ('status' in exchanged) return Response.redirect(st.ret + '#auth=failed&r=exchange' + exchanged.status, 302);

  const claims = await verifyIdToken(exchanged.idToken, env.GOOGLE_CLIENT_ID);
  if (!claims) {
    console.error('id token rejected');
    return Response.redirect(st.ret + '#auth=failed&r=verify', 302);
  }

  const name = claims.name || '';
  const email = claims.email || '';
  await upsertUser(env.DB, claims.sub, name, email).run();
  const token = await createSession(env, { sub: claims.sub, name, email, at: Date.now() });
  // The fragment never reaches a server, so the token only lands in the app.
  return Response.redirect(st.ret + '#session=' + token, 302);
}

export async function authLogout(ctx: Ctx): Promise<Response> {
  await deleteSession(ctx.env, ctx.req);
  return json({ ok: true }, 200, ctx.cors);
}
