import * as THREE from 'three';

const RADIUS = 900;
const STRANDS = 2;                 // 2 = double helix
const ANGLE_STEP = 0.175;          // radians turned per card along one strand (~10 degrees)
const PITCH = 400;                 // vertical drop of one strand per full lap
const START_ANGLE = Math.PI;       // where strand 0 begins around the cylinder

export function createHelixLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];
  const vector = new THREE.Vector3();

  // cards per strand (100 for 200 cards)
  const perStrand = Math.ceil(count / STRANDS);

  // height lost per card along a strand, derived from the pitch:
  // one lap = 2*PI radians = (2*PI / ANGLE_STEP) cards, and drops PITCH
  const dy = (PITCH * ANGLE_STEP) / (2 * Math.PI);

  // top of the strand, chosen so the whole helix is centred on y = 0
  const yTop = ((perStrand - 1) * dy) / 2;

  for (let i = 0; i < count; i++) {

    // even cards -> strand 0, odd cards -> strand 1
    const strand = i % STRANDS;
    // position along its own strand (0, 0, 1, 1, 2, 2, ...)
    const step = Math.floor(i / STRANDS);

    // each strand starts at an equal share of a full turn (180 degrees for 2 strands)
    const theta = START_ANGLE + step * ANGLE_STEP + strand * ((2 * Math.PI) / STRANDS);
    const y = yTop - step * dy;

    const object = new THREE.Object3D();

    object.position.setFromCylindricalCoords(
      RADIUS,
      theta,
      y
    );

    // face outward but stay upright: scale x and z away from the axis, keep y
    vector.set(
      object.position.x * 2,
      object.position.y,
      object.position.z * 2
    );

    object.lookAt(vector);

    targets.push(object);
  }

  return targets;
}