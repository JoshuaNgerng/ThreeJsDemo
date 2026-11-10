import * as THREE from 'three';

export function createHelixLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];

  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {

    const theta = i * 0.175 + Math.PI;

    const y = -(i * 8) + 450;

    const object = new THREE.Object3D();

    object.position.setFromCylindricalCoords(
      900,
      theta,
      y
    );

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