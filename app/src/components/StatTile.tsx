import type { ComponentChildren } from 'preact';
import './StatTile.css';

interface Props { value: number | string; label: string; sub?: string; up?: boolean }

export function StatTile({ value, label, sub, up }: Props) {
  return (
    <div class="stat">
      <b>{value}</b>
      <span>{label}</span>
      {sub !== undefined && <em class={up ? 'up' : undefined}>{sub}</em>}
    </div>
  );
}

export function StatRow({ children }: { children: ComponentChildren }) {
  return <div class="stats">{children}</div>;
}
