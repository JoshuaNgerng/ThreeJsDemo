import * as THREE from 'three';

// 800 was fine for 118 cards but is too tight for 200 (neighbours get closer than a card's diagonal).
// 900 keeps neighbours >= ~200 apart and the whole sphere still fits the default camera view.
const RADIUS = 900;

export function createSphereLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];

  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {

    // "+ 0.5" centres each point in its own equal-area band, so the poles are symmetric
    // and no card sits exactly on a pole (where lookAt has no clear "up").
    const phi = Math.acos(-1 + (2 * (i + 0.5)) / count);

    // grows with phi, which winds the points around the sphere in a spiral
    const theta = Math.sqrt(count * Math.PI) * phi;

    const object = new THREE.Object3D();

    object.position.setFromSphericalCoords(
      RADIUS,
      phi,
      theta
    );

    // look at a point twice as far out in the same direction: card faces outward
    vector.copy(object.position).multiplyScalar(2);

    object.lookAt(vector);

    targets.push(object);
  }

  return targets;
}