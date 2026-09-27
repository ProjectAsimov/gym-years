import { useRef } from 'preact/hooks';
import { IconButton } from '../components/Button';
import { StatTile, StatRow } from '../components/StatTile';
import { Heatmap } from '../components/Heatmap';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { entries, taskById, toggleDay, updateTask, deleteTask } from '../model/store';
import { onDays, taskStats, yearsWithData } from '../lib/stats';
import { todayIso, shortMonth } from '../lib/dates';
import { taskVars } from '../lib/theme';
import { back, push, openSheet, closeSheet, swapSheet, sheet, leaveTask } from '../lib/nav';
import './Task.css';

export function TaskScreen({ taskId }: { taskId: string }) {
  const task = taskById(taskId);
  const btn = useRef<HTMLButtonElement>(null);
  if (!task || task.deleted) {
    return (
      <div class="screen">
        <header class="top"><IconButton icon="back" label="Back" onClick={back} /><h1>Task</h1><span class="spacer" /></header>
        <p class="hint">This task is gone.</p>
      </div>
    );
  }
  const today = todayIso();
  const days = onDays(entries.value[taskId]);
  const st = taskStats(days);
  const done = days.has(today);

  const onToday = () => {
    const on = toggleDay(taskId, today);
    const b = btn.current;
    if (on && b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  };


  return (
    <div class="screen task" style={taskVars(task.color)}>
      <header class="top">
        <IconButton icon="back" label="Back to tasks" onClick={back} />
        <h1 class="center"><span class="task-title"><Icon name={task.icon} size={16} />{task.name}</span></h1>
        <IconButton icon="dots" label="More" onClick={() => openSheet('menu')} />
      </header>

      <button ref={btn} type="button" class={'today' + (done ? ' done' : '')} onClick={onToday} aria-pressed={done}>
        {done ? <>Done today &#10003;<small>{st.streak > 1 ? `Day ${st.streak} in a row. ` : ''}Tap to undo</small></>
              : <>Mark today<small>{st.streak > 0 ? `Keep your ${st.streak}-day streak going` : 'Tap once to light up today'}</small></>}
      </button>

      <StatRow>
        <StatTile value={st.streak} label="day streak" sub={`best ${st.best}`} />
        <StatTile value={st.thisMonth} label="this month" sub={`${st.monthDelta > 0 ? '+' : ''}${st.monthDelta} vs ${shortMonth(st.month ? st.month - 1 : 11)}`} up={st.monthDelta > 0} />
        <StatTile value={st.thisYear} label={`in ${st.year}`} sub={`${st.total} all time`} />
      </StatRow>

      {yearsWithData(days).map((y) => (
        <Heatmap key={y} year={y} days={days} onOpenMonth={(yy, m) => push({ name: 'month', taskId, y: yy, m })} />
      ))}
      <p class="home-hint">Tap the grid to open a month and edit past days.</p>

      <Sheet open={sheet.value === 'menu'} onClose={closeSheet} title={task.name} labelledBy="menuTitle">
        <div class="menu">
          <button type="button" onClick={() => swapSheet('edit')}>Rename</button>
          <button type="button" onClick={() => swapSheet('edit')}>Change color or icon</button>
          <button type="button" onClick={() => {
            const archiving = !task.archived;
            updateTask(taskId, { archived: archiving ? 1 : 0 });
            if (archiving) leaveTask(taskId); else closeSheet();
          }}>{task.archived ? 'Unarchive' : 'Archive'}</button>
          <button type="button" class="warn" onClick={() => {
            if (!confirm(`Delete "${task.name}" and all its days? This cannot be undone.`)) return;
            deleteTask(taskId);
            leaveTask(taskId);
          }}>Delete</button>
        </div>
      </Sheet>
    </div>
  );
}
