import type { ComponentChildren, JSX } from 'preact';
import './Card.css';

interface Props { children?: ComponentChildren; class?: string; style?: JSX.CSSProperties | string; 'aria-label'?: string }

export function Card({ children, class: cls, ...rest }: Props) {
  return <section class={['card', cls].filter(Boolean).join(' ')} {...rest}>{children}</section>;
}
