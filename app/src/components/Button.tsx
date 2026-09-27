import type { ComponentChildren, JSX } from 'preact';
import { Icon, type UiIconId } from './Icon';
import './Button.css';

type Base = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'class' | 'className' | 'type' | 'disabled'> & { class?: string; children?: ComponentChildren; type?: 'button' | 'submit'; disabled?: boolean };

/** Small pill button (`.b` in the reference). */
export function Button({ warn, primary, class: cls, children, type = 'button', ...rest }: Base & { warn?: boolean; primary?: boolean }) {
  return (
    <button type={type} class={['b', warn && 'warn', primary && 'primary', cls].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}

/** 40x40 square icon button (`.icon-btn`). */
export function IconButton({ icon, label, class: cls, ...rest }: Base & { icon: UiIconId; label: string }) {
  return (
    <button type="button" class={['icon-btn', cls].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} strokeWidth={icon === 'gear' ? 2 : 2.2} />
    </button>
  );
}

/** "Continue with Google" (`.gbtn`). */
export function GoogleButton({ children = 'Continue with Google', ...rest }: Base) {
  return (
    <button type="button" class="gbtn" {...rest}>
      <span class="glogo" aria-hidden="true" />
      {children}
    </button>
  );
}

/** Underlined text link button. */
export function LinkButton({ children, ...rest }: Base) {
  return <button type="button" class="link" {...rest}>{children}</button>;
}
