// Dev-only helpers (VITE_MOCK_API=1). URL params:
//   ?seed=1          seed three tasks with a few months of days (clears existing state first)
//   ?fresh=1         clear all tt.* keys
//   ?legacy=1        plant legacy gymyears.* keys to exercise the migration
//   ?signedin=1      pre-set a mock session
//   ?screen=task|month|settings|welcome   open that screen after boot (for screenshots)
import { STATE_KEY, addTask, setDay, tasks } from '../model/store';
import { iso, addDays } from '../lib/dates';
import { MOCK_TOKEN, seedServerGym } from './mockApi';
import { push, openSheet } from '../lib/nav';

function params(): URLSearchParams { return new URLSearchParams(location.search); }

function clearAll(): void {
  for (const k of Object.keys(localStorage)) if (k.startsWith('tt.') || k.startsWith('gymyears.')) localStorage.removeItem(k);
}

// Deterministic pseudo-random so screenshots are stable.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function applySeedParams(): void {
  const p = params();
  if (p.get('fresh') === '1') clearAll();
  if (p.get('legacy') === '1') {
    clearAll();
    const r = rng(7);
    const log: Record<string, { on: number; t: number }> = {};
    const today = new Date();
    for (let i = 1; i < 120; i++) if (r() < 0.5) log[iso(addDays(today, -i))] = { on: 1, t: 0 };
    localStorage.setItem('gymyears.log.v2', JSON.stringify(log));
    localStorage.setItem('gymyears.accent', 'teal');
    localStorage.setItem('gymyears.welcomed', '1');
    localStorage.setItem('gymyears.session', JSON.stringify({ token: MOCK_TOKEN, name: 'Mock User', email: 'mock@example.com' }));
    seedServerGym(Object.keys(log).slice(0, 30).concat([iso(addDays(today, -200))]));
  }
  if (p.get('signedin') === '1') {
    localStorage.setItem('tt.session', JSON.stringify({ token: MOCK_TOKEN, name: 'Mock User', email: 'mock@example.com' }));
    localStorage.setItem('tt.welcomed', '1');
  }
  if (p.get('seed') === '1') {
    localStorage.removeItem(STATE_KEY);
    localStorage.setItem('tt.welcomed', '1');
    const today = new Date();
    const specs = [
      { name: 'Gym', color: 'purple', icon: 'dumbbell', p: 0.55, seed: 1, back: 420 },
      { name: 'Read 20 pages', color: 'teal', icon: 'book', p: 0.7, seed: 2, back: 90 },
      { name: 'Meditate', color: 'orange', icon: 'meditate', p: 0.35, seed: 3, back: 40 },
    ] as const;
    for (const s of specs) {
      const t = addTask(s.name, s.color, s.icon);
      const r = rng(s.seed);
      for (let i = s.back; i >= 1; i--) if (r() < s.p) setDay(t.id, iso(addDays(today, -i)), true, Date.now() - i * 86400000);
      // Make streaks visible: the last few days on for the first two tasks.
      if (s.seed !== 3) for (let i = 1; i <= 5; i++) setDay(t.id, iso(addDays(today, -i)), true);
      if (s.seed === 2) setDay(t.id, iso(today), true);
    }
  }
}

export function applyScreenParam(): void {
  const p = params();
  const screen = p.get('screen');
  if (!screen) return;
  const first = tasks.value.find((t) => !t.deleted && !t.archived);
  const now = new Date();
  switch (screen) {
    case 'task': if (first) push({ name: 'task', taskId: first.id }); break;
    case 'month': if (first) push({ name: 'month', taskId: first.id, y: now.getFullYear(), m: now.getMonth() }); break;
    case 'settings': openSheet('settings'); break;
    case 'welcome': localStorage.removeItem('tt.welcomed'); openSheet('welcome'); break;
    case 'add': openSheet('add'); break;
  }
}
