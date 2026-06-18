# Sprite Generator Rewrite Gameplan

Goal: generalize `scripts/generate-spritesheet.mjs` from a single hardcoded explosion into a multi-animation pipeline that can produce different visual effects (explosion, dagger kill, future: magic, lightning, etc.) and embed them all into `src/default-animation-pack.js`.

---

## Current State

```
scripts/generate-spritesheet.mjs   — monolithic, explosion only
src/default-animation-pack.js      — one spritesheet ("debug"), one timeline ("kill-impact")
```

---

## Target Architecture

```
scripts/
  generate-spritesheet.mjs         — main entry: iterate all recipes, update pack
  animations/
    shared.mjs                     — rand(), easeOut(), debris(), spark(), gradients
    explosion.mjs                  — 8-frame fire/smoke recipe (current content)
    dagger.mjs                     — 8-frame blade/blood recipe (new)
```

---

## Recipe Interface

Each animation module exports a `recipe` object:

```js
export const recipe = {
  name: 'explosion',            // key in pack.spritesheets
  frameCount: 8,
  frameSize: 128,               // px per frame (square)
  drawSize: 72,                 // how large to draw on board canvas
  frameDurations: [45, 45, 60, 70, 80, 90, 100, 120],
  drawFrame: [                  // array of (ctx, cx, cy) => void functions
    (ctx, cx, cy) => { /* frame 0 */ },
    // ...
  ]
};
```

---

## Main Generator Changes

```js
import { recipe as explosion } from './animations/explosion.mjs';
import { recipe as dagger }    from './animations/dagger.mjs';

const recipes = [explosion, dagger];

for (const recipe of recipes) {
  const dataUrl = await page.evaluate(renderRecipe, recipe);
  // patch src/default-animation-pack.js for this spritesheet
}
```

Patch logic: instead of one regex replace per field, use a structured replace per spritesheet name:
```
spritesheets.explosion.image  → regex: /explosion:\s*\{[^}]*image: '[^']*'/
spritesheets.dagger.image     → similar
```

Or simpler: generate the entire `spritesheets` block programmatically and do one large replace.

---

## Animation Pack Changes

```js
spritesheets: {
  explosion: {
    image: 'data:image/png;base64,...',
    frameWidth: 128,
    frameHeight: 128,
    frames: 8,
    drawSize: 72
  },
  dagger: {
    image: 'data:image/png;base64,...',
    frameWidth: 128,
    frameHeight: 128,
    frames: 8,
    drawSize: 80
  }
},

rules: [
  { when: { attacker: { piece: 'q' } }, timeline: 'dagger-kill' },  // queen → explosion? TBD
  { when: { attacker: { piece: '*' } }, timeline: 'kill-impact' }   // fallback
],

timelines: {
  'kill-impact': {
    layers: [{ id: 'impact', sheet: 'explosion', frames: [...], frameDurations: [...] }]
  },
  'dagger-kill': {
    layers: [{ id: 'slash', sheet: 'dagger', frames: [...], frameDurations: [...] }]
  }
}
```

---

## Dagger Animation Design

**Color story:**
```
Frame 0: faint silver glint at center (anticipation)
Frame 1: SMEAR — wide silver/white diagonal streak (blade in motion)
Frame 2: WHITE FLASH — impact peak, small radius, very bright
Frame 3: CRIMSON burst — blood particles radiate outward
Frame 4: DARK RED drops — particles at max spread, gravity bias on y
Frame 5: BURGUNDY — droplets decelerating, darkening
Frame 6: DARK MAROON — splat settling, most particles gone
Frame 7: DARK stain fade — last trace
```

**Key drawing techniques:**

- **Blade smear (frame 1):** diagonal rectangle or series of `lineTo` strokes, semi-transparent, from NW to SE direction, wider than a real blade (smear = implied speed)
- **Impact flash (frame 2):** small white radial gradient, radius ~20px (more concentrated than explosion = feels more precise/sharp)
- **Blood burst (frame 3):** 12-15 small filled circles, crimson, radiate from center. Some elongated (arc toward direction of motion)
- **Gravity arc (frames 4-5):** particles at distance `easeOut(frame) * maxDist`, y-coordinate gets `+gravityBias` so spread is wider at bottom
- **Splat (frame 6):** a few larger dark red ovals at the farthest particle positions

**Palette:**
```
Blade:   rgba(220,230,240,...)  silver-white
Flash:   rgba(255,255,255,...)  pure white
Blood 1: rgba(200,0,30,...)     crimson
Blood 2: rgba(140,0,20,...)     dark red
Blood 3: rgba(90,0,15,...)      maroon
```

---

## Implementation Steps

### Step 1 — Extract shared utilities
Move from `generate-spritesheet.mjs` into `scripts/animations/shared.mjs`:
- `rand(frame, i)` — deterministic noise
- `easeOut(t)` — `1 - (1-t)^2`
- `debris(ctx, frame, count, minDist, maxDist, colorFn)` — radial particle dots
- `spark(ctx, cx, cy, angle, dist, len, color)` — streak line from center

### Step 2 — Extract explosion into `animations/explosion.mjs`
Move current 8 `drawFrame` functions into the recipe format. Update frame durations to uneven timing. Make frame 0 a pure white flash.

### Step 3 — Write `animations/dagger.mjs`
Implement the dagger color story and drawing code per frame.

### Step 4 — Rewrite main generator
Accepts array of recipes, renders each, updates the pack.

### Step 5 — Update `src/default-animation-pack.js` structure
Add `dagger` spritesheet + `dagger-kill` timeline + rule routing.

### Step 6 — Update `test/animation-pack.test.js`
Add test: `dagger piece routes to dagger-kill timeline`.

### Step 7 — Run full pipeline
```bash
node scripts/generate-spritesheet.mjs
npm test
npm run build
```

---

## What NOT to do yet

- Do not add piece-specific routing for all 6 piece types — add one new animation type first, prove it works, then extend
- Do not change the keyframe interpolation engine (`src/timeline.js`) — it already handles what we need
- Do not change `frameDurationMs` to per-frame in the pack schema until the renderer supports it

---

## Open Questions / Decisions

1. **Per-frame durations in the pack schema**: currently the renderer uses a single `frameDurationMs`. To use `frameDurations: [...]`, `src/canvas-sprite-renderer.js` needs updating. Decide: do this as part of Step 4, or keep uniform timing for now?

2. **Dagger direction**: the animation is currently centered. Later we could rotate based on `event.from → event.to` vector. Defer to post-MVP.

3. **Multiple layers per timeline**: the architecture supports it (layers array). Dagger could have a `slash` layer + a `blood` layer on different timings. Defer — one layer per timeline for now.
