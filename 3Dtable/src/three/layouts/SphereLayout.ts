import * as THREE from 'three';

export function createSphereLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];

  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {

    const phi = Math.acos(-1 + (2 * i) / count);

    const theta = Math.sqrt(count * Math.PI) * phi;

    const object = new THREE.Object3D();

    object.position.setFromSphericalCoords(
      800,
      phi,
      theta
    );

    vector.copy(object.position).multiplyScalar(2);

    object.lookAt(vector);

    targets.push(object);
  }

  return targets;
}