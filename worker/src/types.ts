export interface Env {
  DAYS: KVNamespace;
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

/** What a session token resolves to in KV (`s:<sha256(token)>`). */
export interface Session {
  sub: string;
  name: string;
  email: string;
  at: number;
}

export interface Task {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  icon: string;
  archived: 0 | 1;
  groupId: string | null;
  created: number;
  updated: number;
  deleted: 0 | 1;
}

export interface Entry {
  taskId: string;
  day: string;
  on: 0 | 1;
  t: number;
}

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  cors: Record<string, string>;
}

export type Handler = (ctx: Ctx) => Promise<Response>;
