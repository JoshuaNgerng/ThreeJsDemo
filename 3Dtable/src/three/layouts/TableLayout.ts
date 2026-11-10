import * as THREE from 'three';
import type { ElementData } from '../../data/elements'; 

export function createTableLayout(
  elements: ElementData[]
): THREE.Object3D[] {

  return elements.map((element) => {

    const object = new THREE.Object3D();

    object.position.x = element.column * 140 - 1330;

    object.position.y = -(element.row * 180) + 990;

    return object;
  });
}