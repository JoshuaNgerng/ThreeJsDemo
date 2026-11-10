import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { elements } from '../data/elements';
import { createElement } from './ElementFactory';
import { createTableLayout } from './layouts/TableLayout';
import { createSphereLayout } from './layouts/SphereLayout';
import { createHelixLayout } from './layouts/HelixLayout';
import { createGridLayout } from './layouts/GridLayout';

export type LayoutName = 'table' | 'sphere' | 'helix' | 'grid';

export class PeriodicTableScene {
  private container: HTMLElement;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer = new CSS3DRenderer();
  private controls: TrackballControls;

  private objects: CSS3DObject[] = [];
  private targets: Record<LayoutName, THREE.Object3D[]>;
  private frameId = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    const { clientWidth: w, clientHeight: h } = container;

    this.camera = new THREE.PerspectiveCamera(40, w / h, 1, 10000);
    this.camera.position.z = 3000;

    this.objects = elements.map((el, i) => {
      const obj = createElement(el, i);
      this.scene.add(obj);
      return obj;
    });

    const count = this.objects.length;
    this.targets = {
      table: createTableLayout(elements),
      sphere: createSphereLayout(count),
      helix: createHelixLayout(count),
      grid: createGridLayout(count),
    };

    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 500;
    this.controls.maxDistance = 6000;
    this.controls.addEventListener('change', this.render);

    window.addEventListener('resize', this.onResize);

    this.animate();
    this.transform('table');
  }

  transform(layout: LayoutName, duration = 2000) {
    TWEEN.removeAll();

    const targets = this.targets[layout];

    this.objects.forEach((object, i) => {
      const target = targets[i];

      new TWEEN.Tween(object.position)
        .to(
          { x: target.position.x, y: target.position.y, z: target.position.z },
          Math.random() * duration + duration,
        )
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

      new TWEEN.Tween(object.rotation)
        .to(
          { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
          Math.random() * duration + duration,
        )
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
    });

    // keeps re-rendering while the tweens run
    new TWEEN.Tween({}).to({}, duration * 2).onUpdate(this.render).start();
  }
  
  dispose() {
    cancelAnimationFrame(this.frameId);
    TWEEN.removeAll();
    window.removeEventListener('resize', this.onResize);
    this.controls.removeEventListener('change', this.render);
    this.controls.dispose();
    this.renderer.domElement.remove();
  }

  // arrow functions so `this` is bound when passed as callbacks
  private render = () => {
    this.renderer.render(this.scene, this.camera);
  };

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    TWEEN.update();
    this.controls.update();
  };

  private onResize = () => {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.render();
  };
}