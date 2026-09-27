import { ACCENTS, accentHex } from '../lib/palette';
import { isLight, mode } from '../lib/theme';
import type { ColorId } from '../model/types';
import './Swatches.css';

interface Props { value: ColorId; onChange: (c: ColorId) => void; label?: string }

export function Swatches({ value, onChange, label = 'Color' }: Props) {
  void mode.value; // re-render when the mode flips so shades follow
  const light = isLight();
  return (
    <div class="swatches" role="group" aria-label={label}>
      {ACCENTS.map((a) => (
        <button
          type="button"
          key={a.id}
          class="sw"
          title={a.name}
          aria-label={a.name}
          aria-pressed={a.id === value}
          style={{ background: accentHex(a.id, light) }}
          onClick={() => onChange(a.id)}
        />
      ))}
    </div>
  );
}
