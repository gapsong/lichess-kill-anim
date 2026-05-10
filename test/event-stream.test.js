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

test('fires only the capture at activePly when activePly is set', () => {
  const stream = new CaptureEventStream();
  const snapshot = {
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5'],
    activePly: 3
  };

  const events = stream.next(snapshot);
  assert.equal(events.length, 1);
  assert.equal(events[0].san, 'exd5');
});

test('fires nothing when activePly points to a non-capture move', () => {
  const stream = new CaptureEventStream();
  const snapshot = {
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5'],
    activePly: 1
  };

  assert.equal(stream.next(snapshot).length, 0);
});

test('does not re-fire a capture when navigating back to the same ply', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };

  assert.equal(stream.next({ ...base, activePly: 3 }).length, 1);
  assert.equal(stream.next({ ...base, activePly: 2 }).length, 0);
  assert.equal(stream.next({ ...base, activePly: 3 }).length, 0);
});

test('fires capture when activePly advances to a capture move', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };

  assert.equal(stream.next({ ...base, activePly: 1 }).length, 0);
  assert.equal(stream.next({ ...base, activePly: 2 }).length, 0);
  assert.equal(stream.next({ ...base, activePly: 3 }).length, 1);
});
