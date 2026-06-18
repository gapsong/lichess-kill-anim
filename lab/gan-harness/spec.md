# Phase 2 Generator Spec — Queen Shockwave Variants

## Goal

Produce N new queen-shockwave variants that extend the existing lineage in
`lab/variants/queen/`. Each variant is an ES module the lab UI can load and
render in its 2x2 tournament grid. The human evaluator picks a winner; the
next round seeds itself from the winner and runs the Generator again.

You are writing for the **lab**, not directly for production. A winner can
later be promoted into `scripts/animations/shockwave.mjs` via
`npm run lab:promote -- queen <id>`. Variants must therefore stay
promote-compatible (see "Hard constraints" below).

## Hard constraints (variant module shape)

1. ES module, must export `recipe`:

   ```js
   export const recipe = {
     name: 'shockwave',
     frameCount: 8,
     frameSize: 128,         // px, canvas tile size
     drawSize: 84 | 86 | 88, // px, render size in lab (stay in family)
     frameDurations: [...],  // length === frameCount, ms per frame
     frames: [frame0, frame1, ..., frameN]  // length === frameCount
   };
   ```

2. Frame functions: `function frameK(ctx, cx, cy) { ... }`. They receive a
   2D canvas context and the center of the tile.

3. **Use `var` only** inside frame functions. No `let`, no `const`. Reason:
   the production pipeline serialises these via `.toString()` and injects
   them into Playwright's `page.evaluate()`. Variants that pass through
   `lab:promote` inherit this constraint, so we enforce it here.

4. Allowed free identifiers (installed on `window` at lab boot, see
   `lab/src/shared.js`):
   `rand(frame, i)`, `rg(ctx, cx, cy, r0, r1, stops)`,
   `debris(ctx, cx, cy, frame, count, minDist, maxDist, colorFn, gravity?)`,
   `spark(ctx, cx, cy, angle, dist, len, color, lineWidth?)`,
   `sparks(ctx, cx, cy, frame, count, minDist, maxDist, color, lenMin, lenMax)`,
   `drawBrackets(ctx, cx, cy, dist, size, lineWidth, color)`.
   Do not call `Math.random()` — use `rand(frame, i)` so frames stay
   deterministic.

5. JSDoc header required at the top of every file:

   ```js
   /**
    * @lab-variant queen/<id>
    * @parent <champion-id>
    * @hypothesis <falsifiable sentence>
    * @generatedBy claude-skill
    * @generatedAt <ISO timestamp>
    */
   ```

6. `frameDurations.reduce((a, b) => a + b, 0)` must land between **400 ms
   and 700 ms**. Outside this window the kill effect either misses the move
   or lingers past the next move.

## Soft guidance (design)

- Stay in the **shockwave aesthetic family**: ring + sparks + debris,
  additive blending (`globalCompositeOperation = 'lighter'`), purple to
  magenta palette range. Major-aesthetic departures belong in their own
  recipe family, not in the queen lineage.
- The `@hypothesis` line is the contract with the human evaluator. State a
  **single falsifiable claim**, e.g. "Warmer hue (hue +15°) makes the
  impact feel heavier than the cooler baseline." Avoid taste statements
  ("looks cooler") — they cannot lose.
- Vary one or two axes per variant, not all of them. The evaluator needs
  to attribute their pick to a specific change.
- The frame timing rhythm matters as much as the visuals. A variant whose
  only change is `frameDurations` is a valid and useful experiment.

## Forbidden moves

- Don't re-propose a hypothesis already present in the lineage (the
  Generator prompt will include the full manifest history).
- Don't break the recipe contract above for stylistic reasons — variants
  that fail to load are dead weight in the tournament.
- Don't add new external dependencies. Variants run inside the lab Vite
  build with no network, no imports beyond the recipe export.

## Inputs the Generator receives

For each round the Generator is given:

- This spec (`lab/gan-harness/spec.md`)
- The eval rubric (`lab/gan-harness/eval-rubric.md`)
- The full source of the **champion** variant from the previous round
- The full `manifest.json` so the lineage and prior hypotheses are visible
- The list of **next-available IDs** (e.g. `v004`, `v005`, `v006`)
- The desired N (default 3)

## Output the Generator must produce

A single response containing N variant blocks in this exact format
(parser in `lab/scripts/generate.mjs` depends on it):

```
=== VARIANT: vNNN ===
/**
 * @lab-variant queen/vNNN
 * @parent <champion-id>
 * @hypothesis <one sentence>
 * @generatedBy claude-skill
 * @generatedAt <ISO timestamp the script will overwrite>
 */
<frame functions>
export const recipe = { ... };
=== END VARIANT ===
```

The script will write each block to `lab/variants/queen/vNNN.mjs` and
append a `manifest.json` entry. No other side effects from the Generator
response are honoured.
