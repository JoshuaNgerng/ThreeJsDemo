# 3D Table

A React + Three.js app that loads people from a Google Sheet and shows them as 200 floating 3D cards. After signing in with Google, you can switch the cards between four animated layouts (table, sphere, double helix, grid) and fly around them with the mouse. Each card's colour reflects the person's net worth.

## Features

- **Google sign-in** gate (Sign in with Google) before any data is loaded
- **Live data from a Google Sheet**, validated on load, with a readable error screen that lists problem rows
- **Four layouts** with staggered, eased transitions: table (20 x 10), grid (5 x 4 x 10), double helix, sphere
- **Free camera** (rotate, zoom, pan) using Three.js `TrackballControls`
- **Cards are plain HTML/CSS** rendered in 3D with `CSS3DRenderer`, so styling is normal CSS
- **Colour scale** by net worth with a legend

## Tech stack

| Area | Library |
|---|---|
| UI | React 19, TypeScript, Vite |
| 3D | Three.js (`CSS3DRenderer`, `TrackballControls`), tween.js (bundled in three's addons) |
| Data fetching | TanStack Query |
| Auth | `@react-oauth/google` (Google Identity Services) |
| Tests | Vitest, React Testing Library, jsdom |

## Quick start

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local     # then fill in the three values (see below)
npm run dev                    # http://localhost:5173
```

Restart `npm run dev` whenever you change `.env.local`. Vite only reads env files at startup.

### Environment variables

| Variable | What it is |
|---|---|
| `VITE_SPREADSHEET_ID` | The ID in the sheet URL: `docs.google.com/spreadsheets/d/<ID>/edit` |
| `VITE_GOOGLE_API_KEY` | Google Cloud API key used to read the (public) sheet |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 **Web** client ID, ending in `.apps.googleusercontent.com` |

`.env`, `.env.local` and other `*.local` files are git-ignored. Never commit real values.

## Google Cloud setup

You need one Google Cloud project with two credentials.

### 1. OAuth client (for sign-in)

1. Open **Google Auth Platform** in the Cloud console.
2. **Branding:** set an app name, support email and developer contact.
3. **Audience:** choose *External* (or *Internal* for a single Workspace org) and keep it in **Testing**. Add the Google accounts that will sign in as **test users**.
4. **Clients -> Create client -> Web application.** Under **Authorized JavaScript origins** add `http://localhost:5173` (and your deployed origin later). The origin must match exactly. `127.0.0.1` is a different origin.
5. Copy the **Client ID** into `VITE_GOOGLE_CLIENT_ID`. No client secret is needed or used.

The app only requests identity. It asks for **no Sheets or Drive permissions**, so the consent screen does not show a spreadsheet access prompt.

### 2. API key (for the sheet)

1. Enable the **Google Sheets API** (APIs & Services -> Library).
2. Create an API key (APIs & Services -> Credentials).
3. Restrict it: **API restriction** = Google Sheets API only, **Website restriction** = `http://localhost:5173/*` plus your deployed URL. The key ships in the browser bundle, so restrictions are the protection.
4. Put it in `VITE_GOOGLE_API_KEY`.

### 3. The sheet

Share the spreadsheet as **Anyone with the link can view**. The app reads it with the API key, not with the signed-in user's permissions.

## Sheet format

The app reads the tab named **`DataTemplate`**, range `A1:Z1000`. Row 1 is the header.

| Header | Rule |
|---|---|
| `name` | required text |
| `photo` | valid URL |
| `age` | whole number, 0 to 150 |
| `country` | required text |
| `interest` | required text |
| `net_worth` | number. `$`, commas and spaces are allowed (`$1,200,500`) |

- Headers are case-insensitive and spaces become underscores (`Net Worth` = `net_worth`).
- Missing, unexpected or duplicate headers fail the whole load with a clear message.
- Blank rows are skipped.
- Every invalid row is reported at once, with its sheet row number, field and reason. The error screen shows the first 10.
- The layouts are tuned for **200 rows** (see below). Other counts still work, but spacing and camera fit may need adjusting.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | start the dev server |
| `npm run build` | type-check and build to `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run lint` | run ESLint |
| `npm test` | run unit tests in watch mode |
| `npm run test:run` | run unit tests once (for CI) |

## How it works

### Component tree

```
main.tsx
└── StrictMode
    └── GoogleOAuthProvider          Google client ID
        └── QueryClientProvider      data cache
            └── AuthProvider         signed-in state
                └── AuthGate         sign-in screen, or children
                    └── DataGate     loading / error / children
                        └── App
                            └── PeriodicTable   buttons + legend + 3D mount point
```

The gates are nested on purpose: the sheet is only fetched after sign-in, and the 3D scene is only created after the data has loaded and validated.

### React and Three.js boundary

React owns the page. Three.js owns the 3D world.

- `PeriodicTableScene` (plain TypeScript class) holds the scene, camera, renderer, controls and tweens.
- `usePeriodicScene` (hook) creates the scene in an effect, returns a ref for the mount `<div>` and a `setLayout` function, and calls `dispose()` on cleanup (this matters under StrictMode).
- The only React state in the 3D area is which layout button is active. Positions and rotations change every frame and never touch React state.

```
click "SPHERE"
  -> PeriodicTable.handleChange
       -> setLayoutState('sphere')           React re-renders, button highlights
       -> setLayout('sphere')                hook -> scene.transform('sphere')
            -> a tween per card position and rotation toward the sphere targets
requestAnimationFrame loop: TWEEN.update() + controls.update(), render() on change
```

### Layouts

Each layout is a pure function that returns one invisible "target" `Object3D` per card. `transform()` tweens every real card toward its target. Full explanations, formulas and worked examples are in **[`src/three/layouts/README.md`](src/three/layouts/README.md)**.

| Layout | Shape |
|---|---|
| Table | 20 x 10 flat wall |
| Grid | 5 columns x 4 rows x 10 layers |
| Helix | double helix, two strands 180 degrees apart, cards alternate between strands |
| Sphere | spiral-distributed points on a ball, cards face outward |

### Colour scale

| Net worth | Colour |
|---|---|
| up to $100,000 | red `#EF3022` blending to orange `#FDCA35` |
| $100,000 to $200,000 | orange blending to green `#3A9F4B` |
| over $200,000 | green |

### Project structure

```
src/
├── main.tsx                      providers and gates
├── App.tsx
├── auth/
│   ├── AuthContext.tsx           context + useAuth
│   └── AuthProvider.tsx          signed-in state
├── components/
│   ├── AuthGate.tsx              Google sign-in screen
│   ├── DataGate.tsx              loading / error / success
│   ├── PeriodicTable.tsx         layout buttons, legend, mount point
│   ├── Controls.tsx              layout buttons
│   └── PeriodicTable.css         card, control and legend styles
├── hooks/
│   ├── usePeriodicScene.ts       React <-> Three.js bridge
│   └── useSheetData.ts           TanStack Query hooks
├── services/
│   ├── sheet.ts                  fetch + validate the Google Sheet
│   └── colour.ts                 palette + colour interpolation
├── three/
│   ├── PeriodicTableScene.ts     scene, camera, renderer, controls, tweens
│   ├── ElementFactory.ts         builds one card (HTML in a CSS3DObject)
│   └── layouts/                  Table, Grid, Helix, Sphere (+ README)
├── config/google-sheet.ts        reads the env variables
├── types/elements.ts             ElementData
└── test/setup.ts                 test setup
```

## Testing

```bash
npm test          # watch mode
npm run test:run  # single run
```

| Area | What the tests cover |
|---|---|
| `services/colour` | interpolation endpoints, midpoint, clamping |
| `services/sheet` | request URL, parsing, header errors, per-row error reporting, number and money formats, HTTP failures |
| `three/layouts` | card counts, extents, centring, uniqueness, double-helix pairing, sphere radius and spacing, outward facing |
| `three/ElementFactory` | card content, image fallback, text is not parsed as HTML, colour by net worth |
| `components/*` | layout buttons, sign-in gate, data gate states, retry |
| `hooks/useSheetData` | success, no retry on validation errors, retry on other errors |
| `auth/*` | sign-in / sign-out state transitions |

The Three.js scene class itself (`PeriodicTableScene`) is not unit tested. It needs a real browser layout engine, so it is covered by manual checks. The React tests mock the hook that creates it.

## Design notes and limitations

- **The login is a UI gate.** The Google credential is not verified server-side (there is no backend), so this controls what the page shows, not who can reach the data. The sheet is public and the API key is visible in the browser bundle, so restrict the key. A production version would verify the credential on a server and fetch the data from there.
- **No refresh tokens or sessions.** Sign-in state is in memory only, so a page reload shows the sign-in screen again.
- **Google "Testing" mode** limits sign-in to the listed test users. Publishing the consent screen lifts that.
- **Card size is fixed at 120 x 160.** All layout spacing, helix pitch and sphere radius are derived from it. Change the card size and the layout constants together.
- **Layouts assume 200 cards** and the default camera (`z = 3000`, 40 degree field of view).
- **Photos load straight from the URLs in the sheet.** Broken links fall back to an empty frame. Photos are cropped to fill and biased toward the top to keep faces in view.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Google says "origin not allowed" / `origin_mismatch` | the page origin is not in **Authorized JavaScript origins** (check the port and `localhost` vs `127.0.0.1`) |
| "Missing required parameter client_id" | `VITE_GOOGLE_CLIENT_ID` is empty. Fix `.env.local` and restart the dev server |
| "Couldn't load data" with status 403 | Sheets API not enabled, API key restricted to a different referrer or API, or the sheet is not shared publicly |
| "Couldn't load data" with status 400 | the tab is not named `DataTemplate`, or the spreadsheet ID is wrong |
| "Invalid headers" | a header is missing, misspelled or duplicated (see Sheet format) |
| Blank black page after sign-in | `.viewport` has no size. Check the CSS for `.periodic-table` / `.viewport` was not removed |
| Cards show no photo | the URL is broken or the host blocks hotlinking |
| Can't sign in with a valid account | the account is not on the consent screen's test users list |

## More documentation

- [`src/three/layouts/README.md`](src/three/layouts/README.md): the maths behind each layout
- [`src/data.md`](src/data.md): the data loading flow (`QueryClientProvider` and `DataGate`)
