import { describe, expect, it } from 'vitest';
import { Colour, interpolateColor } from './colour';

describe('Colour palette', () => {
  it('exposes the three scale colours', () => {
    const c = new Colour();
    expect(c.red).toBe('#EF3022');
    expect(c.orange).toBe('#FDCA35');
    expect(c.green).toBe('#3A9F4B');
  });
});

describe('interpolateColor', () => {
  const c = new Colour();

  it('returns the first colour at factor 0', () => {
    expect(interpolateColor(c.red, c.orange, 0)).toBe('#EF3022');
  });

  it('returns the second colour at factor 1', () => {
    expect(interpolateColor(c.red, c.orange, 1)).toBe('#FDCA35');
  });

  it('blends channel by channel at the midpoint', () => {
    expect(interpolateColor('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(interpolateColor(c.red, c.orange, 0.5)).toBe('#F67D2C');
  });

  it('clamps factors outside 0..1', () => {
    expect(interpolateColor(c.red, c.orange, 5)).toBe('#FDCA35');
    expect(interpolateColor(c.red, c.orange, -3)).toBe('#EF3022');
  });

  it('always returns an upper-case #RRGGBB string', () => {
    for (const f of [0, 0.1, 0.33, 0.5, 0.77, 1]) {
      expect(interpolateColor(c.orange, c.green, f)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
