import { signal } from '@preact/signals';
import './Toast.css';

const msg = signal('');
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, ms = 2200): void {
  msg.value = text;
  clearTimeout(timer);
  timer = setTimeout(() => { msg.value = ''; }, ms);
}

export function Toast() {
  return (
    <div class="toast" role="status" aria-live="polite" hidden={!msg.value}>
      {msg.value}
    </div>
  );
}
