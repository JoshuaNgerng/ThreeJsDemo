# 3D Periodic Table: React + Three.js Reference Notes

Notes on turning the three.js "periodic table" CSS3D example into a React + TypeScript (Vite) app.

---

## 1. Big picture

**Core idea: React owns the page, Three.js owns the 3D world.**

- React is declarative: UI = function of state.
- Three.js is imperative: create objects, mutate them every frame, call render.
- Putting 118 cards in React state and re-rendering 60 times per second would be slow and pointless.
- So the 3D scene is a **black box**: React mounts it, tells it what to do, and tears it down.

Only one thing is real React state: **which layout button is active**.

---

## 2. Project structure

```
src/
├── App.tsx                      renders <PeriodicTable />
├── main.tsx                     StrictMode + createRoot
├── index.css                    global styles only
├── components/
│   ├── PeriodicTable.tsx        owns active-layout state, wires hook + Controls
│   ├── PeriodicTable.css        viewport, controls, .element card styles
│   └── Controls.tsx             the layout buttons
├── hooks/
│   └── usePeriodicScene.ts      bridge: React lifecycle <-> scene class
├── data/
│   └── elements.ts              ElementData[] (symbol, name, weight, column, row)
└── three/
    ├── PeriodicTableScene.ts    scene, camera, renderer, controls, tweens
    ├── ElementFactory.ts        builds one CSS3DObject (a card) per element
    └── layouts/
        ├── TableLayout.ts
        ├── SphereLayout.ts
        ├── HelixLayout.ts
        └── GridLayout.ts
```

### How the original example script was split

| Original code | What it really is | Where it went |
|---|---|---|
| `const table = [...]` | static data | `data/elements.ts` |
| loop building divs + `CSS3DObject`s | object creation | `three/ElementFactory.ts` |
| 4 layout loops | pure functions (count in, positions out) | `three/layouts/*.ts` |
| camera, scene, renderer, controls, `animate`, `render`, `transform`, resize | long-lived stateful 3D machinery | `PeriodicTableScene` class |
| `getElementById(...).addEventListener('click')` | UI buttons | `Controls.tsx` |
| `getElementById('container').appendChild` | where does the canvas go? | a `ref` on a `<div>` |
| `init(); animate();` | start-up | `useEffect` in the hook |

Every chunk ends up as one of: **data, pure function, object with a lifecycle, or UI.**

---

## 3. The React side

### The three components

```tsx
// App.tsx
export default function App() {
  return <PeriodicTable />;
}
```

```tsx
// components/PeriodicTable.tsx
export function PeriodicTable() {
  const { containerRef, setLayout } = usePeriodicScene();
  const [layout, setLayoutState] = useState<LayoutName>('table');

  const handleChange = (next: LayoutName) => {
    setLayoutState(next);   // React state -> button highlight
    setLayout(next);        // imperative call -> 3D animation
  };

  return (
    <div className="periodic-table">
      <div ref={containerRef} className="viewport" />
      <Controls active={layout} onChange={handleChange} />
    </div>
  );
}
```

`Controls.tsx` maps an array of `{ id, label }` to `<button>`s, adds the `active` class to the selected one, and calls `onChange(id)` on click.

### The hook (the bridge)

```ts
export function usePeriodicScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PeriodicTableScene | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new PeriodicTableScene(el);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const setLayout = useCallback((layout: LayoutName) => {
    sceneRef.current?.transform(layout);
  }, []);

  return { containerRef, setLayout };
}
```

### React concepts used

- **`useRef` has two jobs here.**
  - `containerRef` points at a real DOM node (available *after* render).
  - `sceneRef` holds a long-lived plain object across renders. Changing a ref never triggers a re-render.
