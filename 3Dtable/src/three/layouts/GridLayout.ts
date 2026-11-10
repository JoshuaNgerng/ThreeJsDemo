import * as THREE from 'three';

export function createGridLayout(
  count: number
): THREE.Object3D[] {

  const targets: THREE.Object3D[] = [];

  for (let i = 0; i < count; i++) {

    const object = new THREE.Object3D();

    object.position.x = ((i % 5) * 400) - 800;

    object.position.y =
      (-(Math.floor(i / 5) % 5) * 400) + 800;

    object.position.z =
      Math.floor(i / 25) * 1000 - 2000;

    targets.push(object);
  }

  return targets;
}