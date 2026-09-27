# Sync worker

A Cloudflare Worker plus one KV namespace. Sign-in is a redirect round trip:
the app sends the browser to `/auth/start`, the worker sends it to Google,
Google returns to `/auth/callback`, and the worker exchanges the code for an
ID token, verifies it, issues its own 90-day session token, and redirects back
to the app with the token in the URL fragment. Days are stored under the
Google account id.

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
npx wrangler deploy
```

`npx wrangler dev` runs it locally on http://localhost:8787 with a local KV.

## API

All bodies and responses are JSON. Session routes take `Authorization: Bearer <session token>`.

| Route | Body | Returns |
|---|---|---|
| `GET /auth/start?return=<app url>` | – | 302 to Google; `return` must be on an allowed origin |
| `GET /auth/callback` | – | 302 back to the app with `#session=<token>`, or `#auth=failed` / `#auth=cancelled` |
| `POST /auth/logout` | – | `{ ok: true }` and deletes the session |
| `GET /me` | – | `{ name, email }` |
| `GET /sync` | – | `{ days }` |
| `POST /sync` | `{ "days": { "YYYY-MM-DD": { "on": 1, "t": <ms> } } }` | merged `{ days }` (newest `t` per day wins) |
