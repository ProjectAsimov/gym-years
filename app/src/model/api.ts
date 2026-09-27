import type { Me, SyncRequest, SyncResponse, ApiError } from './types';

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'https://tasktracker-sync.projectasimov.workers.dev';
export const MOCK: boolean = import.meta.env.VITE_MOCK_API === '1';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Api {
  /** Where the browser goes to sign in; the worker redirects back with `#session=`. */
  authStartUrl(returnTo: string): string;
  me(token: string): Promise<Me>;
  sync(token: string, body: SyncRequest): Promise<SyncResponse>;
  logout(token: string): Promise<void>;
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: 'Bearer ' + token, ...(init.headers as Record<string, string> | undefined) };
  if (init.body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API_URL + path, { ...init, headers });
  if (!r.ok) {
    let msg = '';
    try { msg = ((await r.json()) as ApiError).error; } catch { /* no body */ }
    throw new HttpError(r.status, msg || 'HTTP ' + r.status);
  }
  return (await r.json()) as T;
}

const fetchApi: Api = {
  authStartUrl: (returnTo) => API_URL + '/auth/start?return=' + encodeURIComponent(returnTo),
  me: (token) => request<Me>('/me', token),
  sync: (token, body) => request<SyncResponse>('/sync', token, { method: 'POST', body: JSON.stringify(body) }),
  logout: async (token) => { await request<{ ok: true }>('/auth/logout', token, { method: 'POST' }); },
};

let impl: Api = fetchApi;

/** Swap the implementation (the mock API in dev). */
export function setApi(a: Api): void { impl = a; }

/** Delegating facade so callers can import `api` once and the implementation can be swapped at boot. */
export const api: Api = {
  authStartUrl: (r) => impl.authStartUrl(r),
  me: (t) => impl.me(t),
  sync: (t, b) => impl.sync(t, b),
  logout: (t) => impl.logout(t),
};
