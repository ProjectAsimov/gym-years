import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Button } from './Button';
import './Sheet.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Centered card instead of a bottom sheet (the welcome dialog). */
  center?: boolean;
  labelledBy?: string;
  children?: ComponentChildren;
  /** Text of the header button; omit for no header. */
  doneLabel?: string;
}

/** A native <dialog>: modal, with backdrop, closed by Escape / backdrop tap via onClose (history-based). */
export function Sheet({ open, onClose, title, center, labelledBy, children, doneLabel = 'Done' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      class={center ? 'center' : undefined}
      aria-labelledby={labelledBy}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <div class={center ? 'sheet welcome' : 'sheet'}>
        {title && (
          <div class="sheet-head">
            <h2 id={labelledBy}>{title}</h2>
            <Button onClick={onClose}>{doneLabel}</Button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