- **`useEffect(fn, [])`** runs once, *after* the first render and after the DOM exists. That is why `containerRef.current` is valid inside it, and why the `if (!el) return` guard exists.
- **Cleanup function** (returned from the effect) runs on unmount. It is where `dispose()` goes.
- **StrictMode** (dev only) mounts, unmounts and remounts effects once to expose missing cleanup. Without `dispose()` you would see two canvases and two animation loops.
- **`useCallback`** keeps `setLayout` stable across renders. Good habit for functions returned from hooks.
- **Arrow-function class fields** (`private render = () => {...}`) bind `this` automatically so they can be passed as callbacks (`requestAnimationFrame(this.animate)`).
- **`erasableSyntaxOnly`** in tsconfig forbids constructor parameter properties (`constructor(private x: T)`), so declare fields explicitly.

### Full sequence

```
1. App renders <PeriodicTable />
2. PeriodicTable runs, calls usePeriodicScene(), returns JSX with <div ref> + <Controls>
3. React puts the div into the real DOM
4. useEffect runs -> new PeriodicTableScene(div)
     -> renderer's element appended to div
     -> animate loop starts
     -> transform('table') schedules the first tweens
5. Every frame: TWEEN.update() moves cards, render() redraws
6. User clicks SPHERE -> handleChange('sphere')
     -> setLayoutState('sphere')   (React re-renders, button highlights)
     -> setLayout('sphere') -> sceneRef.current.transform('sphere') (new tweens)
7. The same loop from step 5 plays the new animation
8. Unmount -> cleanup -> scene.dispose() (loop stops, listeners removed)
```

Note: the effect does **not** run "first". Render happens first, then the DOM is updated, *then* the effect runs.

---

## 4. The scene class

```ts
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
        .to({ x: target.position.x, y: target.position.y, z: target.position.z },
            Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

      new TWEEN.Tween(object.rotation)
        .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
            Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
    });

    // render driver: redraws every frame while tweens run
    new TWEEN.Tween({}).to({}, duration * 2).onUpdate(this.render).start();
  }

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

  dispose() {
    cancelAnimationFrame(this.frameId);
    TWEEN.removeAll();
    window.removeEventListener('resize', this.onResize);
    this.controls.removeEventListener('change', this.render);
    this.controls.dispose();
    this.renderer.domElement.remove();
  }
}
```

### What the constructor does, in order

1. Create camera, scene, renderer
2. Build the 118 card objects and add them to the scene
3. Build the 4 layout target lists
4. Append the renderer's DOM element into the container
5. Create `TrackballControls`
6. Add the resize listener
7. **Start the animation loop**
8. Call `transform('table')`, which plays the intro animation

`transform()` only **schedules** movement. Nothing moves until the loop calls `TWEEN.update()`.

---

## 5. Three.js fundamentals

1. **Scene graph.** A `Scene` is a tree of `Object3D`s. Each has `position`, `rotation`, `scale`.
2. **Coordinates.** Right-handed: **+X right, +Y up, +Z toward the viewer.** Origin (0,0,0) is the centre.
3. **Camera.** A `PerspectiveCamera` is a viewpoint. Yours starts at `z = 3000` looking at the origin. Farther objects look smaller.
4. **Renderer.** `WebGLRenderer` draws triangles on a `<canvas>`. **`CSS3DRenderer`** instead writes `transform: matrix3d(...)` onto each card's `<div>` (with `perspective` on the parent), so the browser does the 3D drawing. That is why the cards are real HTML with real CSS.
5. **Animation.** Nothing animates itself. You change `position` / `rotation` over time and call `render()`. TWEEN does the changing.

Core Three.js provides the camera and renderer. **Mouse-to-camera syncing comes from the `TrackballControls` add-on**, not the core library.

---

## 6. TWEEN

TWEEN (tween.js) **changes a number from A to B over time along an easing curve.** It knows nothing about 3D.

```ts
const pos = { x: 0, y: 0 };

new TWEEN.Tween(pos)                       // object whose properties change
  .to({ x: 100, y: 50 }, 2000)             // targets + duration (ms)
  .easing(TWEEN.Easing.Exponential.InOut)  // curve
  .onUpdate(() => console.log(pos))        // optional callback per step
  .start();                                // begin
```

