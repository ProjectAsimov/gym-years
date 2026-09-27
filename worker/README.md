# Sync worker

A Cloudflare Worker plus one KV namespace. It stores each user's days under
the SHA-256 hash of a random sync code the app generates, so there are no
accounts and the worker never sees anything personal.

## Deploy

```
cd worker
npx wrangler login
npx wrangler kv namespace create DAYS      # paste the id into wrangler.toml
npx wrangler deploy                        # prints the worker URL
```

Then put that URL in `SYNC_URL` near the top of the script in `index.html`
and bump the cache name in `sw.js`.

## API

`POST /sync` with `Authorization: Bearer <sync code>` and a body of
`{ "days": { "YYYY-MM-DD": { "on": 1, "t": <ms timestamp> } } }`.
The worker merges per day (newest `t` wins), stores the result and returns the
merged map in the same shape. `GET /sync` returns the stored map.
