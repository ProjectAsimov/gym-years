import { iso, MONTHS, todayIso } from '../lib/dates';
import { countMonth } from '../lib/stats';
import { Card } from './Card';
import { IconButton } from './Button';
import './MonthCalendar.css';

interface Props {
  y: number;
  m: number;
  days: Set<string>;
  onToggle: (day: string) => void;
  onPrev: () => void;
  onNext: () => void;
  /** Word used in aria labels, e.g. "done". */
  doneWord?: string;
}

export function MonthCalendar({ y, m, days, onToggle, onPrev, onNext, doneWord = 'done' }: Props) {
  const t = todayIso();
  const now = new Date();
  const first = new Date(y, m, 1);
  const dim = new Date(y, m + 1, 0).getDate();
  const isCurrent = y === now.getFullYear() && m === now.getMonth();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(<span key={'b' + i} class="c blank" />);
  for (let d = 1; d <= dim; d++) {
    const k = iso(new Date(y, m, d));
    const on = days.has(k);
    const future = k > t;
    cells.push(
      <button
        type="button"
        key={k}
        class={['c', on && 'on', k === t && 'today-cell', future && 'future'].filter(Boolean).join(' ')}
        disabled={future}
        aria-label={`${MONTHS[m]} ${d}${on ? ', ' + doneWord : ''}`}
        aria-pressed={on}
        onClick={() => onToggle(k)}
      >
        {d}
      </button>,
    );
  }
  return (
    <Card aria-label="Month calendar">
      <div class="cal-head">
        <h2>{MONTHS[m]} {y} <span>{countMonth(days, y, m)} days</span></h2>
        <div class="cal-nav">
          <IconButton icon="back" label="Previous month" onClick={onPrev} />
          <IconButton icon="next" label="Next month" onClick={onNext} disabled={isCurrent} />
        </div>
      </div>
      <div class="wk" aria-hidden="true">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="cal">{cells}</div>
      <p class="hint">Tap any past day to mark or unmark it.</p>
    </Card>
  );
}
