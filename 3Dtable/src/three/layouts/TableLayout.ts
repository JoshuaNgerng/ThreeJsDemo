import * as THREE from 'three';
import type { ElementData } from '../../types/elements';

const COLS = 20;
const ROWS = 10;
const SPACING_X = 140;   // card width 120 + 20 gap
const SPACING_Y = 180;   // card height 160 + 20 gap

export function createTableLayout(
  elements: ElementData[]
): THREE.Object3D[] {

  return elements.map((_, index) => {
    const col = index % COLS;                  // 0..19, wraps every 20 cards
    const row = Math.floor(index / COLS);      // 0..9, ticks up every 20 cards

    const object = new THREE.Object3D();

    // centre the whole table on the origin
    object.position.x = (col - (COLS - 1) / 2) * SPACING_X;
    object.position.y = -(row - (ROWS - 1) / 2) * SPACING_Y;

    return object;
  });
}
