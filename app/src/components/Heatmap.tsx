import { iso, addDays, MONTHS, shortMonth, todayIso } from '../lib/dates';
import { countMonth, countYear } from '../lib/stats';
import { Card } from './Card';
import './Heatmap.css';

const HEAT_ROWS = 2;

interface Props {
  year: number;
  days: Set<string>;
  onOpenMonth: (y: number, m: number) => void;
}

/** One year, every day as a read-only square, weeks as columns, wrapped into two rows. */
export function Heatmap({ year: y, days, onOpenMonth }: Props) {
  const t = todayIso();
  const now = new Date();
  const total = countYear(days, y);
  const start = new Date(y, 0, 1);
  start.setDate(start.getDate() - start.getDay());
  const weeks = Math.ceil(((new Date(y, 11, 31).getTime() - start.getTime()) / 86400000 + 1) / 7);
  const per = Math.ceil(weeks / HEAT_ROWS);
  const canOpen = (m: number) => y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth());

  const rows = [];
  for (let r = 0; r < HEAT_ROWS; r++) {
    const w0 = r * per, w1 = Math.min(weeks, w0 + per);
    if (w0 >= w1) break;
    const labels = [];
    for (let m = 0; m < 12; m++) {
      const col = Math.floor((new Date(y, m, 1).getTime() - start.getTime()) / 86400000 / 7);
      if (col < w0 || col >= w1) continue;
      const style = col - w0 > per - 3 ? { right: 0 } : { left: ((col - w0) / per) * 100 + '%' };
      labels.push(
        <button
          type="button"
          key={m}
          style={style}
          disabled={!canOpen(m)}
          aria-label={`Open ${MONTHS[m]} ${y}, ${countMonth(days, y, m)} days`}
          onClick={() => onOpenMonth(y, m)}
        >
          {shortMonth(m)}
        </button>,
      );
    }
    const cells = [];
    for (let i = w0 * 7; i < w1 * 7; i++) {
      const cur = addDays(start, i);
      const k = iso(cur);
      let cls = '';
      let m = -1;
      if (cur.getFullYear() !== y) cls = 'x';
      else {
        cls = k > t ? 'f' : days.has(k) ? 'on' : '';
        if (k === t) cls += ' t';
        m = cur.getMonth();
      }
      cells.push(<i key={i} class={cls || undefined} data-m={m >= 0 ? m : undefined} />);
    }
    rows.push(
      <div key={'l' + r} class="hm">{labels}</div>,
      <div
        key={'g' + r}
        class="hg"
        style={{ gridTemplateColumns: `repeat(${per},1fr)` }}
        onClick={(e) => {
          const el = (e.target as HTMLElement).closest('[data-m]') as HTMLElement | null;
          if (!el || !el.dataset.m) return;
          const m = +el.dataset.m;
          if (canOpen(m)) onOpenMonth(y, m);
        }}
      >
        {cells}
      </div>,
    );
  }

  return (
    <Card class="year">
      <div class="year-head">
        <h2>{y}</h2>
        <span>{total}{total === 1 ? ' day' : ' days'}</span>
      </div>
      {rows}
    </Card>
  );
}
