import assert from 'node:assert/strict';
import test from 'node:test';

import { isAssistSafeContext } from '../src/play-context.js';

const safe = ['/analysis', '/analysis/standard', '/training', '/training/abcde', '/study/xyz123', '/tv', '/tv/rapid'];
const unsafe = [
  '/',
  '/abcdefgh', // live game page
  '/abcdefgh/white', // live game, player POV
  '/abcdefgh12/black',
  '/@/someuser',
  '/analysisboard', // must not match on a prefix without a boundary
  '/tvchannel',
  '/inbox'
];

test('assist-safe contexts are allowed', () => {
  for (const pathname of safe) {
    assert.equal(isAssistSafeContext({ pathname }), true, `${pathname} should be safe`);
  }
});

test('live-game and other contexts are denied (allowlist)', () => {
  for (const pathname of unsafe) {
    assert.equal(isAssistSafeContext({ pathname }), false, `${pathname} should be denied`);
  }
});

test('missing or malformed location is denied', () => {
  assert.equal(isAssistSafeContext(undefined), false);
  assert.equal(isAssistSafeContext(null), false);
  assert.equal(isAssistSafeContext({}), false);
  assert.equal(isAssistSafeContext({ pathname: 42 }), false);
});
