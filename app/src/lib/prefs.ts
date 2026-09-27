import { signal } from '@preact/signals';

const SHOW_ARCHIVED_KEY = 'tt.showarchived';

function read(): boolean {
  try { return localStorage.getItem(SHOW_ARCHIVED_KEY) === '1'; } catch { return false; }
}

export const showArchived = signal<boolean>(read());

export function setShowArchived(on: boolean): void {
  showArchived.value = on;
  try { localStorage.setItem(SHOW_ARCHIVED_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}
