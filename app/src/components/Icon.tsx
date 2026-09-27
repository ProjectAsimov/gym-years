import type { JSX } from 'preact';
import type { IconId } from '../model/types';

// Task icons (24x24 stroke set). Ids are stored on tasks and synced, so keep them stable.
const TASK_ICONS: Record<IconId, JSX.Element> = {
  dumbbell: <><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/></>,
  run: <><circle cx="15" cy="4" r="1.6"/><path d="M13 8l-4 3 2 3-3 6M13 8l3 3 4 1M11 14l4 2-1 5"/></>,
  book: <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></>,
  water: <><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></>,
  meditate: <><circle cx="12" cy="5" r="1.8"/><path d="M12 9v5M8 12l4 2 4-2M5 19c2-3 5-4 7-4s5 1 7 4M8 19h8"/></>,
  pill: <><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9 9l6 6"/></>,
  sleep: <><path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z"/></>,
  food: <><path d="M5 3v7a3 3 0 0 0 3 3v8M11 3v7a3 3 0 0 1-3 3M8 3v10M18 3c-2 0-3 3-3 6v3h3v9"/></>,
  code: <><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></>,
  music: <><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></>,
  pen: <><path d="M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16zM14 6l3 3"/></>,
  check: <><path d="M5 12l5 5L20 7"/></>,
};

export const ICON_IDS = Object.keys(TASK_ICONS) as IconId[];
export function isIconId(x: unknown): x is IconId {
  return typeof x === 'string' && x in TASK_ICONS;
}

const UI_ICONS = {
  gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  back: <path d="M15 18l-6-6 6-6"/>,
  next: <path d="M9 18l6-6-6-6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  dots: <><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3"/></>,
};
export type UiIconId = keyof typeof UI_ICONS;

interface Props { name: IconId | UiIconId; size?: number; class?: string; strokeWidth?: number }

export function Icon({ name, size = 18, class: cls, strokeWidth }: Props) {
  const body = (TASK_ICONS as Record<string, JSX.Element>)[name] ?? (UI_ICONS as Record<string, JSX.Element>)[name] ?? null;
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}
