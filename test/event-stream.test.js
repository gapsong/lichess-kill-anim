import assert from 'node:assert/strict';
import test from 'node:test';

import { CaptureEventStream } from '../src/event-stream.js';

// Entering a game with prior captures must be silent (baseline). On the LIVE/TV
// path (activePly == null) the first scan of a new context seeds the already-
// played captures into `seen` without emitting, so only captures that first
// appear in a later scan animate. On the ANALYSIS path (activePly != null)
// animations are navigation-driven: the first scan is still silent, but it does
// NOT pre-seed `seen` — so clicking onto any capture ply (including ones earlier
// than the entry cursor) fires. The tests below reflect both paths.

test('live entry with prior captures is silent, then emits a later capture once', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5'] };

  // First scan baselines whatever is already on the board (no captures yet here).
  assert.deepEqual(stream.next(base), []);

  const withCapture = { ...base, sanMoves: ['e4', 'd5', 'exd5'] };
  assert.equal(stream.next(withCapture).length, 1);
  assert.deepEqual(stream.next(withCapture), []);
});

test('live/TV entry: first scan with N prior captures returns [] and marks them seen', () => {
  const stream = new CaptureEventStream();
  const snapshot = {
    id: 'game-1',
    initialFen: null,
    // two captures already on the board: exd5 (ply 3) and Qxd5 (ply 4)
    sanMoves: ['e4', 'd5', 'exd5', 'Qxd5']
  };

  assert.deepEqual(stream.next(snapshot), []);
  // Rescanning the same board never replays the baselined captures.
  assert.deepEqual(stream.next(snapshot), []);
});

test('new capture after entry emits exactly that one event', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };

  assert.deepEqual(stream.next(base), []); // baseline: exd5 already on board

  const next = { ...base, sanMoves: ['e4', 'd5', 'exd5', 'Qxd5'] };
  const events = stream.next(next);
  assert.equal(events.length, 1);
  assert.equal(events[0].san, 'Qxd5');
});

test('game switch re-baselines silently, then emits only later captures', () => {
  const stream = new CaptureEventStream();
  const game1 = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };
  stream.next(game1); // baseline game 1

  // Joining a new game that already has a capture is silent on its first scan.
  const game2 = { id: 'game-2', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };
  assert.deepEqual(stream.next(game2), []);

  // A capture played while watching game 2 animates.
  const game2Live = { ...game2, sanMoves: ['e4', 'd5', 'exd5', 'Qxd5'] };
  const events = stream.next(game2Live);
  assert.equal(events.length, 1);
  assert.equal(events[0].san, 'Qxd5');
});

// Regression for commit d6d1120 ("silent baseline on entry"): opening an
// analysis board that already holds a full game leaves the cursor at the final
// ply. The old baseline seeded EVERY capture up to activePly into `seen`, so
// navigating back onto any earlier capture found it already seen and never
// animated — the captain's "on the analysis board I see nothing". The analysis
// path must not pre-seed; navigating onto a capture below the entry cursor fires.
test('analysis entry at the game end still fires when navigating onto an earlier capture', () => {
  const stream = new CaptureEventStream();
  const base = {
    id: 'game-1',
    initialFen: null,
    // captures at ply 3 (exd5) and ply 6 (Nxd5); a full game already loaded
    sanMoves: ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'Nxd5']
  };

  // Open sitting at the final ply (6) — the common case. Entry is silent.
  assert.deepEqual(stream.next({ ...base, activePly: 6 }), []);
  // A redundant rescan at the same ply stays silent (no burst on entry).
  assert.deepEqual(stream.next({ ...base, activePly: 6 }), []);

  // Navigate back onto the earlier exd5 capture (ply 3, below the entry cursor):
  // it MUST animate.
  const back = stream.next({ ...base, activePly: 3 });
  assert.equal(back.length, 1);
  assert.equal(back[0].san, 'exd5');

  // And forward onto the ply-6 capture fires it too.
  const fwd = stream.next({ ...base, activePly: 6 });
  assert.equal(fwd.length, 1);
  assert.equal(fwd[0].san, 'Nxd5');
});

test('activePly entry on a capture ply is silent; advancing to a new capture fires', () => {
  const stream = new CaptureEventStream();
  const base = {
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxd1']
  };

  // Cursor already sitting on the exd5 capture at entry -> no animation.
  assert.deepEqual(stream.next({ ...base, activePly: 3 }), []);

  // Advancing to the next capture ply (Qxd5, ply 4) fires it.
  const advanced = stream.next({ ...base, activePly: 4 });
  assert.equal(advanced.length, 1);
  assert.equal(advanced[0].san, 'Qxd5');
});

test('fires the capture at activePly after advancing to it', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };

  assert.deepEqual(stream.next({ ...base, activePly: 2 }), []); // silent entry
  const events = stream.next({ ...base, activePly: 3 });
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

  assert.equal(stream.next({ ...base, activePly: 2 }).length, 0); // silent entry
  assert.equal(stream.next({ ...base, activePly: 3 }).length, 1); // advance fires
  assert.equal(stream.next({ ...base, activePly: 2 }).length, 0); // back
  assert.equal(stream.next({ ...base, activePly: 3 }).length, 0); // forward, no re-fire
});

test('fires capture when activePly advances to a capture move', () => {
  const stream = new CaptureEventStream();
  const base = { id: 'game-1', initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] };

  assert.equal(stream.next({ ...base, activePly: 1 }).length, 0);
  assert.equal(stream.next({ ...base, activePly: 2 }).length, 0);
  assert.equal(stream.next({ ...base, activePly: 3 }).length, 1);
});
