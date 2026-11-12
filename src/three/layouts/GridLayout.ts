import * as THREE from 'three';

// 5 columns x 4 rows per layer, 10 layers deep = 200 cards.
// If you meant 4 wide x 5 tall, just swap COLS and ROWS.
const COLS = 5;
const ROWS = 4;
const LAYERS = 10;

const SPACING_X = 360;   // card width 120 + 240 gap
const SPACING_Y = 300;   // card height 160 + 140 gap
const SPACING_Z = 300;   // distance between layers

export function createGridLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];

  const perLayer = COLS * ROWS;

  for (let i = 0; i < count; i++) {

    // i is an "odometer": column spins fastest, then row, then layer
    const col = i % COLS;                          // 0..4
    const row = Math.floor(i / COLS) % ROWS;       // 0..3
    const layer = Math.floor(i / perLayer);        // 0..9 (for 200 cards)

    const object = new THREE.Object3D();

    // each index is shifted by half the span so the block is centred on the origin
    object.position.x = (col - (COLS - 1) / 2) * SPACING_X;
    object.position.y = -(row - (ROWS - 1) / 2) * SPACING_Y;   // minus: rows go down, +Y is up
    object.position.z = (layer - (LAYERS - 1) / 2) * SPACING_Z;

    targets.push(object);
  }

  return targets;
}