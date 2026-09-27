import { Icon } from './Icon';
import { taskVars } from '../lib/theme';
import type { Task } from '../model/types';
import './ListRow.css';

interface Props {
  task: Task;
  streak: number;
  /** Last 14 days, oldest first, true when done. */
  strip: boolean[];
  doneToday: boolean;
  onOpen: () => void;
  onToggleToday: (e: MouseEvent) => void;
}

export function ListRow({ task, streak, strip, doneToday, onOpen, onToggleToday }: Props) {
  const streakText = streak === 1 ? '1 day streak' : `${streak} day streak`;
  const grouped = !!task.groupId;
  return (
    <div class="lrow" style={taskVars(task.color)}>
      <button
        type="button"
        class="lrow-main"
        onClick={onOpen}
        aria-label={`${task.name}, ${streakText}${grouped ? ', shared with a group' : ''}. Open`}
      >
        <span class="lrow-icon"><Icon name={task.icon} size={20} /></span>
        <span class="lrow-text">
          <span class="lrow-name">
            {task.name}
            {grouped && <Icon name="users" size={13} class="lrow-group" />}
          </span>
          <span class="lrow-sub">{streakText}</span>
          <span class="lrow-strip" aria-hidden="true">
            {strip.map((on, i) => <i key={i} class={on ? 'on' : i === strip.length - 1 ? 't' : undefined} />)}
          </span>
        </span>
      </button>
      <button
        type="button"
        class={'lrow-today' + (doneToday ? ' done' : '')}
        aria-pressed={doneToday}
        aria-label={doneToday ? `${task.name}: done today. Tap to undo` : `${task.name}: mark today`}
        onClick={onToggleToday}
      >
        <Icon name="check" size={26} strokeWidth={3} />
      </button>
    </div>
  );
}
