# Layouts

This folder holds the four arrangements the cards can fly between: **table**, **grid**, **helix** (double) and **sphere**. This document explains the logic behind each one, so you can read, tweak or replace them.

- [1. How layouts work](#1-how-layouts-work)
- [2. Shared facts](#2-shared-facts)
- [3. Table](#3-table)
- [4. Grid](#4-grid)
- [5. Double helix](#5-double-helix)
- [6. Sphere](#6-sphere)
- [7. Adding a layout](#7-adding-a-layout)
- [8. Gotchas](#8-gotchas)

---

## 1. How layouts work

A layout is a **pure function**: it takes the number of cards and returns a list of `THREE.Object3D`, one per card.

```ts
(count: number) => THREE.Object3D[]      // table takes the data array instead, same idea
```

These objects are **never added to the scene**. They are invisible "notepads". Each one records where card `i` should end up (`.position`) and which way it should face (`.rotation`). `PeriodicTableScene.transform()` then tweens the real card `i` toward `targets[layout][i]`.

```
objects[i]   (real card on screen)  --- tweened toward --->  targets.grid[i]   (notepad)
```

So every layout answers one question:

> Given card index `i`, where does it go, and which way does it face?

The loop always has the same shape:

```
for i in 0 .. count-1:
    1. turn i into a few numbers (column/row/layer, or angles, or a height)
    2. write them into an Object3D's position
    3. optionally call lookAt() to set its rotation
    4. push it to the list
```

`Object3D` is used (instead of a plain `{x, y, z}`) because it provides `setFromSphericalCoords`, `setFromCylindricalCoords` and `lookAt`, which do the trigonometry and rotation maths.

Card `i` is the `i`-th row of the data, so **which card goes where is decided purely by data order**.

---

## 2. Shared facts

**Coordinates (Three.js, right-handed):** +X is right, +Y is up, +Z points toward the viewer. The origin `(0, 0, 0)` is the centre of the scene.

**Card size:** 120 wide x 160 tall (from `.element` in `PeriodicTable.css`). Every spacing number in this folder is chosen relative to that, so if the card size changes, update the spacings too.

**Camera:** starts at `z = 3000`, vertical field of view 40 degrees, looking at the origin. The visible half-height at distance `d` is `d * tan(20 deg)`, about `0.364 * d`. That is why each layout is sized to fit roughly within the camera's initial view. Users can still zoom between 500 and 6000 (`minDistance` / `maxDistance` on the controls).

**Facing direction (`lookAt`):** `object.lookAt(point)` rotates an object so its front (+Z) points at `point`. The layouts that rotate cards all use the same trick: pick a point further out in the same direction as the card's position, so the card faces **away from the centre**.

**Centring:** every layout is centred on the origin. A span of `N` items with spacing `s` is centred with:

```
(index - (N - 1) / 2) * s
```

For example 5 columns (indices 0..4) gives offsets -2, -1, 0, 1, 2 times `s`.

**Counts:** the data currently has **200** cards. Table, grid and double helix are laid out for 200. Sphere and helix adapt to any count. Table and grid keep working past 200 but the table gains extra rows and the grid gains extra layers.

---

## 3. Table

File: `TableLayout.ts`. A flat 20 x 10 wall facing the camera. No rotation, so cards face straight forward.

```ts
col = index % COLS                    // 0..19
row = Math.floor(index / COLS)        // 0..9

x =  (col - (COLS - 1) / 2) * SPACING_X
y = -(row - (ROWS - 1) / 2) * SPACING_Y
```

### The key idea: `%` and floor-division

For a grid filled left to right, then top to bottom:

- `index % COLS` is **where you are within a row**. It wraps back to 0 every `COLS` cards.
- `Math.floor(index / COLS)` is **which row you are on**. It ticks up every `COLS` cards.

| index | col | row |
|---|---|---|
| 0 | 0 | 0 |
| 1 | 1 | 0 |
| 19 | 19 | 0 |
| 20 | 0 | 1 |
| 21 | 1 | 1 |
| 199 | 19 | 9 |

A common mistake is writing `index / 20` for the column. That is a decimal division (0, 0.05, 0.1 ...), so cards land a few pixels apart and pile up. Columns need `%`, rows need `floor(/)`.

### Numbers

| Constant | Value | Why |
|---|---|---|
| `COLS` | 20 | requested width |
| `ROWS` | 10 | requested height |
| `SPACING_X` | 140 | card width 120 + 20 gap |
| `SPACING_Y` | 180 | card height 160 + 20 gap |

Extents: x runs from -1330 to +1330, y from +810 to -810. `y` is negated because rows count **down** the page but +Y is **up**.

`ROWS` is only used for centring. If you have more than 200 cards, extra rows appear below row 9 and the table is no longer perfectly centred.

---

## 4. Grid

File: `GridLayout.ts`. A 3D block: **5 columns x 4 rows per layer, 10 layers deep** (5 x 4 x 10 = 200). No rotation, so cards stay flat and face the camera.

```ts
col   = i % COLS                          // 0..4
row   = Math.floor(i / COLS) % ROWS       // 0..3
layer = Math.floor(i / (COLS * ROWS))     // 0..9

x =  (col   - (COLS   - 1) / 2) * SPACING_X
y = -(row   - (ROWS   - 1) / 2) * SPACING_Y
z =  (layer - (LAYERS - 1) / 2) * SPACING_Z
```

### The key idea: an odometer

Think of `i` as the number on an odometer with three dials. The column dial spins fastest. Every time it wraps, the row dial ticks. Every time the row dial wraps, the layer dial ticks.

| Expression | Meaning | Range |
|---|---|---|
| `i % 5` | column | 0..4 |
| `floor(i / 5) % 4` | row within the layer | 0..3 |
| `floor(i / 20)` | layer | 0..9 |

The `% ROWS` on the row is what stops rows from growing forever. Without it, row would keep counting up (0, 1, 2, ..., 39) and the layer dial would never be used.

| i | col | row | layer | position (x, y, z) |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | (-720, 450, -1350) |
| 4 | 4 | 0 | 0 | (720, 450, -1350) |
| 5 | 0 | 1 | 0 | (-720, 150, -1350) |
| 19 | 4 | 3 | 0 | (720, -450, -1350) |
| 20 | 0 | 0 | 1 | (-720, 450, -1050) |
| 199 | 4 | 3 | 9 | (720, -450, 1350) |

It fills like reading a book: left to right, next row down, and once a 5 x 4 page is full, the next page goes **in front** of the previous one (z increases toward the camera).

### Numbers

| Constant | Value | Why |
|---|---|---|
| `COLS`, `ROWS`, `LAYERS` | 5, 4, 10 | requested shape. Swap `COLS` and `ROWS` if you meant 4 wide x 5 tall |
| `SPACING_X` | 360 | 120 card + 240 gap, wide gaps let you see layers behind |
| `SPACING_Y` | 300 | 160 card + 140 gap |
| `SPACING_Z` | 300 | distance between layers |

Extents: x +/-720, y +/-450, z from -1350 to +1350. The nearest layer is at `z = 1350`, so it is 1650 units from the camera (still in front of it) and the whole block fits in the default view at 16:9, 16:10 and 4:3.

### What changed from the original example

The example used 5 x 5 layers and `z = layer * 1000 - 2000`. With 200 cards that makes 8 layers and puts the last one at `z = 5000`, which is **behind** the camera at `z = 3000`, so roughly half the cards were invisible or cropped. The new version is centred on the origin and the layer spacing is much smaller.

---

## 5. Double helix

File: `HelixLayout.ts`. Two spiral strands wound around the same vertical axis, 180 degrees apart, like DNA. Cards face outward but stay upright.

```ts
perStrand = Math.ceil(count / STRANDS)                 // 100
dy        = (PITCH * ANGLE_STEP) / (2 * Math.PI)       // ~11.14 per card
yTop      = ((perStrand - 1) * dy) / 2                 // centres the helix on y = 0

strand = i % STRANDS                                   // 0 or 1
step   = Math.floor(i / STRANDS)                       // 0, 0, 1, 1, 2, 2, ...

theta = START_ANGLE + step * ANGLE_STEP + strand * (2 * Math.PI / STRANDS)
y     = yTop - step * dy

position.setFromCylindricalCoords(RADIUS, theta, y)
```

### Step by step

**1. Split the cards between strands.** Even indices go to strand 0, odd to strand 1. `step` is the card's position along its own strand, so cards 0 and 1 are both `step = 0`, cards 2 and 3 are both `step = 1`, and so on. Neighbouring cards in the data therefore sit directly opposite each other, like the rungs of a ladder.

**2. Angle.** Each step turns the strand by `ANGLE_STEP = 0.175` radians (about 10 degrees). The second strand adds `PI` (180 degrees), which is what makes it a double helix. `START_ANGLE` is just where strand 0 begins. Change it to rotate the whole helix.

**3. Height.** Each step drops by `dy`. It is derived from `PITCH`, the vertical distance one strand falls in one full lap, so you tune the shape with a number that has a physical meaning:

```
one lap = 2 * PI / ANGLE_STEP = 35.9 cards
dy = PITCH / 35.9 = 400 / 35.9 = 11.14
```

**4. Position.** `setFromCylindricalCoords(radius, theta, y)` turns the angle and height into `x = radius * sin(theta)`, `z = radius * cos(theta)`, `y = y`. Every card is exactly `RADIUS` from the axis, so all cards lie on one invisible cylinder.

**5. Facing.** Look at a point pushed outward in x and z but **not** in y:

```ts
vector.set(position.x * 2, position.y, position.z * 2)
object.lookAt(vector)
```

Scaling `y` too would tilt cards up or down. Leaving `y` alone keeps them vertical, facing straight out from the axis.

### Why `PITCH` is 400 (not the old 288)

In a single helix, consecutive laps are one lap-height apart. In a double helix, the **other strand** passes between them: at any given angle, the two strands cross at heights half a lap apart. So the usable vertical room between neighbouring cards is `PITCH / 2`.

```
card height 160
PITCH / 2 must be > 160, so PITCH must be > 320
400 / 2 = 200  ->  40 units of gap between a card and the other strand's card above or below
```

A simulation of the layout at `PITCH = 300` found 164 overlapping card pairs, and 0 at `PITCH = 360` or higher. 400 gives a comfortable margin.

### Numbers

| Constant | Value | Why |
|---|---|---|
| `RADIUS` | 900 | cylinder radius |
| `STRANDS` | 2 | 2 = double helix. 3 would make a triple helix (strands 120 degrees apart) |
| `ANGLE_STEP` | 0.175 | 900 * 0.175 = 157 units of arc between neighbours on a strand (card width is 120) |
| `PITCH` | 400 | see above |
| `START_ANGLE` | PI | rotation offset |

For 200 cards: 100 per strand, 35.9 cards per lap, about 2.8 laps, total height about 1100 (y from +551 to -551), centred on the origin.

### What changed from the single helix

- Old height was `450 - i * 8`, which with 200 cards ran from +450 to -1142. It was centred around y = -346, off-centre, because the `450` was tuned for 118 cards. The new version computes `yTop` from the count, so it stays centred for any number of cards.
- Old pitch came implicitly from `0.175` and `8`. It is now an explicit `PITCH`.

### Variations

- **Data order along a strand:** to make strand 0 hold the first half of the data and strand 1 the second half, use `strand = Math.floor(i / perStrand)` and `step = i % perStrand`.
- **Triple helix:** set `STRANDS = 3` (and check the pitch, since the vertical room per strand drops to `PITCH / 3`).
- **Real DNA groove:** use an offset slightly different from `PI` for the second strand (for example `PI * 0.85`) to mimic the major and minor grooves.

---

## 6. Sphere

File: `SphereLayout.ts`. Cards spread evenly over a ball and face outward. The idea: one long thread winds from the bottom pole to the top pole, and the cards are pearls spaced along it.

```ts
phi   = Math.acos(-1 + (2 * (i + 0.5)) / count)
theta = Math.sqrt(count * Math.PI) * phi

position.setFromSphericalCoords(RADIUS, phi, theta)

vector.copy(position).multiplyScalar(2)
object.lookAt(vector)
```

Spherical coordinates describe a point by `radius`, `phi` (angle down from the top pole, 0 to PI) and `theta` (angle around the vertical axis).

### Rule 1: `phi`, how high on the ball

Spacing `phi` evenly would crowd points near the poles, because the circles of latitude there are tiny. The fix uses a fact known since Archimedes: slicing a sphere into horizontal bands of equal **height** gives bands of equal **area**. So:

1. Space the height evenly from -1 to +1: `-1 + 2 * (i + 0.5) / count`
2. Convert height back into the angle with `acos`

| i (of 200) | height | phi | where |
|---|---|---|---|
| 0 | -0.995 | ~3.04 | just above the bottom pole |
| 99 | -0.005 | ~1.58 | equator |
| 199 | +0.995 | ~0.10 | just below the top pole |

### Rule 2: `theta`, how far around

If `theta` were constant, every card would sit on one vertical line. Making `theta` proportional to `phi` winds the points in a spiral. The factor `sqrt(count * PI)` (about 25 for 200 cards) sets how tightly it winds. It is a tuned heuristic that keeps the gap between turns similar to the gap between neighbours along a turn.

### Facing outward

`lookAt` a point at twice the position vector, so each card faces straight away from the centre. Unlike the helix, `y` is scaled too, so cards near the top and bottom tilt to follow the curve.

### Changes from the original

| Change | Why |
|---|---|
| `RADIUS` 800 to 900 | With 200 cards, neighbours at radius 800 average 199 apart, but a card is 160 tall and 120 wide (diagonal 200). At 900, neighbours average 224 apart, with the closest pair 199 apart. |
| `i` to `i + 0.5` | The original put card 0 exactly on the bottom pole but left the top pole empty. The half-step offset makes both poles symmetric and avoids a card at an exact pole, where `lookAt` has no clear "up". It also fixed a pair of cards that were only 113 apart near the bottom pole (closest pair is now 199 apart at radius 900). |

Why not 1000? At 1000 the sphere's silhouette spans 19.5 degrees from the centre, against the camera's 20 degree half field of view, so the edges would touch the screen border and be cropped on narrower windows. At 900 it is 17.5 degrees.

---

## 7. Adding a layout

1. Create `MyLayout.ts` exporting `createMyLayout(count): THREE.Object3D[]` that returns exactly `count` objects.
2. In `PeriodicTableScene.ts`, add the name to `LayoutName`, add it to the `targets` object (both the empty initial value and the one built in `init`).
3. In `Controls.tsx`, add one entry to `LAYOUTS`.

Example, a flat ring:

```ts
export function createRingLayout(count: number): THREE.Object3D[] {
  const targets: THREE.Object3D[] = [];
  const vector = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;       // spread evenly around 360 degrees
    const object = new THREE.Object3D();

    object.position.set(Math.cos(angle) * 1000, Math.sin(angle) * 1000, 0);

    vector.set(object.position.x * 2, object.position.y * 2, 0);
    object.lookAt(vector);                         // face outward

    targets.push(object);
  }
  return targets;
}
```

---

## 8. Gotchas

- **Layouts must return `count` objects.** `transform()` reads `targets[i]` for every card, so a shorter list throws on `target.position`.
- **Rotation is tweened per axis.** The tween interpolates `rotation.x/y/z` independently, not as a true rotation blend, so mid-flight orientation can look odd. The final orientation is always correct.
- **Cards with no `lookAt`** (table, grid) end at rotation (0, 0, 0). Switching from sphere or helix back to them tweens the rotation back to zero.
- **Sizing is tied to the card size.** If `.element` changes from 120 x 160, revisit the spacings: table (`SPACING_X/Y`), grid (`SPACING_X/Y/Z`), helix (`ANGLE_STEP`, `PITCH`), sphere (`RADIUS`).
- **Fitting the view is a design choice.** The extents above were checked against the default camera (z = 3000, fov 40). A different camera position or field of view changes what fits.
- **Numbers in this document** (overlap counts, neighbour distances, fit checks) come from a Python port of the layout maths run on 200 cards. Card rotation and the final CSS rendering were not simulated, so check the look in the browser.