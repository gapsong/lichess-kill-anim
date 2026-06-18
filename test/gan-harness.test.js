import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNextIds,
  formatLineage,
  buildPrompt,
  parseResponse,
  appendManifest,
  extractHypothesis
} from '../lab/scripts/generate.mjs';

const baseManifest = () => ({
  piece: 'queen',
  recipe: 'shockwave',
  variants: [
    { id: '_baseline', parent: 'scripts/animations/shockwave.mjs', hypothesis: 'baseline', generatedBy: 'hand', generatedAt: '2026-05-28T10:00:00.000Z' },
    { id: 'v001', parent: '_baseline', hypothesis: 'longer anticipation', generatedBy: 'hand', generatedAt: '2026-05-28T10:01:00.000Z' },
    { id: 'v002', parent: '_baseline', hypothesis: 'warmer palette', generatedBy: 'hand', generatedAt: '2026-05-28T10:02:00.000Z' },
    { id: 'v003', parent: '_baseline', hypothesis: 'whip-snap', generatedBy: 'hand', generatedAt: '2026-05-28T10:03:00.000Z' }
  ]
});

test('computeNextIds returns next 3 IDs after highest vNNN', () => {
  assert.deepEqual(computeNextIds(baseManifest(), 3), ['v004', 'v005', 'v006']);
});

test('computeNextIds ignores underscore-prefixed entries', () => {
  const m = baseManifest();
  m.variants = [m.variants[0]];
  assert.deepEqual(computeNextIds(m, 2), ['v001', 'v002']);
});

test('computeNextIds bridges gaps by continuing past the highest seen', () => {
  const m = baseManifest();
  m.variants = m.variants.filter((v) => v.id !== 'v002');
  assert.deepEqual(computeNextIds(m, 3), ['v004', 'v005', 'v006']);
});

test('computeNextIds with empty manifest starts at v001', () => {
  assert.deepEqual(
    computeNextIds({ piece: 'queen', recipe: 'shockwave', variants: [] }, 3),
    ['v001', 'v002', 'v003']
  );
});

test('formatLineage produces a markdown table with all entries', () => {
  const out = formatLineage(baseManifest());
  assert.match(out, /^\| id \| parent \| hypothesis \| generatedBy \|/);
  assert.match(out, /\| _baseline \|/);
  assert.match(out, /\| v003 \| _baseline \| whip-snap \| hand \|/);
});

test('formatLineage escapes pipe characters in hypothesis', () => {
  const m = baseManifest();
  m.variants[1].hypothesis = 'a | b';
  const out = formatLineage(m);
  assert.match(out, /a \\\| b/);
});

test('buildPrompt substitutes every placeholder', () => {
  const template = [
    'SPEC={{SPEC}}',
    'RUBRIC={{RUBRIC}}',
    'CHAMPION_ID={{CHAMPION_ID}}',
    'CHAMPION_SOURCE={{CHAMPION_SOURCE}}',
    'LINEAGE={{LINEAGE}}',
    'NEXT_IDS={{NEXT_IDS}}',
    'COUNT={{COUNT}}',
    'TIMESTAMP={{TIMESTAMP}}'
  ].join('\n');

  const out = buildPrompt({
    template,
    spec: '<spec>',
    rubric: '<rubric>',
    championId: 'v003',
    championSource: 'export const recipe = {};',
    manifest: baseManifest(),
    nextIds: ['v004', 'v005', 'v006'],
    timestamp: '2026-05-29T12:00:00.000Z'
  });

  assert.match(out, /^SPEC=<spec>$/m);
  assert.match(out, /^RUBRIC=<rubric>$/m);
  assert.match(out, /^CHAMPION_ID=v003$/m);
  assert.match(out, /^CHAMPION_SOURCE=export const recipe = \{\};$/m);
  assert.match(out, /^NEXT_IDS=v004,v005,v006$/m);
  assert.match(out, /^COUNT=3$/m);
  assert.match(out, /^TIMESTAMP=2026-05-29T12:00:00.000Z$/m);
  assert.match(out, /\| v003 \| _baseline \| whip-snap \|/);
});

