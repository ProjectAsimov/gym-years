import { useState, useEffect } from 'preact/hooks';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { Swatches } from '../components/Swatches';
import { IconPicker } from '../components/IconPicker';
import { addTask, updateTask, taskById } from '../model/store';
import type { ColorId, IconId } from '../model/types';
import { accent } from '../lib/theme';
import { closeSheet } from '../lib/nav';
import './TaskForm.css';

interface Props {
  open: boolean;
  /** When set, the sheet edits this task instead of creating one. */
  taskId?: string;
}

export function TaskForm({ open, taskId }: Props) {
  const existing = taskId ? taskById(taskId) : undefined;
  const [name, setName] = useState('');
  const [color, setColor] = useState<ColorId>('purple');
  const [icon, setIcon] = useState<IconId>('check');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setColor(existing?.color ?? accent.value);
    setIcon(existing?.icon ?? 'check');
    setTouched(false);
  }, [open, taskId]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 40;

  const submit = (e: Event) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    if (existing) updateTask(existing.id, { name: trimmed, color, icon });
    else addTask(trimmed, color, icon);
    closeSheet();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title={existing ? 'Edit task' : 'Add task'} labelledBy="taskFormTitle" doneLabel="Cancel">
      <form onSubmit={submit} class="task-form">
        <p class="sheet-label">Name</p>
        <input
          class="field"
          type="text"
          value={name}
          maxLength={40}
          placeholder="e.g. Gym, Read, Meditate"
          autocomplete="off"
          enterkeyhint="done"
          aria-invalid={touched && !valid}
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
        />
        <p class="note">{touched && !valid ? 'Give the task a name (up to 40 characters).' : `${trimmed.length}/40`}</p>
        <p class="sheet-label">Color</p>
        <Swatches value={color} onChange={setColor} />
        <p class="sheet-label">Icon</p>
        <IconPicker value={icon} onChange={setIcon} />
        <div class="row form-actions">
          <Button primary type="submit" disabled={!valid}>{existing ? 'Save' : 'Add task'}</Button>
        </div>
      </form>
    </Sheet>
  );
}
