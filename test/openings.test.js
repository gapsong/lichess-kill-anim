import assert from 'node:assert/strict';
import test from 'node:test';

import { detectOpening } from '../src/openings.js';

test('detects the Sicilian and gives Black a d5/d6 plan', () => {
  const o = detectOpening(['e4', 'c5']);
  assert.equal(o?.id, 'sicilian');
  assert.match(o.plans.b, /d5/);
  assert.equal(o.plans.w, undefined); // only the owning side gets a plan
});

test('detects the French', () => {
  const o = detectOpening(['e4', 'e6', 'd4', 'd5']);
  assert.equal(o?.id, 'french');
  assert.match(o.plans.b, /Französisch/);
});

test('detects the Caro-Kann', () => {
  const o = detectOpening(['e4', 'c6', 'd4', 'd5']);
  assert.equal(o?.id, 'caro-kann');
  assert.match(o.plans.b, /d5/);
});

test('detects the Italian and gives White an f7/d4 plan', () => {
  const o = detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
  assert.equal(o?.id, 'italian');
  assert.match(o.plans.w, /f7/);
});

test('detects the Ruy Lopez (Spanish)', () => {
  const o = detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  assert.equal(o?.id, 'ruy-lopez');
  assert.match(o.plans.w, /Spanisch/);
});

test('detects the Queen\'s Gambit', () => {
  const o = detectOpening(['d4', 'd5', 'c4', 'e6']);
  assert.equal(o?.id, 'queens-gambit');
  assert.match(o.plans.w, /d5/);
});

test('detects the London System regardless of move order, and not as a Queen\'s Gambit', () => {
  assert.equal(detectOpening(['d4', 'd5', 'Bf4'])?.id, 'london');
  assert.equal(detectOpening(['d4', 'Nf6', 'Bf4'])?.id, 'london');
  assert.equal(detectOpening(['Nf3', 'd5', 'd4', 'Nf6', 'Bf4'])?.id, 'london');
  // The London has no early c4 — a c4 line is not a London.
  assert.notEqual(detectOpening(['d4', 'd5', 'c4', 'Bf4'])?.id, 'london');
});

test('the shared 1.e4 e5 2.Nf3 Nc6 stem picks the more specific 5-ply opening', () => {
  // Both Italian and Spanish share the first four plies; the 5th move decides,
  // and the specific 5-ply match must win over any 2-ply e4 match.
  assert.equal(detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])?.id, 'italian');
  assert.equal(detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])?.id, 'ruy-lopez');
});

test('ignores check/annotation glyphs when matching', () => {
  // Contrived, but proves SAN is normalised before matching.
  assert.equal(detectOpening(['e4', 'c5+'])?.id, 'sicilian');
});

test('returns null for an unknown or too-short opening', () => {
  assert.equal(detectOpening(['g4', 'e5']), null); // Grob: not in the table
  assert.equal(detectOpening(['e4']), null); // too short to name
  assert.equal(detectOpening([]), null);
  assert.equal(detectOpening(undefined), null);
});
