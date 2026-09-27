// Press ripple for the few big tap targets (`.rip`): a soft circle grows from
// the touch point and fades, 350 ms. One delegated listener, no per-element wiring.
export function startRipple(): void {
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = (e.target as Element | null)?.closest<HTMLElement>('.rip');
    if (!el || (el as HTMLButtonElement).disabled) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = e.clientX - r.left - size / 2 + 'px';
    s.style.top = e.clientY - r.top - size / 2 + 'px';
    s.addEventListener('animationend', () => s.remove());
    el.appendChild(s);
  }, { passive: true });
}
