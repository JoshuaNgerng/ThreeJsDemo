import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import type { ElementData } from '../types/elements';
import { Colour, interpolateColor } from '../services/colour';

export const CSSLink = {
  card: 'element',
  header: 'header',
  country: 'country',
  age: 'age',
  photoFrame: 'photo-frame',
  photo: 'photo',
  name: 'name',
  interest: 'interest',
} as const;

export function createElement(element: ElementData): CSS3DObject {
  const div = el('div', CSSLink.card);
  div.style.backgroundColor = getColor(element.networth);

  // header: country ----- age
  const header = el('div', CSSLink.header);
  header.append(
    el('span', CSSLink.country, element.country),
    el('span', CSSLink.age, String(element.age))
  );

  // photo
  const frame = el('div', CSSLink.photoFrame);
  const img = el('img', CSSLink.photo);
  img.src = element.photo;
  img.alt = element.name;
  img.draggable = false;
  img.onerror = () => img.remove();
  frame.append(img);

  // footer
  const name = el('div', CSSLink.name, element.name);
  const interest = el('div', CSSLink.interest, element.interest);

  div.append(header, frame, name, interest);

  const object = new CSS3DObject(div);
  object.position.set(
    Math.random() * 4000 - 2000,
    Math.random() * 4000 - 2000,
    Math.random() * 4000 - 2000
  );
  return object;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function getColor(value: number) {
  const colour = new Colour();

  if (value <= 100000) {
      return interpolateColor(colour.red, colour.orange, value / 100000);
  }

  if (value <= 200000) {
      return interpolateColor(colour.orange, colour.green, (value - 100000) / 100000);
  }

  return colour.green;
}
