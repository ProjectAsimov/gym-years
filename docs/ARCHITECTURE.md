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

## Phase 2: groups and leaderboard

A task can be **shared**. Sharing creates a group named after the task and an
invite link. Anyone who opens the link and signs in **joins** the group and gets
their own task (same name, color, icon) linked to it; each member marks their
own days. Every member sees a **leaderboard** for the group. The host can remove
members; a member can leave. `memberLimit` is 50 and is enforced on join.

Server owns `Task.groupId`: `/sync` ignores any incoming `groupId` and keeps the
stored value. When a grouped task arrives through `/sync` with `deleted: 1`, the
server also deletes that user's membership (deleting the task leaves the group).
Archived tasks stay in the group.

### Routes (session required unless noted)

| Route | Body / query | Returns |
|---|---|---|
| `POST /groups` | `{ taskId }` — caller's own, non-deleted, ungrouped task | `{ group, task }` — task now has `groupId`; the caller becomes host and first member |
| `GET /groups/preview?code=<inviteCode>` | no session needed | `{ name, hostName, members, memberLimit }` or 404 |
| `POST /groups/join` | `{ code }` | `{ group, task }` — the caller's new task (or their existing one if already a member); 409 `group full` at the limit |
| `GET /groups/:id/board?today=YYYY-MM-DD` | member only | `{ group, members: Member[] }` |
| `POST /groups/:id/leave` | member (not host) | `{ ok }` — membership removed; the task stays with `groupId` cleared |
| `POST /groups/:id/remove` | `{ userId }`, host only | `{ ok }` — same as leave for that member |

Shapes:

```ts
Group  = { id, name, hostId, inviteCode, memberLimit, members: number, created }
Member = { userId, name, isHost, isMe, streak, month, total, lastDay: string | null }
```

`today` comes from the client (its local date) so streaks and month counts match
what the member sees. Board stats per member, over that member's task entries
with `on = 1`: `streak` = consecutive days ending on `today` or the day before;
`month` = days in `today`'s month; `total` = all days. Members whose task is
deleted are excluded. Sort by streak desc, then month desc, then total desc,
then name. Invite codes are 10 chars from `[a-z0-9]`, generated server-side.

### App

- Invite link: `https://projectasimov.github.io/tasktracker/#join=<code>`.
  On load, `#join=` is stored in `localStorage['tt.pendingJoin']` and removed
  from the URL. If signed out, the Welcome dialog says the sign-in is to join;
  once a session exists the Join sheet shows the preview (name, host, N of 50)
  with Join / Not now. Joining syncs and opens the new task.
- Task screen: "Share" in the … menu when ungrouped → creates the group → Share
  sheet with the link, Copy, and the native share button when `navigator.share`
  exists. When grouped, a **Group** card below the stats shows the leaderboard
  (me highlighted; host marked), "N of 50 members", Invite (re-opens the Share
  sheet), Leave (member) or Manage members (host: list with Remove; confirm
  each). The board refreshes when the screen opens and after each sync.
- Home rows show a small group badge on grouped tasks.
