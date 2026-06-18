# Phase 2 Eval Rubric — Queen Shockwave Variants

This rubric is the **Generator's** target. The human evaluator picks winners
by feel in the lab UI, but the Generator should optimise its output against
the weighted criteria below so the pool stays high-signal.

Weights follow the `/ecc:gan-design` defaults (design-mode): Design Quality
0.35, Originality 0.30, Craft 0.25, Functionality 0.10. Originality is
weighted above Craft to push for meaningful departures, not just polish.

## Design Quality (0.35)

- **Impact weight** — does the peak frame *feel* like a kill, or does it
  read as decoration?
- **Visual cohesion** — palette, ring geometry, and debris read as one
  effect, not three competing layers.
- **Readability at 84–88 px draw size** — the variant must work at the
  size it will actually render on a Lichess board square, not just at the
  128 px tile size.
- **Frame rhythm** — `frameDurations` shape (anticipation → impact →
  decay) matches the visual story. A flat duration array against a
  dramatic visual is a Craft loss; a dramatic duration arc against a flat
  visual is a Design Quality loss.

## Originality (0.30)

- **Departure from lineage** — does the variant explore a region of design
  space the existing manifest entries don't already cover? The Generator
  prompt includes every prior hypothesis; re-using one is a hard zero on
  this axis.
- **Falsifiable hypothesis** — "warmer hue feels heavier" is testable.
  "looks better" is not. Untestable hypotheses score zero here even if
  the visual is good, because they teach the loop nothing.
- **Single-axis variation** — changing one variable cleanly (timing OR
  hue OR ring count OR debris density) beats a shotgun rewrite, because
  the evaluator can attribute the pick to the change.

## Craft (0.25)

- **Determinism** — every random value comes from `rand(frame, i)`. No
  `Math.random()`.
- **Additive-blend discipline** — `ctx.save()` / `ctx.restore()` around
  every `globalCompositeOperation` change. Don't leak `lighter` into the
  next draw.
- **`var`-only inside frame functions** — promote-readiness.
- **Tight frame budget** — total `frameDurations` sum in [400, 700] ms.
- **No dead code** — each frame should add visible signal. A frame that
  draws an alpha-0 gradient is a craft loss.

## Functionality (0.10)

- **Recipe contract compliance** — file loads as an ES module, exports
  `recipe`, all `frameCount` / `frameSize` / `drawSize` / `frameDurations`
  / `frames` are present and consistent.
- **JSDoc header present** — required for the parser and for lineage.
- **No runtime errors** — `ctx` API calls are legal; no undefined free
  identifiers beyond the allowed `shared.js` helpers.

## How the Generator should self-check before emitting

Before writing each variant block:

1. Read the manifest lineage. Is my hypothesis already there? If yes,
   rewrite or pick a different axis.
2. Is my hypothesis a single sentence stating a *falsifiable* claim? If
   not, sharpen it.
3. Will my variant render at 86 px or am I designing for the 128 px
   canvas? If only the latter, scale down the test mentally.
4. Does the file pass the hard constraints in `spec.md`?
