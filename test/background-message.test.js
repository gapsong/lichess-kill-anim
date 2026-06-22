import assert from 'node:assert/strict';
import test from 'node:test';

import { handleExternalMessage } from '../src/background-message.js';

function deps() {
  const saved = [];
  return { saved, getVersion: () => '1.2.3', setPack: (id) => saved.push(id) };
}

test('ping reports installed + version', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'ping' }, d), { installed: true, version: '1.2.3' });
});

test('setPack with a known pack saves it and acks', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'setPack', packId: 'fire' }, d), { ok: true });
  assert.deepEqual(d.saved, ['fire']);
});

test('setPack with an unknown pack is rejected without saving', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'setPack', packId: 'nope' }, d), { ok: false });
  assert.deepEqual(d.saved, []);
});

test('garbage messages return null', () => {
  const d = deps();
  assert.equal(handleExternalMessage(null, d), null);
  assert.equal(handleExternalMessage({ type: 'whatever' }, d), null);
});
