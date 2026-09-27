import type { ColorId } from '../model/types';

export interface Accent {
  id: ColorId;
  name: string;
  dark: string;
  light: string;
}

// Each accent has a brighter shade for dark mode and a deeper one for light
// mode, so button text stays readable.
export const ACCENTS: readonly Accent[] = [
  { id: 'purple', name: 'Purple', dark: '#a855f7', light: '#8b3fe0' },
  { id: 'blue', name: 'Blue', dark: '#3b82f6', light: '#2563eb' },
  { id: 'teal', name: 'Teal', dark: '#14b8a6', light: '#0f766e' },
  { id: 'green', name: 'Green', dark: '#22c55e', light: '#15803d' },
  { id: 'yellow', name: 'Yellow', dark: '#eab308', light: '#a16207' },
  { id: 'orange', name: 'Orange', dark: '#f97316', light: '#c2410c' },
  { id: 'red', name: 'Red', dark: '#ef4444', light: '#dc2626' },
  { id: 'pink', name: 'Pink', dark: '#ec4899', light: '#db2777' },
];

export const COLOR_IDS: readonly ColorId[] = ACCENTS.map((a) => a.id);

export function isColorId(x: unknown): x is ColorId {
  return typeof x === 'string' && (COLOR_IDS as readonly string[]).includes(x);
}

export function accentHex(id: string, light: boolean): string {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0]!;
  return light ? a.light : a.dark;
}

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}
