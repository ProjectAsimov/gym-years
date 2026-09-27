import { signal } from '@preact/signals';
import type { Session } from './types';
import { api, MOCK } from './api';
import { closeSheet } from '../lib/nav';

export const SESSION_KEY = 'tt.session';
export const SYNC_ON_KEY = 'tt.syncon';
export const WELCOMED_KEY = 'tt.welcomed';

function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null;
    return s && typeof s.token === 'string' ? s : null;
  } catch {
    return null;
  }
}
function readFlag(key: string, dflt: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? dflt : v !== '0';
  } catch {
    return dflt;
  }
}

export const session = signal<Session | null>(readSession());
export const syncOn = signal<boolean>(readFlag(SYNC_ON_KEY, true));
export const welcomed = signal<boolean>(readFlag(WELCOMED_KEY, false));

/** Re-read from localStorage (after the legacy migration has carried keys over). */
export function reloadSessionPrefs(): void {
  session.value = readSession();
  syncOn.value = readFlag(SYNC_ON_KEY, true);
  welcomed.value = readFlag(WELCOMED_KEY, false);
}
/** Text for the status line at the bottom of Home. */
export const statusNote = signal('');

export function setSession(s: Session | null): void {
  session.value = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage blocked */ }
}

export function setSyncOn(on: boolean): void {
  syncOn.value = on;
  try { localStorage.setItem(SYNC_ON_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}

export function markWelcomed(): void {
  welcomed.value = true;
  try { localStorage.setItem(WELCOMED_KEY, '1'); } catch { /* storage blocked */ }
}

/** Sign-in is a round trip: worker -> Google -> worker -> back here with `#session=` in the hash. */
export function signIn(): void {
  markWelcomed();
  const url = api.authStartUrl(location.origin + location.pathname);
  if (MOCK) {
    closeSheet();
    location.hash = url; // the mock "redirects" straight back
    void finishSignIn();
    return;
  }
  location.href = url;
}

/** On load: parse `#session=` / `#auth=failed&r=` / `#auth=cancelled`, then GET /me. Resolves to true when signed in. */
export async function finishSignIn(): Promise<boolean> {
  const m = /^#session=([A-Za-z0-9_-]{40,128})$/.exec(location.hash);
  const failed = /^#auth=(failed|cancelled)(?:&r=([a-z0-9]+))?$/.exec(location.hash);
  if (m || failed) history.replaceState(history.state, '', location.pathname + location.search);
  if (failed) {
    statusNote.value = failed[1] === 'cancelled' ? 'Sign-in cancelled.' : 'Sign-in did not complete (' + (failed[2] || 'return') + '). Try again.';
    return false;
  }
  if (!m) return false;
  const token = m[1]!;
  setSession({ token, name: '', email: '' });
  statusNote.value = 'Signing in…';
  try {
    const me = await api.me(token);
    setSession({ token, name: me.name || '', email: me.email || '' });
    statusNote.value = '';
    window.dispatchEvent(new Event('tt:signedin'));
    return true;
  } catch (e) {
    setSession(null);
    const status = (e as { status?: number }).status;
    statusNote.value = status ? 'Sign-in did not complete (session ' + status + '). Try again.' : 'Could not reach the sync server.';
    return false;
  }
}

export function signOut(): void {
  const tok = session.value?.token;
  setSession(null);
  statusNote.value = 'Signed out.';
  if (tok) api.logout(tok).catch(() => { /* best effort */ });
}
