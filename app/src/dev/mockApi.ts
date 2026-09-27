// In-memory implementation of the worker contract (docs/ARCHITECTURE.md), used
// when VITE_MOCK_API=1 so the UI can be exercised without the worker.
import type { Api } from '../model/api';
import { HttpError } from '../model/api';
import type { Task, Entry, Me, SyncRequest, SyncResponse } from '../model/types';

export const MOCK_TOKEN = 'mock-session-token-0123456789abcdefghijklmnopqrstuvwxyz';
const USER: Me = { id: 'mock-sub-1', name: 'Mock User', email: 'mock@example.com' };
const MAX_TASKS = 200, MAX_ENTRIES = 20000;

const serverTasks = new Map<string, Task>();
const serverEntries = new Map<string, Entry>(); // "taskId|day"
let sessions = new Set<string>([MOCK_TOKEN]);

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function auth(token: string): void {
  if (!sessions.has(token)) throw new HttpError(401, 'unauthorized');
}

/** Seed the mock server with a legacy-style "Gym" task (like migrate.ts on the worker would). */
export function seedServerGym(days: string[]): void {
  const now = Date.now();
  const t: Task = { id: 'server-gym-task', ownerId: USER.id, name: 'Gym', color: 'purple', icon: 'dumbbell', archived: 0, created: now - 1, updated: now - 1, deleted: 0 };
  serverTasks.set(t.id, t);
  for (const d of days) serverEntries.set(t.id + '|' + d, { taskId: t.id, day: d, on: 1, t: 0 });
}

export const mockApi: Api = {
  authStartUrl: () => '#session=' + MOCK_TOKEN,
  async me(token) {
    await delay(120);
    auth(token);
    return USER;
  },
  async sync(token, body: SyncRequest): Promise<SyncResponse> {
    await delay(250);
    auth(token);
    if (body.tasks.length > MAX_TASKS || body.entries.length > MAX_ENTRIES) throw new HttpError(413, 'too large');
    for (const t of body.tasks) {
      const cur = serverTasks.get(t.id);
      if (cur && cur.ownerId !== USER.id) throw new HttpError(403, 'not yours');
      if (!cur || t.updated > cur.updated) serverTasks.set(t.id, { ...t, ownerId: USER.id });
    }
    for (const e of body.entries) {
      if (!serverTasks.has(e.taskId)) continue; // unknown task ids are ignored
      const k = e.taskId + '|' + e.day;
      const cur = serverEntries.get(k);
      if (!cur || e.t > cur.t) serverEntries.set(k, e);
    }
    if (serverTasks.size > MAX_TASKS) throw new HttpError(413, 'too many tasks');
    return { tasks: Array.from(serverTasks.values()), entries: Array.from(serverEntries.values()), now: Date.now() };
  },
  async logout(token) {
    await delay(80);
    sessions = new Set(Array.from(sessions).filter((t) => t !== token));
    sessions.add(MOCK_TOKEN); // the mock can always sign back in
  },
};
