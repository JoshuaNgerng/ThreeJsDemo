import * as THREE from 'three';
import type { ElementData } from '../../types/elements';

export function createTableLayout(
  elements: ElementData[]
): THREE.Object3D[] {

  return elements.map((_, index) => {

    const object = new THREE.Object3D();

    object.position.x = (index / 20) * 140 - 1330;

    object.position.y = -((index % 10) * 180) + 990;

    return object;
  });
}