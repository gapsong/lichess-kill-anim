import assert from 'node:assert/strict';
import test from 'node:test';

import { patternColor } from '../src/pattern-overlay.js';

test('bottom side is green, top side is red (white orientation)', () => {
  assert.equal(patternColor('w', false), '#3bd17a');
  assert.equal(patternColor('b', false), '#e5564b');
});

test('orientation flips which side is the viewer (black orientation)', () => {
  assert.equal(patternColor('b', true), '#3bd17a');
  assert.equal(patternColor('w', true), '#e5564b');
});
