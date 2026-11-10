import * as THREE from 'three';

export type LayoutGenerator<T = unknown> = (
  data: T
) => THREE.Object3D[];