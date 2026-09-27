import { json } from '../lib/json';
import { requireSession } from '../middleware/auth';
import type { Ctx } from '../types';

export async function me(ctx: Ctx): Promise<Response> {
  const s = await requireSession(ctx);
  return json({ id: s.sub, name: s.name, email: s.email }, 200, ctx.cors);
}
