/** Thrown by routes/middleware; index.ts turns it into `{ error }` with the status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(obj: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function html(text: string, status: number): Response {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>TaskTracker</title><p style="font:16px system-ui;padding:24px">' + text + '</p>',
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'bad json');
  }
}
