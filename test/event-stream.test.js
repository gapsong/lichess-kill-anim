import assert from 'node:assert/strict';
import test from 'node:test';

import { CaptureEventStream } from '../src/event-stream.js';

test('emits each capture event only once for repeated snapshots', () => {
  const stream = new CaptureEventStream();
  const snapshot = {
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5']
  };

  assert.equal(stream.next(snapshot).length, 1);
  assert.deepEqual(stream.next(snapshot), []);
});

test('resets dedupe when the snapshot identity changes', () => {
  const stream = new CaptureEventStream();
  const snapshot = {
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5']
  };

  stream.next(snapshot);

  assert.equal(stream.next({ ...snapshot, id: 'game-2' }).length, 1);
});
