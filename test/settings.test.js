import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS, mergeSettings } from '../src/settings.js';

test('empty/undefined storage yields the defaults', () => {
  assert.deepEqual(mergeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(mergeSettings({}), DEFAULT_SETTINGS);
});

test('partial storage overrides only the named keys', () => {
  const out = mergeSettings({ intensity: 3 });
  assert.equal(out.intensity, 3);
  assert.equal(out.packId, DEFAULT_SETTINGS.packId);
  assert.equal(out.soundOn, DEFAULT_SETTINGS.soundOn);
});

test('packId defaults to signature and accepts known packs', () => {
  assert.equal(mergeSettings({}).packId, 'signature');
  assert.equal(mergeSettings({ packId: 'inferno' }).packId, 'inferno');
  assert.equal(mergeSettings({ packId: 'fire' }).packId, 'fire');
});

test('unknown packId falls back to signature', () => {
  assert.equal(mergeSettings({ packId: 'nope' }).packId, 'signature');
  assert.equal(mergeSettings({ packId: 42 }).packId, 'signature');
});

test('intensity is clamped to 1..10 and falls back on non-numbers', () => {
  assert.equal(mergeSettings({ intensity: 0 }).intensity, 1);
  assert.equal(mergeSettings({ intensity: 15 }).intensity, 10);
  assert.equal(mergeSettings({ intensity: 'x' }).intensity, DEFAULT_SETTINGS.intensity);
});

test('unknown keys are ignored', () => {
  const out = mergeSettings({ foo: 1, bar: true });
  assert.deepEqual(out, DEFAULT_SETTINGS);
});

test('shakePieces keeps only known piece letters', () => {
  assert.deepEqual(mergeSettings({ shakePieces: ['q', 'z', 'r'] }).shakePieces, ['q', 'r']);
  assert.deepEqual(mergeSettings({ shakePieces: 'nope' }).shakePieces, DEFAULT_SETTINGS.shakePieces);
});

test('booleans must be real booleans, else default', () => {
  assert.equal(mergeSettings({ enabled: 'yes' }).enabled, true);
  assert.equal(mergeSettings({ soundOn: false }).soundOn, false);
});

test('showUndefended defaults off and accepts a real boolean', () => {
  assert.equal(mergeSettings({}).showUndefended, false);
  assert.equal(mergeSettings({ showUndefended: true }).showUndefended, true);
  assert.equal(mergeSettings({ showUndefended: 'yes' }).showUndefended, false);
});

test('showGoals defaults off and accepts a real boolean', () => {
  assert.equal(mergeSettings({}).showGoals, false);
  assert.equal(mergeSettings({ showGoals: true }).showGoals, true);
  assert.equal(mergeSettings({ showGoals: 'yes' }).showGoals, false);
});

test('mergeSettings returns a fresh shakePieces array (no shared reference)', () => {
  const out = mergeSettings({});
  assert.notEqual(out.shakePieces, DEFAULT_SETTINGS.shakePieces);
  assert.deepEqual(out.shakePieces, DEFAULT_SETTINGS.shakePieces);
});
