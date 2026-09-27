import { HttpError } from './json';
import type { Entry, Task } from '../types';

export const MAX_TASKS = 200;
export const MAX_ENTRIES = 20000;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SHORT = /^[a-z0-9_-]{1,32}$/; // color / icon ids from the app palette and icon set

export type IncomingTask = Omit<Task, 'ownerId'>;

export interface SyncBody {
  tasks: IncomingTask[];
  entries: Entry[];
}

/** Checks shape, field types and per-request limits. Throws 400 or 413. */
export function validateSyncBody(body: unknown): SyncBody {
  if (!isObject(body)) throw new HttpError(400, 'body must be an object');
  const { tasks, entries } = body;
  if (!Array.isArray(tasks)) throw new HttpError(400, 'tasks must be an array');
  if (!Array.isArray(entries)) throw new HttpError(400, 'entries must be an array');
  if (tasks.length > MAX_TASKS) throw new HttpError(413, 'too many tasks');
  if (entries.length > MAX_ENTRIES) throw new HttpError(413, 'too many entries');
  return {
    tasks: tasks.map((t, i) => validateTask(t, i)),
    entries: entries.map((e, i) => validateEntry(e, i)),
  };
}

function validateTask(t: unknown, i: number): IncomingTask {
  const bad = (f: string) => new HttpError(400, `tasks[${i}].${f} invalid`);
  if (!isObject(t)) throw new HttpError(400, `tasks[${i}] must be an object`);
  if (typeof t.id !== 'string' || !ID.test(t.id)) throw bad('id');
  if (typeof t.name !== 'string' || t.name.length < 1 || t.name.length > 80) throw bad('name');
  if (typeof t.color !== 'string' || !SHORT.test(t.color)) throw bad('color');
  if (typeof t.icon !== 'string' || !SHORT.test(t.icon)) throw bad('icon');
  if (t.groupId != null && (typeof t.groupId !== 'string' || !ID.test(t.groupId))) throw bad('groupId');
  if (!isMs(t.created)) throw bad('created');
  if (!isMs(t.updated)) throw bad('updated');
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    icon: t.icon,
    archived: flag(t.archived),
    groupId: t.groupId ?? null,
    created: t.created,
    updated: t.updated,
    deleted: flag(t.deleted),
  };
}

function validateEntry(e: unknown, i: number): Entry {
  const bad = (f: string) => new HttpError(400, `entries[${i}].${f} invalid`);
  if (!isObject(e)) throw new HttpError(400, `entries[${i}] must be an object`);
  if (typeof e.taskId !== 'string' || !ID.test(e.taskId)) throw bad('taskId');
  if (typeof e.day !== 'string' || !DAY.test(e.day)) throw bad('day');
  if (!isMs(e.t)) throw bad('t');
  return { taskId: e.taskId, day: e.day, on: flag(e.on), t: e.t };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isMs(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function flag(v: unknown): 0 | 1 {
  return v ? 1 : 0;
}
