// Object model, per docs/ARCHITECTURE.md.

export type ColorId = 'purple' | 'blue' | 'teal' | 'green' | 'yellow' | 'orange' | 'red' | 'pink';

export type IconId =
  | 'dumbbell' | 'run' | 'book' | 'water' | 'meditate' | 'pill'
  | 'sleep' | 'food' | 'code' | 'music' | 'pen' | 'check';

export interface User {
  id: string;      // Google `sub`
  name: string;
  email: string;
  created: number; // ms
}

export interface Task {
  id: string;       // client UUID
  ownerId: string;
  name: string;
  color: ColorId;
  icon: IconId;
  archived: 0 | 1;
  groupId?: string;
  created: number;  // ms
  updated: number;  // ms; drives merge (newest wins)
  deleted: 0 | 1;   // soft delete; still syncs so removals reach other devices
}

export interface Entry {
  taskId: string;
  day: string;  // YYYY-MM-DD
  on: 0 | 1;    // 0 is a tombstone so removals sync
  t: number;    // ms; drives merge (newest wins)
}

// Phase 2.
export interface Group {
  id: string;
  name: string;
  hostId: string;
  inviteCode: string;
  memberLimit: number;
  created: number;
}

export interface Membership {
  groupId: string;
  userId: string;
  taskId: string;
  joined: number;
}

// API shapes.
export interface Me { id: string; name: string; email: string }
export interface SyncRequest { tasks: Task[]; entries: Entry[] }
export interface SyncResponse { tasks: Task[]; entries: Entry[]; now: number }
export interface ApiError { error: string }

export interface Session { token: string; name: string; email: string }

// Local persisted state (`tt.state.v1`).
export interface PersistedState {
  tasks: Task[];
  entries: Record<string, Record<string, Entry>>; // taskId -> day -> entry
  pending: { tasks: string[]; entries: string[] }; // task ids; "taskId|day" keys
  /** Id of the task created by the on-device legacy migration, until the first sync reconciles it. */
  legacyTaskId?: string;
}
