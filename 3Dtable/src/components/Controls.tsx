
import type { LayoutName } from '../three/PeriodicTableScene';

const LAYOUTS: { id: LayoutName; label: string }[] = [
  { id: 'table', label: 'TABLE' },
  { id: 'sphere', label: 'SPHERE' },
  { id: 'helix', label: 'HELIX' },
  { id: 'grid', label: 'GRID' },
];

interface ControlsProps {
  active: LayoutName;
  onChange: (layout: LayoutName) => void;
}

export function Controls({ active, onChange }: ControlsProps) {
  return (
    <div className="controls">
      {LAYOUTS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={id === active ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}