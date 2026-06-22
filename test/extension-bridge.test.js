import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPingMessage, buildSetPackMessage } from '../gallery/extension-bridge.js';

test('ping message shape', () => {
  assert.deepEqual(buildPingMessage(), { type: 'ping' });
});

test('setPack message carries the packId', () => {
  assert.deepEqual(buildSetPackMessage('fire'), { type: 'setPack', packId: 'fire' });
});
