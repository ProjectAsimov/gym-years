import { IconButton } from '../components/Button';
import { MonthCalendar } from '../components/MonthCalendar';
import { entries, taskById, toggleDay } from '../model/store';
import { onDays } from '../lib/stats';
import { taskVars } from '../lib/theme';
import { back, replace } from '../lib/nav';

export function MonthScreen({ taskId, y, m }: { taskId: string; y: number; m: number }) {
  const task = taskById(taskId);
  const days = onDays(entries.value[taskId]);
  const go = (yy: number, mm: number) => {
    if (mm < 0) { mm = 11; yy--; }
    if (mm > 11) { mm = 0; yy++; }
    replace({ name: 'month', taskId, y: yy, m: mm });
  };
  return (
    <div class="screen month" style={taskVars(task?.color ?? 'purple')}>
      <header class="top">
        <IconButton icon="back" label="Back to years" onClick={back} />
        <h1 class="center">{task?.name ?? ''} · {y}</h1>
        <span class="spacer" />
      </header>
      <MonthCalendar
        y={y}
        m={m}
        days={days}
        onToggle={(day) => toggleDay(taskId, day)}
        onPrev={() => go(y, m - 1)}
        onNext={() => go(y, m + 1)}
      />
    </div>
  );
}
