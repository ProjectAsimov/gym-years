import { Icon, ICON_IDS } from './Icon';
import type { IconId } from '../model/types';
import './IconPicker.css';

interface Props { value: IconId; onChange: (i: IconId) => void }

export function IconPicker({ value, onChange }: Props) {
  return (
    <div class="icons" role="group" aria-label="Icon">
      {ICON_IDS.map((id) => (
        <button type="button" key={id} class="ic" aria-label={id} title={id} aria-pressed={id === value} onClick={() => onChange(id)}>
          <Icon name={id} size={22} />
        </button>
      ))}
    </div>
  );
}
