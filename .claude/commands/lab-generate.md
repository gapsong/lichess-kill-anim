---
description: Generate N new kill-animation variants for a piece, seeded from the current champion. Phase 3 of the animation lab — Claude itself acts as the Generator half of the GAN loop.
argument-hint: <piece> <championId> [--count N]
allowed-tools: Bash, Read, Write
---

# /lab-generate — Animation Lab Generator (Phase 3)

You are the **Generator** half of the lab's GAN-style design loop. The
**Evaluator** is the human picking winners in `npm run lab` (the 2x2 UI).
Your job: produce `N` new variants for `<piece>`, seeded from `<championId>`,
following the spec and rubric verbatim.

Phase 2 already wired the CLI plumbing — prompt building, parsing, manifest
appending, round logging. Phase 3 is **you** as the LLM, called from the slash
command, doing what `--llm` does with an external LM Studio server.

## Arguments

`$ARGUMENTS` is `<piece> <championId> [--count N]`.

- `<piece>` — directory under `lab/variants/` (e.g. `queen`)
- `<championId>` — id of the winning variant from the last round (e.g. `v003`)
- `--count N` — optional, defaults to 8

If arguments are missing, stop and ask the user to provide them. Do not guess.

## Step 1 — Print the prompt

Run from the repo root:

```bash
npm run lab:generate -- <piece> <championId> --count <N>
```

This is Phase 2's `cmdPrompt` mode. It validates that the champion exists in
the manifest, then prints the full prompt to stdout — spec, rubric, champion
source, lineage table, and the exact `NEXT_IDS` you must use.

Capture stdout. The IDs the script reserved (e.g. `v004,v005,v006`) and the
`@generatedAt` timestamp it printed are **authoritative** — do not invent
your own.

## Step 2 — Load extra design context

Read these in parallel and treat them as additional inspiration that is
*not* part of the prompt template:

- `docs/ANIMATION-PRINCIPLES.md` — color-story laws, hit-flash, easing, glow
- `scripts/animations/shared.mjs` — utilities you can call (`rand`, `rg`,
  `spark`, `sparks`, `debris`, `drawBrackets`)
- The most recent file in `lab/gan-harness/rounds/` if any — what the last
  generation looked like, so you avoid repeating the same hypothesis

For the principles doc, focus on: color story (§1), hit flash (§2), easing
(§3), glow (§4). These are the levers worth pulling between variants.

## Step 3 — Design `N` distinct hypotheses

Each variant must explore a **different** lever from the champion. Do not
ship `N` near-clones with one number tweaked. Examples of good hypothesis
deltas:

- Color shift (royal-purple → cyan, crimson → ember-orange)
- Timing redistribution (more anticipation, snappier tail)
- Geometry change (ring radius, ray count, spike length)
- Compositing (additive `lighter` glow vs flat)
- Easing curve (linear → easeOut → bounce)

Write each hypothesis as one short German sentence. The hypothesis goes
into the JSDoc header and ends up in `manifest.json` — readers will skim
it months later to recall what the round was about.

## Step 4 — Write each variant

Each variant is a complete `.mjs` file. Follow the shape of
`lab/variants/<piece>/<championId>.mjs` exactly. Hard constraints:

- JSDoc header with `@lab-variant`, `@parent`, `@hypothesis`,
  `@generatedBy claude-skill`, `@generatedAt <timestamp from step 1>`
- `export const recipe = { name, frameCount, frameSize, drawSize,
  frameDurations, frames: [frame0, ..., frameN-1] }`
- Frame functions use `var` only — no `let`/`const`. Frames may be
  serialized via `.toString()` later if promoted.
- `frameCount` must equal `frames.length` and `frameDurations.length`
- Helpers like `rand`, `rg`, `spark` resolve at runtime via
  `lab/src/shared.js` installing them on `window` — call them as free
  identifiers, do not import them

## Step 5 — Emit the response

Compose **one** response containing exactly `N` blocks in this exact
format. The parser in `lab/scripts/generate.mjs` (`parseResponse`) depends
on it byte-for-byte:

```
=== VARIANT: <id> ===
<full file contents, header + recipe export>
=== END VARIANT ===
```

Rules the parser enforces (it will reject the apply otherwise):

- Block count must equal `N`
- IDs must appear in the order given by step 1 (`NEXT_IDS`)
- Each block must contain `@lab-variant` and `export const recipe`
- Anything between blocks is ignored — write nothing there

Write this composed response to a temp file using the Write tool — path
should be something like `/tmp/lab-generate-<piece>-<timestamp>.md`.

## Step 6 — Apply

Run:

```bash
npm run lab:generate -- <piece> <championId> --count <N> --apply <tmpPath>
```

This is Phase 2's `cmdApply`. It will:

1. Re-parse your response with `parseResponse`
2. Verify each block has the JSDoc header and `export const recipe`
3. Write `lab/variants/<piece>/<id>.mjs` for each block
4. Append entries to `lab/variants/<piece>/manifest.json` (with
   `generatedBy: 'claude-skill'` — `cmdApply` sets that field; do not
   override it from the response)
5. Persist a round log under `lab/gan-harness/rounds/`

If the apply fails (parser rejects, manifest collision, missing field),
read the error, fix the response file in place with the Write tool, and
re-run the same `--apply` command. Do not regenerate from scratch unless
the design itself was wrong.

## Step 7 — Report

Output to the user:

- The IDs that were written (from step 1's `NEXT_IDS`)
- For each, the one-line hypothesis (German)
- One line on how to look at them: `npm run lab` and pick the next champion

Do not run `npm run lab` yourself — it's a long-lived Vite server, the
user opens it.

## Non-goals

- Do not run `npm test` or `npm run build` — these new variants are not in
  `scripts/animations/` yet, the production pipeline is unaffected
- Do not edit `scripts/animations/` — that's the `lab:promote` workflow,
  separate command
- Do not touch `manifest.json` directly — `cmdApply` owns that write

## Example invocation

```
/lab-generate queen v003 --count 8
```

Should end with eight new files `lab/variants/queen/v004.mjs` … `v011.mjs`,
eight new manifest entries with `parent: "v003"` and `generatedBy: "claude-skill"`,
and one round log under `lab/gan-harness/rounds/round-<timestamp>-v003.json`.
