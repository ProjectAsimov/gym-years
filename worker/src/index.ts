// TaskTracker sync worker: Google redirect sign-in, KV sessions, D1 task/entry sync.
// See docs/ARCHITECTURE.md for the contract.

import { HttpError, json } from './lib/json';
import { corsHeaders } from './middleware/cors';
import { authCallback, authLogout, authStart } from './routes/auth';
import { me } from './routes/me';
import { sync } from './routes/sync';
import type { Ctx, Env, Handler } from './types';

const routes: Record<string, Handler> = {
  'GET /auth/start': authStart,
  'GET /auth/callback': authCallback,
  'POST /auth/logout': authLogout,
  'GET /me': me,
  'POST /sync': sync,
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const ctx: Ctx = { req, env, url, cors };
    const handler = routes[req.method + ' ' + url.pathname];
    if (!handler) return json({ error: 'not found' }, 404, cors);

    try {
      return await handler(ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, cors);
      console.error(e);
      return json({ error: 'server error' }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
