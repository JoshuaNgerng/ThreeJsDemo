import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';

import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { elements } from '../data/elements';

import { createElement } from './ElementFactory';

import { createTableLayout } from './layouts/TableLayout';
import { createSphereLayout } from './layouts/SphereLayout';
import { createHelixLayout } from './layouts/HelixLayout';
import { createGridLayout } from './layouts/GridLayout';

export class PeriodicTableScene {

  scene: THREE.Scene;

  objects: CSS3DObject[] = [];

  targets = {
    table: [] as THREE.Object3D[],
    sphere: [] as THREE.Object3D[],
    helix: [] as THREE.Object3D[],
    grid: [] as THREE.Object3D[],
  };

  constructor() {

    this.scene = new THREE.Scene();

    this.initializeElements();

    this.initializeLayouts();

  }

  initializeElements() {

    this.objects = elements.map((element, index) => {

      const object = createElement(element, index);

      this.scene.add(object);

      return object;

    });

  }

  initializeLayouts() {

    const count = this.objects.length;

    this.targets.table = createTableLayout(elements);

    this.targets.sphere = createSphereLayout(count);

    this.targets.helix = createHelixLayout(count);

    this.targets.grid = createGridLayout(count);

  }

  transform(
    layout: keyof PeriodicTableScene['targets'],
    duration = 2000
  ) {

    TWEEN.removeAll();

    const targets = this.targets[layout];

    this.objects.forEach((object, index) => {

      const target = targets[index];

      new TWEEN.Tween(object.position)
        .to({
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        }, Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

      new TWEEN.Tween(object.rotation)
        .to({
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        }, Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

    });

  }
}