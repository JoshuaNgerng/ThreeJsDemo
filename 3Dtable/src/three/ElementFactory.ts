import type { ElementData } from '../data/elements';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export const CSSLink = {
  card: 'element',
  number: 'number',
  symbol: 'symbol',
  details: 'details',
} as const;

export function createElement(
  element: ElementData,
  index: number
): CSS3DObject {

  const div = document.createElement('div');

  div.className = CSSLink.card;

  div.style.backgroundColor =
    `rgba(0,127,127,${Math.random() * 0.5 + 0.25})`;

  const number = document.createElement('div');
  number.className = CSSLink.number;
  number.textContent = String(index + 1);

  const symbol = document.createElement('div');
  symbol.className = CSSLink.symbol;
  symbol.textContent = element.symbol;

  const details = document.createElement('div');
  details.className = CSSLink.details;

  details.innerHTML = `${element.name}<br>${element.weight}`;

  div.append(number, symbol, details);

  const object = new CSS3DObject(div);

  object.position.set(
    Math.random() * 4000 - 2000,
    Math.random() * 4000 - 2000,
    Math.random() * 4000 - 2000
  );

  return object;
}

// ElementFactory.ts
// div.className = 'element';
// number.className = 'number';
// symbol.className = 'symbol';
// details.className = 'details';
/* PeriodicTable.css */
// .element { ... }
// .element .number { ... }
// .element .symbol { ... }
// .element .details { ... }