You **must** call `TWEEN.update()` every frame. TWEEN has no timer of its own, so your animation loop is its heartbeat.

### What `TWEEN.update()` does per running tween

```
elapsed  = now - startTime
progress = elapsed / duration            // 0 -> 1
eased    = easing(progress)              // curve reshapes 0 -> 1
for each property:
    obj[prop] = start[prop] + (end[prop] - start[prop]) * eased
call onUpdate
if progress >= 1: finish and remove
```

- At `.start()` it snapshots the object's **current** values as "from". You never specify a start, so interrupting mid-flight works: new tweens begin from wherever the cards currently are.
- **Easing:** Linear is constant speed. `Quadratic.InOut` is slow-fast-slow. `Exponential.InOut` is the same shape but more extreme (crawl, rush, crawl).

### How it fits in `transform()`

- For each of the 118 cards, **2 new tweens** are created: one on `object.position`, one on `object.rotation`. That is **236 tweens per `transform` call**. Tweens are never reused.
- **"To" values** come from the layout target at the same index (`targets[i].position` / `.rotation`).
- **"From" values** come from the card's current position/rotation at `.start()`.
- **Stagger:** duration is `Math.random() * 2000 + 2000`, so each tween lasts 2000 to 4000 ms. All start together and finish at different times, giving the scattered look.
- **`TWEEN.removeAll()`** at the top cancels every running tween (including the old render driver) so two layout changes never fight over the same objects.

### The `{}` "render driver" tween

```ts
new TWEEN.Tween({}).to({}, duration * 2).onUpdate(this.render).start();
```

- It animates **nothing**. It runs for 4000 ms (the longest any card tween can last) and calls `render()` on each `TWEEN.update()`.
- It does **not** interact with the card tweens. They only share TWEEN's global list of running tweens, and each is updated independently. Since it is started last, it runs after the card tweens within a frame, so `render()` sees fresh values (a side effect of creation order, not enforced).
- It is needed because TWEEN changes numbers but does not redraw the screen, and `TrackballControls` only triggers `render` when the camera moves.
- Alternative: call `this.render()` in `animate()` every frame (simpler, common). This example renders only while something changes.

---

## 7. TrackballControls

An add-on that translates mouse/touch input into **camera** movement. It never touches the cards.

```ts
this.controls = new TrackballControls(this.camera, this.renderer.domElement);
```

Arguments: the camera to move, and the DOM element to listen on (mouse events on any card bubble up to it).

| Input | Effect |
|---|---|
| Left-drag | rotate around the centre |
| Wheel / middle-drag | zoom |
| Right-drag | pan |
| One finger / two fingers | rotate / zoom + pan |

### Events record, `update()` applies

```
mouse event -> "pointer moved from A to B"   (just recorded)
every frame: controls.update()
    - convert recorded movement into rotation / zoom / pan
    - apply to camera
    - clamp distance to minDistance..maxDistance
    - camera.lookAt(target)
    - if camera moved -> dispatch 'change' event -> this.render()
```

- `controls.update()` **must** be called every frame, or the mouse does nothing.
- `'change'` fires only when the camera actually moved, so no mouse means no controls-driven rendering.
- **Inertia:** `staticMoving` defaults to `false`, so the camera keeps gliding after release. `dynamicDampingFactor` (default 0.2) controls the decay.
- `minDistance = 500` / `maxDistance = 6000` clamp zoom (the camera starts at 3000).
- **Trackball vs Orbit:** Trackball has no fixed "up" (free rotation in any direction, can roll). Orbit keeps up fixed.
- `dispose()` removes the listeners it added. Needed because StrictMode remounts.

### How the systems interact

```
                 +--------------+
 mouse/touch --> | Trackball    | --> moves CAMERA --+
                 | Controls     |                    |
                 +--------------+                    v
                                              +-----------+
 layout buttons -> transform() -> TWEEN --->  | renderer  | --> CSS transforms on cards
                      moves CARDS             | .render() |
                                              +-----------+
```

