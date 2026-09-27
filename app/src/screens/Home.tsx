import { useComputed } from '@preact/signals';
import { IconButton } from '../components/Button';
import { ListRow } from '../components/ListRow';
import { activeTasks, archivedTasks, entries, toggleDay, storageWarning } from '../model/store';
import { session, syncOn, statusNote } from '../model/session';
import { onDays, streak, lastDays } from '../lib/stats';
import { todayIso } from '../lib/dates';
import { showArchived } from '../lib/prefs';
import { push, openSheet } from '../lib/nav';
import type { Task } from '../model/types';
import './Home.css';

export function Home() {
  const today = todayIso();
  const strip14 = lastDays(14);
  const list = activeTasks.value;
  const archived = showArchived.value ? archivedTasks.value : [];
  const status = useComputed(() => {
    if (!session.value) return statusNote.value || 'Not signed in. Days are kept only on this device.';
    if (!syncOn.value) return 'Sync is off.';
    return statusNote.value;
  });

  const row = (t: Task) => {
    const days = onDays(entries.value[t.id]);
    return (
      <ListRow
        key={t.id}
        task={t}
        streak={streak(days)}
        strip={strip14.map((d) => days.has(d))}
        doneToday={days.has(today)}
        onOpen={() => push({ name: 'task', taskId: t.id })}
        onToggleToday={(e) => {
          const on = toggleDay(t.id, today);
          const el = e.currentTarget as HTMLElement | null;
          if (on && el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        }}
      />
    );
  };

  return (
    <div class="screen home">
      <header class="top">
        <h1>TaskTracker</h1>
        <div class="actions">
          <IconButton icon="plus" label="Add task" class="accent" onClick={() => openSheet('add')} />
          <IconButton icon="gear" label="Settings" onClick={() => openSheet('settings')} />
        </div>
      </header>

      {list.length === 0 && archived.length === 0 ? (
        <div class="empty">
          <h2>Nothing to track yet</h2>
          One square per day for anything you want to do daily. Add your first task with the + button.
        </div>
      ) : (
        <div class="tasks">{list.map(row)}</div>
      )}

      {archived.length > 0 && (
        <>
          <p class="sheet-label">Archived</p>
          <div class="tasks archived">{archived.map(row)}</div>
        </>
      )}

      {list.length > 0 && <p class="home-hint">Tap a task to see its year. Tap the check to mark today.</p>}
      <p class="status">{storageWarning.value || status.value}</p>
    </div>
  );
}
