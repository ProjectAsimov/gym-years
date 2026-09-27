import {
  clearTaskGroupStmt, codeTaken, deleteMembershipStmt, groupById, groupByCode, groupMemberTasks,
  insertGroup, insertMembership, insertMembershipStmt, membership, upsertUser, onDaysByTask, setTaskGroupStmt, taskById, upsertTask, userName,
} from '../db/queries';
import { HttpError } from '../lib/json';
import type { Env, Group, Member, Session, Task } from '../types';

const MEMBER_LIMIT = 50;
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function genCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < 10; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return s;
}

async function uniqueCode(db: D1Database): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    if (!(await codeTaken(db, code))) return code;
  }
  throw new HttpError(500, 'could not allocate invite code');
}

export async function createGroup(env: Env, userId: string, taskId: string): Promise<{ group: Group; task: Task }> {
  const db = env.DB;
  const task = await taskById(db, taskId);
  if (!task) throw new HttpError(404, 'task not found');
  if (task.ownerId !== userId) throw new HttpError(403, 'not your task');
  if (task.deleted) throw new HttpError(400, 'task is deleted');
  if (task.groupId) throw new HttpError(400, 'task is already in a group');

  const now = Date.now();
  const id = crypto.randomUUID();
  const inviteCode = await uniqueCode(db);

  await insertGroup(db, { id, name: task.name, hostId: userId, inviteCode, memberLimit: MEMBER_LIMIT, created: now });
  await insertMembership(db, { groupId: id, userId, taskId, joined: now });
  await db.batch([setTaskGroupStmt(db, taskId, id, now)]);

  return {
    group: { id, name: task.name, hostId: userId, inviteCode, memberLimit: MEMBER_LIMIT, members: 1, created: now },
    task: { ...task, groupId: id, updated: now },
  };
}

export async function previewGroup(
  env: Env,
  code: string,
): Promise<{ name: string; hostName: string; members: number; memberLimit: number }> {
  const group = await groupByCode(env.DB, code);
  if (!group) throw new HttpError(404, 'group not found');
  const hostName = (await userName(env.DB, group.hostId)) ?? '';
  return { name: group.name, hostName, members: group.members, memberLimit: group.memberLimit };
}

export async function joinGroup(env: Env, s: Session, code: string): Promise<{ group: Group; task: Task }> {
  const db = env.DB;
  const userId = s.sub;
  const group = await groupByCode(db, code);
  if (!group) throw new HttpError(404, 'group not found');

  const existing = await membership(db, group.id, userId);
  if (existing) {
    const task = await taskById(db, existing.taskId);
    if (!task) throw new HttpError(500, 'member task missing');
    return { group, task };
  }

  if (group.members >= group.memberLimit) throw new HttpError(409, 'group full');

  const hostMembership = await membership(db, group.id, group.hostId);
  const hostTask = hostMembership && (await taskById(db, hostMembership.taskId));
  if (!hostTask) throw new HttpError(500, 'host task missing');

  const now = Date.now();
  const task: Task = {
    id: crypto.randomUUID(),
    ownerId: userId,
    name: hostTask.name,
    color: hostTask.color,
    icon: hostTask.icon,
    archived: 0,
    groupId: group.id,
    created: now,
    updated: now,
    deleted: 0,
  };
  // One atomic batch. The user row is upserted first: a session can predate the
  // users table, and memberships/tasks both reference it.
  await db.batch([
    upsertUser(db, s.sub, s.name, s.email),
    upsertTask(db, task), // fresh id, so this always inserts
    insertMembershipStmt(db, { groupId: group.id, userId, taskId: task.id, joined: now }),
  ]);

  return { group: { ...group, members: group.members + 1 }, task };
}

export async function getBoard(env: Env, groupId: string, callerId: string, today: string): Promise<{ group: Group; members: Member[] }> {
  const db = env.DB;
  const group = await groupById(db, groupId);
  if (!group) throw new HttpError(404, 'group not found');
  const caller = await membership(db, groupId, callerId);
  if (!caller) throw new HttpError(403, 'not a member');

  const memberTasks = await groupMemberTasks(db, groupId);
  const onDays = await onDaysByTask(db, memberTasks.map((m) => m.taskId));

  const members: Member[] = memberTasks.map((m) => {
    const days = onDays.get(m.taskId) ?? []; // newest first
    return {
      userId: m.userId,
      name: m.name,
      isHost: m.userId === group.hostId,
      isMe: m.userId === callerId,
      streak: streak(days, today),
      month: days.filter((d) => d.slice(0, 7) === today.slice(0, 7)).length,
      total: days.length,
      lastDay: days[0] ?? null,
    };
  });

  members.sort((a, b) => b.streak - a.streak || b.month - a.month || b.total - a.total || a.name.localeCompare(b.name));

  return { group, members };
}

export async function leaveGroup(env: Env, groupId: string, userId: string): Promise<void> {
  const db = env.DB;
  const group = await groupById(db, groupId);
  if (!group) throw new HttpError(404, 'group not found');
  if (group.hostId === userId) throw new HttpError(400, 'host cannot leave');
  await removeMembership(db, groupId, userId);
}

export async function removeMember(env: Env, groupId: string, callerId: string, targetUserId: string): Promise<void> {
  const db = env.DB;
  const group = await groupById(db, groupId);
  if (!group) throw new HttpError(404, 'group not found');
  if (group.hostId !== callerId) throw new HttpError(403, 'forbidden');
  if (targetUserId === group.hostId) throw new HttpError(400, 'host cannot be removed');
  await removeMembership(db, groupId, targetUserId);
}

async function removeMembership(db: D1Database, groupId: string, userId: string): Promise<void> {
  const m = await membership(db, groupId, userId);
  if (!m) throw new HttpError(404, 'not a member');
  await db.batch([deleteMembershipStmt(db, groupId, userId), clearTaskGroupStmt(db, m.taskId, Date.now())]);
}

/** Consecutive "on" days ending today or yesterday: a miss today doesn't zero the streak until tomorrow. */
function streak(daysDesc: string[], today: string): number {
  const set = new Set(daysDesc);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

function addDays(day: string, delta: number): string {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
