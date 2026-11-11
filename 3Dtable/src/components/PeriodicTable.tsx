import { useState } from 'react';
import { usePeriodicScene } from '../hooks/usePeriodicScene';
import { Controls } from './Controls';
import type { LayoutName } from '../three/PeriodicTableScene';
import './PeriodicTable.css';

export function PeriodicTable() {
  const { containerRef, setLayout } = usePeriodicScene();
  const [layout, setLayoutState] = useState<LayoutName>('table');

  const handleChange = (next: LayoutName) => {
    setLayoutState(next);
    setLayout(next);
  };

  return (
    <div className="periodic-table">
      <div ref={containerRef} className="viewport" />
      <Controls active={layout} onChange={handleChange} />
    </div>
  );
}
