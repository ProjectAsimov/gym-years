# Sync worker

A Cloudflare Worker with a D1 database (users, tasks, entries) and a KV
namespace (sessions, OAuth state). Sign-in is a redirect round trip:
the app sends the browser to `/auth/start`, the worker sends it to Google,
Google returns to `/auth/callback`, and the worker exchanges the code for an
ID token, verifies it, issues its own 90-day session token, and redirects back
to the app with the token in the URL fragment. Tasks and entries are stored
under the Google account id. See `../docs/ARCHITECTURE.md` for the contract.

## Setup

1. Create a Google OAuth **Web application** client at
   https://console.cloud.google.com/apis/credentials. Under *Authorized
   redirect URIs* add `https://<worker host>/auth/callback` (and
   `http://localhost:8787/auth/callback` for local work). Put the client id in
   `GOOGLE_CLIENT_ID` here; the client secret is a Worker secret:

```
cd worker
npx wrangler login
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler d1 execute tasktracker --remote --file src/db/schema.sql
npx wrangler deploy
```

`npm run dev` runs it locally on http://localhost:8787 with a local KV and D1
(apply the schema with `--local` first). `npm run typecheck` runs tsc.

## API

All bodies and responses are JSON. Session routes take `Authorization: Bearer <session token>`.

| Route | Body | Returns |
|---|---|---|
| `GET /auth/start?return=<app url>` | – | 302 to Google; `return` must be on an allowed origin |
| `GET /auth/callback` | – | 302 back to the app with `#session=<token>`, or `#auth=failed` / `#auth=cancelled` |
| `POST /auth/logout` | – | `{ ok: true }` and deletes the session |
| `GET /me` | – | `{ id, name, email }` |
| `POST /sync` | `{ tasks: Task[], entries: Entry[] }` — local changes since the last sync | `{ tasks, entries, now }` — full state after merging (tasks: newest `updated` wins; entries: newest `t` wins) |
| `POST /groups` | `{ taskId }` — caller's own, non-deleted, ungrouped task | `{ group, task }` — task now has `groupId`; caller becomes host and first member |
| `GET /groups/preview?code=<inviteCode>` | – (no session needed) | `{ name, hostName, members, memberLimit }` or 404 |
| `POST /groups/join` | `{ code }` | `{ group, task }` — caller's new task, or their existing one if already a member; 409 `group full` at the limit |
| `GET /groups/:id/board?today=YYYY-MM-DD` | – (member only) | `{ group, members: Member[] }` |
| `POST /groups/:id/leave` | – (member, not host) | `{ ok: true }` — membership removed, task's `groupId` cleared |
| `POST /groups/:id/remove` | `{ userId }` (host only) | `{ ok: true }` — same as leave, for that member |
