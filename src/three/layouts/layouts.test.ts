import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ElementData } from '../../types/elements';
import { createGridLayout } from './GridLayout';
import { createHelixLayout } from './HelixLayout';
import { createSphereLayout } from './SphereLayout';
import { createTableLayout } from './TableLayout';

const COUNT = 200;

function makeElements(n: number): ElementData[] {
  return Array.from({ length: n }, (_, i) => ({
    photo: `https://example.com/${i}.jpg`,
    name: `Person ${i}`,
    country: 'MY',
    interest: 'Chess',
    age: 30,
    networth: 1000 * i,
  }));
}

const positions = (objects: THREE.Object3D[]) => objects.map((o) => o.position);
const distinct = (values: number[]) => new Set(values.map((v) => v.toFixed(6))).size;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const key = (p: THREE.Vector3) => [p.x, p.y, p.z].map((v) => v.toFixed(3)).join(',');

function minPairDistance(points: THREE.Vector3[]) {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, points[i].distanceTo(points[j]));
    }
  }
  return min;
}

/** Direction a card's front (+Z) points in world space. */
const facing = (o: THREE.Object3D) => new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);

describe('every layout', () => {
  const layouts: [string, (n: number) => THREE.Object3D[]][] = [
    ['table', (n) => createTableLayout(makeElements(n))],
    ['grid', createGridLayout],
    ['helix', createHelixLayout],
    ['sphere', createSphereLayout],
  ];

  describe.each(layouts)('%s', (_name, build) => {
    it.each([1, 2, 7, 118, 200])('returns exactly one target per card (%i)', (n) => {
      expect(build(n)).toHaveLength(n);
    });

    it('returns an empty list for zero cards', () => {
      expect(build(0)).toEqual([]);
    });

    it('never produces NaN coordinates', () => {
      for (const p of positions(build(COUNT))) {
        expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
      }
    });

    it('gives every card its own position', () => {
      const keys = positions(build(COUNT)).map(key);
      expect(new Set(keys).size).toBe(COUNT);
    });
  });
});

describe('table layout (20 x 10)', () => {
  const points = positions(createTableLayout(makeElements(COUNT)));

  it('uses 20 columns and 10 rows', () => {
    expect(distinct(points.map((p) => p.x))).toBe(20);
    expect(distinct(points.map((p) => p.y))).toBe(10);
  });

  it('is a flat wall at z = 0', () => {
    expect(points.every((p) => p.z === 0)).toBe(true);
  });

  it('fills left to right, then top to bottom', () => {
    expect(points[0]).toMatchObject({ x: -1330, y: 810 });     // top-left
    expect(points[19]).toMatchObject({ x: 1330, y: 810 });     // end of the first row
    expect(points[20]).toMatchObject({ x: -1330, y: 630 });    // start of the second row
    expect(points[199]).toMatchObject({ x: 1330, y: -810 });   // bottom-right
  });

  it('is centred on the origin', () => {
    expect(mean(points.map((p) => p.x))).toBeCloseTo(0);
    expect(mean(points.map((p) => p.y))).toBeCloseTo(0);
  });

  it('leaves a 20 unit gap between 120 x 160 cards', () => {
    expect(points[1].x - points[0].x).toBe(140);
    expect(points[0].y - points[20].y).toBe(180);
  });
});

describe('grid layout (5 x 4 x 10)', () => {
  const points = positions(createGridLayout(COUNT));

  it('uses 5 columns, 4 rows and 10 layers', () => {
    expect(distinct(points.map((p) => p.x))).toBe(5);
    expect(distinct(points.map((p) => p.y))).toBe(4);
    expect(distinct(points.map((p) => p.z))).toBe(10);
  });

  it('puts 20 cards in each layer', () => {
    const perLayer = new Map<string, number>();
    for (const p of points) {
      const k = p.z.toFixed(3);
      perLayer.set(k, (perLayer.get(k) ?? 0) + 1);
    }
    expect([...perLayer.values()]).toEqual(Array(10).fill(20));
  });

  it('fills columns, then rows, then layers (odometer order)', () => {
    expect(points[0]).toMatchObject({ x: -720, y: 450, z: -1350 });
    expect(points[4]).toMatchObject({ x: 720, y: 450, z: -1350 });    // last column
    expect(points[5]).toMatchObject({ x: -720, y: 150, z: -1350 });   // next row
    expect(points[20]).toMatchObject({ x: -720, y: 450, z: -1050 });  // next layer
    expect(points[199]).toMatchObject({ x: 720, y: -450, z: 1350 });
  });

  it('is centred on the origin', () => {
    expect(mean(points.map((p) => p.x))).toBeCloseTo(0);
    expect(mean(points.map((p) => p.y))).toBeCloseTo(0);
    expect(mean(points.map((p) => p.z))).toBeCloseTo(0);
  });

  it('keeps every card in front of the camera (z < 3000)', () => {
    expect(Math.max(...points.map((p) => p.z))).toBeLessThan(3000);
  });
});

describe('double helix layout', () => {
  const objects = createHelixLayout(COUNT);
  const points = positions(objects);

  it('keeps every card on a 900 unit radius cylinder', () => {
    for (const p of points) {
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(900, 6);
    }
  });

  it('is centred vertically', () => {
    expect(mean(points.map((p) => p.y))).toBeCloseTo(0, 6);
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(551.47, 1);
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(-551.47, 1);
  });

  it('pairs cards 2k and 2k+1 directly opposite each other at the same height', () => {
    for (let i = 0; i < COUNT; i += 2) {
      const a = points[i];
      const b = points[i + 1];
      expect(b.x).toBeCloseTo(-a.x, 6);
      expect(b.z).toBeCloseTo(-a.z, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    }
  });

  it('descends along each strand', () => {
    const strand0 = points.filter((_, i) => i % 2 === 0).map((p) => p.y);
    const strand1 = points.filter((_, i) => i % 2 === 1).map((p) => p.y);
    for (const strand of [strand0, strand1]) {
      expect(strand.every((y, i) => i === 0 || y < strand[i - 1])).toBe(true);
    }
  });

  it('keeps neighbouring cards at least a card width apart', () => {
    expect(minPairDistance(points)).toBeGreaterThan(120);
  });

  it('faces outward and stays upright', () => {
    for (const o of objects) {
      const outward = new THREE.Vector3(o.position.x, 0, o.position.z).normalize();
      expect(facing(o).dot(outward)).toBeGreaterThan(0.999);
    }
  });

  it('handles an odd card count', () => {
    expect(createHelixLayout(7)).toHaveLength(7);
  });
});

describe('sphere layout', () => {
  const objects = createSphereLayout(COUNT);
  const points = positions(objects);

  it('puts every card on a 900 unit radius sphere', () => {
    for (const p of points) {
      expect(p.length()).toBeCloseTo(900, 6);
    }
  });

  it('spreads cards over the whole ball, not one side', () => {
    expect(Math.max(...points.map((p) => p.y))).toBeGreaterThan(850);
    expect(Math.min(...points.map((p) => p.y))).toBeLessThan(-850);
    expect(Math.abs(mean(points.map((p) => p.x)))).toBeLessThan(5);
    expect(Math.abs(mean(points.map((p) => p.z)))).toBeLessThan(5);
  });

  it('keeps neighbours about a card diagonal (200) apart', () => {
    expect(minPairDistance(points)).toBeGreaterThan(190);
  });

  it('faces every card straight out from the centre', () => {
    for (const o of objects) {
      const outward = o.position.clone().normalize();
      expect(facing(o).dot(outward)).toBeGreaterThan(0.999);
    }
  });
});
