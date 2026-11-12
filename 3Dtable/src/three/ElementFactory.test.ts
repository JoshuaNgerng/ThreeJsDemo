import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { describe, expect, it } from 'vitest';
import type { ElementData } from '../types/elements';
import { CSSLink, createElement } from './ElementFactory';

const person: ElementData = {
  photo: 'https://example.com/alex.jpg',
  name: 'Alex Tan',
  country: 'MY',
  interest: 'Chess',
  age: 30,
  networth: 0,
};

const text = (card: HTMLElement, cls: string) => card.querySelector(`.${cls}`)?.textContent;

/** How this browser normalises a CSS colour, so tests don't depend on hex vs rgb() output. */
function css(colour: string) {
  const probe = document.createElement('div');
  probe.style.backgroundColor = colour;
  return probe.style.backgroundColor;
}

describe('createElement', () => {
  it('returns a CSS3DObject wrapping a card div', () => {
    const object = createElement(person);

    expect(object).toBeInstanceOf(CSS3DObject);
    expect(object.element).toBeInstanceOf(HTMLDivElement);
    expect(object.element).toHaveClass(CSSLink.card);
  });

  it('shows country and age in the header', () => {
    const card = createElement(person).element;

    expect(text(card, CSSLink.country)).toBe('MY');
    expect(text(card, CSSLink.age)).toBe('30');
  });

  it('shows name and interest in the footer', () => {
    const card = createElement(person).element;

    expect(text(card, CSSLink.name)).toBe('Alex Tan');
    expect(text(card, CSSLink.interest)).toBe('Chess');
  });

  it('renders the photo inside the photo frame with alt text', () => {
    const card = createElement(person).element;
    const img = card.querySelector<HTMLImageElement>(`.${CSSLink.photoFrame} img.${CSSLink.photo}`);

    expect(img).not.toBeNull();
    expect(img?.src).toBe('https://example.com/alex.jpg');
    expect(img?.alt).toBe('Alex Tan');
  });

  it('removes a broken image but keeps the frame, so the card layout holds', () => {
    const card = createElement(person).element;
    const img = card.querySelector('img') as HTMLImageElement;

    img.dispatchEvent(new Event('error'));

    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector(`.${CSSLink.photoFrame}`)).not.toBeNull();
  });

  it('treats text as text, not HTML', () => {
    const card = createElement({ ...person, name: '<b>Bold</b>', interest: '<i>x</i>' }).element;

    expect(card.querySelector('.name b')).toBeNull();
    expect(text(card, CSSLink.name)).toBe('<b>Bold</b>');
    expect(card.querySelector('.interest i')).toBeNull();
  });

  it('colours the card by net worth', () => {
    const background = (networth: number) => createElement({ ...person, networth }).element.style.backgroundColor;

    expect(background(0)).toBe(css('#EF3022'));          // low: red
    expect(background(100000)).toBe(css('#FDCA35'));     // middle: orange
    expect(background(200000)).toBe(css('#3A9F4B'));     // high: green
    expect(background(5_000_000)).toBe(css('#3A9F4B'));  // above the scale stays green
  });

  it('starts at a random position inside a 4000 unit cube', () => {
    for (let i = 0; i < 25; i++) {
      const { x, y, z } = createElement(person).position;
      for (const v of [x, y, z]) {
        expect(v).toBeGreaterThanOrEqual(-2000);
        expect(v).toBeLessThanOrEqual(2000);
      }
    }
  });
});
