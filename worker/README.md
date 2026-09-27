# Sync worker

A Cloudflare Worker plus one KV namespace. Users sign in with Google in the
app; the worker verifies the Google ID token, issues its own 90-day session
token, and stores each user's days under their Google account id.

## Setup

1. Create a Google OAuth **Web application** client at
   https://console.cloud.google.com/apis/credentials with the site origin
   (and `http://localhost:8123` for local work) under *Authorized JavaScript
   origins*. Put the client id in `GOOGLE_CLIENT_ID` here and in `index.html`.
2. Deploy:

```
cd worker
npx wrangler login
npx wrangler deploy
```

`npx wrangler dev` runs it locally on http://localhost:8787 with a local KV.

## API

All bodies and responses are JSON. Session routes take `Authorization: Bearer <session token>`.

| Route | Body | Returns |
|---|---|---|
| `POST /auth/google` | `{ "credential": "<Google ID token>" }` | `{ token, name, email }` |
| `POST /auth/logout` | – | `{ ok: true }` and deletes the session |
| `GET /me` | – | `{ name, email }` |
| `GET /sync` | – | `{ days }` |
| `POST /sync` | `{ "days": { "YYYY-MM-DD": { "on": 1, "t": <ms> } } }` | merged `{ days }` (newest `t` per day wins) |
