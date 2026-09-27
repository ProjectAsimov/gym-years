# TaskTracker architecture

Track any yes/no daily task, one square per day. Private by default; a task can
be shared into a group whose members each keep their own copy and see a
leaderboard (phase 2).

## Repository layout

```
app/                      Vite + TypeScript + Preact PWA (GitHub Pages)
  src/
    components/           Button, Card, Sheet, Segmented, Swatches, StatTile,
                          Heatmap, MonthCalendar, ListRow, Toast, Icon
    screens/              Home, Task, Settings, Welcome
    model/                types.ts, store.ts (state + local persistence),
                          sync.ts (server merge), api.ts (fetch wrapper)
    lib/                  dates.ts, stats.ts, theme.ts, ids.ts
    styles/               tokens.css, base.css
    main.tsx, app.tsx
  public/                 icons, manifest
worker/                   Cloudflare Worker (TypeScript)
  src/
    index.ts              entry: CORS, routing, error envelope
    routes/               auth.ts, me.ts, sync.ts (groups.ts in phase 2)
    services/             google.ts, sessions.ts, tasks.ts, entries.ts, migrate.ts
    db/                   schema.sql, migrations/, queries.ts
    middleware/           auth.ts (session -> user), cors.ts
    lib/                  crypto.ts, json.ts, validate.ts
    types.ts
  wrangler.toml
docs/                     this file
.github/workflows/        pages.yml (build app/, deploy to Pages)
```

## Object model

| Object | Fields | Notes |
|---|---|---|
| User | id (Google `sub`), name, email, created | |
| Task | id (client UUID), ownerId, name, color, icon, archived, groupId?, created, updated, deleted | `updated` drives merge (newest wins) |
| Entry | taskId, day (`YYYY-MM-DD`), on (0/1), t (ms) | `t` drives merge (newest wins); `on:0` is a tombstone so removals sync |
| Group | id, name, hostId, inviteCode, memberLimit (50), created | phase 2 |
| Membership | groupId, userId, taskId, joined | member's own task instance in the group |

Colors are accent ids from the app palette (`purple`, `blue`, `teal`, `green`,
`yellow`, `orange`, `red`, `pink`). Icons are short ids from the app's icon set.

## Storage

- **D1** (`DB` binding): `users`, `tasks`, `entries`, and in phase 2 `groups`,
  `memberships`. Schema in `worker/src/db/schema.sql`.
- **KV** (`DAYS` binding): sessions (`s:<sha256(token)>`, 90-day TTL) and
  OAuth state (`st:<state>`, 10-minute TTL). Also holds the legacy single-tracker
  records (`g:<sub>`) that `migrate.ts` turns into a "Gym" task on first sync.
- **Browser**: `localStorage` key `tt.state.v1` with `{tasks, entries, pending}`;
  `tt.session`, `tt.theme`, `tt.accent`, `tt.welcomed`, `tt.syncon`.

## API (worker)

All JSON. Session routes take `Authorization: Bearer <session token>`.
Errors are `{ error: string }` with a 4xx/5xx status.

| Route | Body | Returns |
|---|---|---|
| `GET /auth/start?return=<app url>` | – | 302 to Google; `return` must be on an allowed origin |
| `GET /auth/callback` | – | 302 to the app with `#session=<token>`, or `#auth=failed&r=<reason>` / `#auth=cancelled` |
| `POST /auth/logout` | – | `{ ok: true }` |
| `GET /me` | – | `{ id, name, email }` |
| `POST /sync` | `{ tasks: Task[], entries: Entry[] }` — everything changed locally since the last successful sync (may be empty) | `{ tasks: Task[], entries: Entry[], now }` — the user's full current state after merging |

Merge rules on `/sync`: a task is replaced when the incoming `updated` is newer;
an entry when the incoming `t` is newer. Unknown task ids in `entries` are
ignored. Tasks must belong to the caller. Limits: 200 tasks, 20 000 entries per
user; oversize requests get 413.

## Sync model (client)

The store is the source of truth on the device. Every local change marks the
task or entry as pending. `sync()` posts the pending set, replaces local state
with the server's response (keeping anything that changed while the request was
in flight), and clears pending. Triggers: 1.5 s after a change, on load, when
the tab becomes visible (if last sync > 30 s ago), on `online`. Sync is on by
default and can be switched off in Settings; signing out keeps local data.

## Theming

CSS custom properties on `:root` (`--bg`, `--panel`, `--text`, `--muted`,
`--cell`, `--lit`, `--lit-soft`, `--btn`, `--btn-text`, `--danger`). Mode is
auto / light / dark; the accent is one of the eight palette ids, each with a
dark-mode and a light-mode shade. Per-task color uses the same palette.