test('buildPrompt is deterministic for identical inputs', () => {
  const args = {
    template: 'C={{COUNT}} T={{TIMESTAMP}}',
    spec: 's', rubric: 'r',
    championId: 'v003', championSource: 'x',
    manifest: baseManifest(),
    nextIds: ['v004'],
    timestamp: '2026-05-29T12:00:00.000Z'
  };
  assert.equal(buildPrompt(args), buildPrompt(args));
});

test('parseResponse returns blocks for the happy path', () => {
  const text = `
=== VARIANT: v004 ===
/** @lab-variant queen/v004 */
export const recipe = { name: 'shockwave' };
=== END VARIANT ===

some explanatory text the parser should ignore

=== VARIANT: v005 ===
/** @lab-variant queen/v005 */
export const recipe = { name: 'shockwave' };
=== END VARIANT ===
`;
  const blocks = parseResponse(text, ['v004', 'v005']);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].id, 'v004');
  assert.match(blocks[0].source, /@lab-variant queen\/v004/);
  assert.equal(blocks[1].id, 'v005');
});

test('parseResponse rejects when block count differs from expected IDs', () => {
  const text = `=== VARIANT: v004 ===\nx\n=== END VARIANT ===`;
  assert.throws(
    () => parseResponse(text, ['v004', 'v005']),
    /expected 2 variant blocks, found 1/
  );
});

test('parseResponse rejects when block IDs are out of order', () => {
  const text = `
=== VARIANT: v005 ===
x
=== END VARIANT ===
=== VARIANT: v004 ===
x
=== END VARIANT ===
`;
  assert.throws(
    () => parseResponse(text, ['v004', 'v005']),
    /block 0 has id v005, expected v004/
  );
});

test('appendManifest appends new entries in order', () => {
  const m = baseManifest();
  const next = appendManifest(m, [
    { id: 'v004', parent: 'v003', hypothesis: 'test', generatedBy: 'claude-skill', generatedAt: '2026-05-29T12:00:00.000Z' }
  ]);
  assert.equal(next.variants.length, 5);
  assert.equal(next.variants[4].id, 'v004');
  assert.equal(m.variants.length, 4, 'original manifest is untouched');
});

test('appendManifest rejects duplicate IDs', () => {
  const m = baseManifest();
  assert.throws(
    () => appendManifest(m, [
      { id: 'v002', parent: 'v003', hypothesis: 'dup', generatedBy: 'claude-skill', generatedAt: '2026-05-29T12:00:00.000Z' }
    ]),
    /duplicate id v002/
  );
});

test('appendManifest rejects entries missing required fields', () => {
  const m = baseManifest();
  assert.throws(
    () => appendManifest(m, [{ id: 'v004', parent: 'v003', generatedBy: 'claude-skill', generatedAt: '2026-05-29T12:00:00.000Z' }]),
    /missing required fields/
  );
});

test('extractHypothesis pulls a single-line @hypothesis from the JSDoc header', () => {
  const src = `/**
 * @lab-variant queen/v004
 * @parent v003
 * @hypothesis Cooler hue feels lighter than the baseline.
 * @generatedBy claude-skill
 * @generatedAt 2026-05-29T12:00:00.000Z
 */
export const recipe = {};
`;
  assert.equal(
    extractHypothesis(src),
    'Cooler hue feels lighter than the baseline.'
  );
});

test('extractHypothesis joins multi-line @hypothesis continuations', () => {
  const src = `/**
 * @lab-variant queen/v004
 * @hypothesis Tail-Frames um 30% gekuerzt,
 *             impact-Ring kompakter (radius -10%). Whip-Snap statt Slow-Bloom.
 * @generatedBy claude-skill
 */
`;
  assert.equal(
    extractHypothesis(src),
    'Tail-Frames um 30% gekuerzt, impact-Ring kompakter (radius -10%). Whip-Snap statt Slow-Bloom.'
  );
});

test('extractHypothesis returns empty string when header is missing', () => {
  assert.equal(extractHypothesis('export const recipe = {};\n'), '');
});
