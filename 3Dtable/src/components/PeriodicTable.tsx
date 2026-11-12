import { useState } from 'react';
import { usePeriodicScene } from '../hooks/usePeriodicScene';
import { Controls } from './Controls';
import type { LayoutName } from '../three/PeriodicTableScene';
import { Colour, interpolateColor } from '../services/colour';
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
      <div className="bottom-bar">
        <Controls active={layout} onChange={handleChange} />
        <ColourBar />
      </div>
    </div>
  );
}

/* find way to intergrate with ElementFactory later */

function ColourBar() {
  const colour = new Colour();
  const colours = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14;

    if (t <= 0.5) {
      return interpolateColor(colour.red, colour.orange, t * 2);
    }

    return interpolateColor(colour.orange, colour.green, (t - 0.5) * 2);
  });

  return (
    <div className="colour-bar">
      <span className="colour-label">LOW</span>

      <div className="colour-bar-segments">
        {colours.map((colour, i) => (
          <div
            key={i}
            className="colour-bar-segment"
            style={{ backgroundColor: colour }}
          />
        ))}
      </div>

      <span className="colour-label">HIGH</span>
    </div>
  );
}