- Controls move the **camera**, tweens move the **cards**, and they do not know about each other. You can rotate the view while cards fly.
- Both can trigger `render()`, so it may be called twice in a frame (harmless).
- The camera is the shared state. Tweens never touch it.

### One click, end to end

```
click "HELIX"
 +- transform('helix')
     +- TWEEN.removeAll()
     +- 236 tweens + 1 driver created and started
every frame (requestAnimationFrame -> animate()):
 +- TWEEN.update()
 |    +- each tween writes new values into card.position / card.rotation
 |    +- driver's onUpdate -> this.render() -> CSS3DRenderer rewrites card transforms
 +- controls.update()
~4 s later: every tween reaches progress 1 and removes itself
```

---

## 8. Layouts

### The key trick: target objects as "notepads"

Layout functions return `THREE.Object3D[]` that are **never added to the scene**. Each stores "card `i` should be here, rotated like this" in `.position` / `.rotation`. `transform()` tweens each real card toward its notepad.

```
objects[i]  (real card)  --- tweens toward --->  targets.sphere[i]  (invisible notepad)
```

Why `Object3D` instead of `{x, y, z}`? It gives `setFromSphericalCoords`, `setFromCylindricalCoords` and `lookAt`, which do the trig and rotation maths.

**Every layout answers one question:** "given card index `i`, where does it go (and which way does it face)?"

```
for each i:
    1. compute numbers from i (angles, rows, heights ...)
    2. put them in an Object3D's position
    3. optionally lookAt() to set rotation
    4. push to the list
```

### Table: lookup from data

```ts
x = column * 140 - 1330
y = -(row * 180) + 990
```

- Each element carries its own `column` (1 to 18) and `row` (1 to 10).
- Cards are 120 x 160, spacing is 140 x 180, so there are 20 px gaps.
- `- 1330` / `+ 990` centre the table on the origin.
- Row is negated because rows count down but +Y is up.
- Lanthanides/actinides sit in rows 9 and 10. Row 8 is empty, which creates the visual gap.
- No rotation, so cards face the camera.

### Grid: an odometer

`i` is a number on a 3-dial odometer (each dial 0 to 4):

| Expression | Meaning | Range |
|---|---|---|
| `i % 5` | column (fastest dial) | 0 to 4 |
| `floor(i / 5) % 5` | row within the layer | 0 to 4 |
| `floor(i / 25)` | layer | 0 to 4 |

```ts
x = (i % 5) * 400 - 800
y = -(Math.floor(i / 5) % 5) * 400 + 800
z = Math.floor(i / 25) * 1000 - 2000
```

| i | col | row | layer | position |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | (-800, 800, -2000) |
| 1 | 1 | 0 | 0 | (-400, 800, -2000) |
| 5 | 0 | 1 | 0 | (-800, 400, -2000) |
| 25 | 0 | 0 | 1 | (-800, 800, -1000) |

Fills like reading a book: left to right, next row down, and when a 5 x 5 page is full, the next page goes behind. No rotation.

### Helix: a spiral staircase

```ts
theta = i * 0.175 + Math.PI
y     = -(i * 8) + 450
position.setFromCylindricalCoords(900, theta, y)
```

- Radius fixed at 900, so all cards sit on one invisible cylinder.
- Angle advances 0.175 rad (about 10 degrees) per card: about **36 cards per lap**, with roughly 157 units of arc between neighbours (wider than a 120 px card).
- Height drops 8 per card: about 288 per lap (taller than a 160 px card, so laps do not overlap).
- 118 cards = about 3.3 laps, from y = 450 down to about -486.
- `+ Math.PI` is just a starting-angle offset.
- `setFromCylindricalCoords(radius, angle, height)` does `x = r * sin(angle)`, `z = r * cos(angle)`.

### Sphere: a coil wrapped around a ball

```ts
phi   = Math.acos(-1 + (2 * i) / count)
theta = Math.sqrt(count * Math.PI) * phi
position.setFromSphericalCoords(800, phi, theta)
```

