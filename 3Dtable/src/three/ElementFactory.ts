import type { ElementData } from '../data/elements';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export function createElement(
  element: ElementData,
  index: number
): CSS3DObject {

  const div = document.createElement('div');

  div.className = 'element';

  div.style.backgroundColor =
    `rgba(0,127,127,${Math.random() * 0.5 + 0.25})`;

  const number = document.createElement('div');
  number.className = 'number';
  number.textContent = String(index + 1);

  const symbol = document.createElement('div');
  symbol.className = 'symbol';
  symbol.textContent = element.symbol;

  const details = document.createElement('div');
  details.className = 'details';

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