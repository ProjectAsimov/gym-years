import { signal, effect } from '@preact/signals';
import { accentHex, rgba, isColorId } from './palette';
import type { ColorId } from '../model/types';

export type Mode = 'auto' | 'light' | 'dark';

const THEME_KEY = 'tt.theme';
const ACCENT_KEY = 'tt.accent';

function readMode(): Mode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}
function readAccent(): ColorId {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return isColorId(v) ? v : 'purple';
  } catch {
    return 'purple';
  }
}

export const mode = signal<Mode>(readMode());
export const accent = signal<ColorId>(readAccent());
const systemLight = signal(typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches);

if (typeof matchMedia === 'function') {
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => { systemLight.value = e.matches; });
}

/** Re-read from localStorage (after the legacy migration has carried keys over). */
export function reloadThemePrefs(): void {
  mode.value = readMode();
  accent.value = readAccent();
}

export function isLight(): boolean {
  return mode.value === 'auto' ? systemLight.value : mode.value === 'light';
}

export function setMode(m: Mode): void {
  mode.value = m;
  try {
    if (m === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, m);
  } catch { /* storage blocked */ }
}

export function setAccent(a: ColorId): void {
  accent.value = a;
  try { localStorage.setItem(ACCENT_KEY, a); } catch { /* storage blocked */ }
}

/** Inline style vars that tint a subtree in a task's color. */
export function taskVars(color: string): Record<string, string> {
  const light = isLight();
  const c = accentHex(color, light);
  return { '--lit': c, '--btn': c, '--lit-soft': rgba(c, light ? 0.2 : 0.28) };
}

export function paintTheme(): void {
  const root = document.documentElement;
  const light = isLight();
  const c = accentHex(accent.value, light);
  if (mode.value === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode.value);
  root.style.setProperty('--lit', c);
  root.style.setProperty('--btn', c);
  root.style.setProperty('--lit-soft', rgba(c, light ? 0.2 : 0.28));
  root.style.setProperty('--btn-text', light ? '#ffffff' : '#0c0a12');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f6f3fb' : '#0c0a12');
}

export function startTheme(): void {
  effect(paintTheme);
}