Spherical coordinates: radius (800), `phi` (angle down from the top pole, 0 to pi), `theta` (angle around the vertical axis).

**`phi` (how high):** spacing `phi` evenly would bunch points at the poles. Instead space the **height** evenly from -1 to +1 (equal-height bands on a sphere have equal area, per Archimedes), then `acos` converts height into the angle:

| i | height | phi | where |
|---|---|---|---|
| 0 | -1 | pi | bottom pole |
| 59 | 0 | pi/2 | equator |
| 117 | about 0.98 | about 0.18 | near top pole |

**`theta` (how far around):** `sqrt(count * pi)` is about 19.3 for 118 cards. Multiplying by `phi` makes each card sit a bit further around than the last, which winds the points in a spiral (about 9 to 10 turns). If `theta` were constant, all cards would line up in one vertical stripe. The constant is a tuned heuristic that keeps turn spacing similar to neighbour spacing along a turn.

### Facing outward with `lookAt`

`lookAt(point)` rotates an object so its front (+Z) points at that point. Use a point farther out in the same direction as the card's position:

```ts
// sphere: faces outward in 3D (tilts at top/bottom)
vector.copy(object.position).multiplyScalar(2);

// helix: faces outward but stays upright (y not doubled)
vector.set(object.position.x * 2, object.position.y, object.position.z * 2);

object.lookAt(vector);
```

The resulting `.rotation` is what the tween copies onto the real card.

### Quick map of constants to effects

| Change | Effect |
|---|---|
| Sphere radius 800 to 400 | cards overlap |
| Helix `0.175` to `0.35` | tighter coil |
| Helix `0.175` to `0.05` | stretched, overlapping |
| Helix `+ Math.PI` offset | rotates the whole helix |
| Remove sphere `lookAt` | cards all face the camera direction instead of outward |

### Adding a new layout (example: ring)

```ts
export function createRingLayout(count: number): THREE.Object3D[] {
  const targets: THREE.Object3D[] = [];
  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const object = new THREE.Object3D();

    object.position.set(Math.cos(angle) * 1000, Math.sin(angle) * 1000, 0);

    vector.set(object.position.x * 2, object.position.y * 2, 0);
    object.lookAt(vector);

    targets.push(object);
  }
  return targets;
}
```

Steps: add `'ring'` to `LayoutName`, add `ring: createRingLayout(count)` to `targets`, add one entry to `LAYOUTS` in `Controls.tsx`.

---

## 9. CSS notes

- **Container must have a real size.** The scene class sizes the renderer from `container.clientWidth/clientHeight`. If the container height resolves to 0, the camera aspect becomes NaN/Infinity and the screen is blank. Fix: `.periodic-table { position: fixed; inset: 0; }`.
- **Remove the Vite template styles** (`App.css`, the old `#root { width: 1126px; ... }` rules in `index.css`).
- **`.element` needs `line-height: normal`** because `body` sets `line-height: 24px`, which breaks the card layout.
- **Avoid duplicate rules.** `button` styles live in `index.css`, `.element` and `.controls` in `PeriodicTable.css`.
- **Drop dead rules** from the example's shared stylesheet: `#info`, `#overlay`, `#notSupported`, `.lil-gui`, `a`.
- `.element` is intentionally global (not a CSS module) because `ElementFactory` sets the class name with plain `document.createElement`.

`index.css`:

```css
html, body, #root { margin: 0; height: 100%; }
body {
  background-color: #000; color: #fff;
  font-family: monospace; font-size: 13px; line-height: 24px;
  overflow: hidden; overscroll-behavior: none;
}
button {
  color: rgba(127,255,255,0.75); background: transparent;
  outline: 1px solid rgba(127,255,255,0.75); border: 0;
  padding: 5px 10px; cursor: pointer; text-transform: uppercase;
}
button:hover  { background-color: rgba(0,255,255,0.5); }
button:active { color: #000; background-color: rgba(0,255,255,0.75); }
```

