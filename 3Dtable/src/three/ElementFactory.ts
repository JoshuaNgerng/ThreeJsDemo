import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import type { ElementData } from '../types/elements';

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
    const red = "#EF3022";
    const orange = "#FDCA35";
    const green = "#3A9F4B";

    if (value <= 100000) {
        return interpolateColor(red, orange, value / 100000);
    }

    if (value <= 200000) {
        return interpolateColor(orange, green, (value - 100000) / 100000);
    }

    return green;
}

function interpolateColor(
    color1: string,
    color2: string,
    factor: number
): string {
    const hexToRgb = (hex: string): number[] => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
    ];

    const rgbToHex = (rgb: number[]): string =>
        "#" + rgb.map(v =>
            Math.round(v).toString(16).padStart(2, "0")
        ).join("").toUpperCase();

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const clampedFactor = Math.max(0, Math.min(1, factor));

    const result = c1.map((v, i) =>
        v + (c2[i] - v) * clampedFactor
    );

    return rgbToHex(result);
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