`PeriodicTable.css` holds `.periodic-table`, `.viewport`, `.controls` (and `.controls button.active`), and the `.element`, `.number`, `.symbol`, `.details` card styles.

---

## 10. Gotchas

- **TWEEN import.** `three/addons/libs/tween.module.js` should work. If TS or Vite cannot resolve it: `npm i @tweenjs/tween.js` and `import * as TWEEN from '@tweenjs/tween.js'` (same API).
- **Weights.** `shape_data.py` converts `'(98)'` to `98.0` and `'22.98976...'` to `22.98976`, so radioactive-element brackets are lost. Fix by storing `weight` as a string or adding a flag.
- **Unused file.** `LayoutGenerator.ts` is not used. Delete it, or use it to type a layout registry (note: table layout takes `elements`, not `count`).
- **Unused imports** (e.g. the stub imports in the old `PeriodicTable.tsx`) fail `noUnusedLocals`.
- **Euler tweening.** TWEEN interpolates each rotation angle independently, not as a true rotation blend, so mid-flight rotation can look odd. It always lands correctly.
- **Double render.** `render()` can run twice in one frame (tween driver plus controls change). Harmless.

---

## 11. Experiments to build intuition

1. Change `Exponential.InOut` to `Linear.None`, then `Bounce.Out` / `Elastic.Out`.
2. Remove the `{}` render-driver tween: cards freeze visually until you touch the mouse.
3. Remove `TWEEN.removeAll()`, click two layouts quickly, and watch the glitch.
4. Set `controls.staticMoving = true` (no inertia). Try `dynamicDampingFactor` 0.05 vs 1.
5. Remove `controls.update()` from `animate()`: the mouse stops working.
6. Remove the `change` listener: the camera moves internally but the screen does not redraw.
7. Change layout constants (see table in section 8).
8. Add the ring layout.

---

## 12. Interview talking points

> "I treated Three.js as an imperative engine and React as the shell. The scene lives in a plain TypeScript class with a clear lifecycle: construct, transform, dispose. A custom hook bridges it into React using a ref for the mount point and an effect for setup and cleanup. Only UI state, the active layout, lives in React. Layouts are pure functions that return target transforms, so adding one means adding a file and an entry."

Points worth mentioning:

- Why 3D state is **not** React state (60 fps mutation vs re-render cost)
- Cleanup and StrictMode (dispose, remove listeners, cancel the animation frame)
- Layouts as pure functions returning "target" `Object3D`s, which the tweens move toward
- Render-on-demand (controls `change` plus the tween driver) vs rendering every frame
- Separation of concerns: data, factory, layouts, scene, hook, components

---

## 13. Extension ideas

1. **`ElementDetail` panel.** Add a click listener in `ElementFactory`, pass an `onSelect` callback through the scene class (imperative world to React), store `selected` in `PeriodicTable` state, and render a side panel. This reverses the data flow, so it is a good test of the mental model.
2. **Search / filter.** A text input that calls `scene.setHighlight(predicate)`, toggling a CSS class on each card's element.
3. **Category colours.** Add `category` to `ElementData` and colour by it instead of random alpha.
4. **Layout registry.** A `layouts` map keyed by `LayoutName`, with `Controls` generated from its keys.
5. **Render on every frame vs on demand.** Try both and compare.

---

## 14. One-paragraph summary

`PeriodicTable` renders a div and some buttons. On mount, `usePeriodicScene` creates a `PeriodicTableScene` inside that div. The scene builds 118 HTML cards as `CSS3DObject`s, precomputes four lists of target transforms (table, sphere, helix, grid), starts a `requestAnimationFrame` loop that calls `TWEEN.update()` and `controls.update()`, and renders with `CSS3DRenderer`. Clicking a button calls `transform(layout)`, which creates a position tween and a rotation tween per card (staggered 2 to 4 s) toward that layout's targets, plus a no-op tween that keeps `render()` firing until they finish. `TrackballControls` independently moves the camera in response to the mouse. On unmount, `dispose()` stops the loop and removes everything.
