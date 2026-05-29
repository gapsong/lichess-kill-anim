import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS,
  createTournament,
  pickWinner,
  nextRound,
  isDone,
  overallWinner
} from '../lab/src/tournament.js';

const fixedClock = (iso) => () => new Date(iso);

test('createTournament starts voting with given candidates', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['_baseline', 'v001', 'v002', 'v003'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });

  assert.equal(state.piece, 'queen');
  assert.equal(state.round, 1);
  assert.equal(state.status, STATUS.VOTING);
  assert.deepEqual(state.candidates, ['_baseline', 'v001', 'v002', 'v003']);
  assert.equal(state.history.length, 0);
  assert.equal(state.startedAt, '2026-05-28T10:00:00.000Z');
});

test('pickWinner archives losers and advances status to BETWEEN', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['_baseline', 'v001', 'v002', 'v003'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });

  const next = pickWinner(state, 'v002', { now: fixedClock('2026-05-28T10:00:30.000Z') });

  assert.equal(next.status, STATUS.BETWEEN);
  assert.equal(next.winnerOfRound, 'v002');
  assert.equal(next.history.length, 1);
  assert.deepEqual(next.history[0].losers, ['_baseline', 'v001', 'v003']);
  assert.equal(next.history[0].winner, 'v002');
  assert.equal(next.history[0].round, 1);
  assert.equal(next.history[0].pickedAt, '2026-05-28T10:00:30.000Z');
});

test('pickWinner does not mutate the input state', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const snapshot = JSON.stringify(state);

  pickWinner(state, 'a', { now: fixedClock('2026-05-28T10:00:10.000Z') });

  assert.equal(JSON.stringify(state), snapshot);
});

test('pickWinner rejects unknown candidates and non-voting status', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });

  assert.throws(() => pickWinner(state, 'c'), /unknown candidate/);

  const picked = pickWinner(state, 'a');
  assert.throws(() => pickWinner(picked, 'a'), /non-voting/);
});

test('nextRound seeds a new round with winner first and removes duplicates', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['_baseline', 'v001', 'v002', 'v003'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const picked = pickWinner(state, 'v002', { now: fixedClock('2026-05-28T10:00:30.000Z') });

  const round2 = nextRound(picked, 'pool', ['v004', 'v002', 'v005', 'v006'], {
    now: fixedClock('2026-05-28T10:01:00.000Z')
  });

  assert.equal(round2.round, 2);
  assert.equal(round2.status, STATUS.VOTING);
  assert.equal(round2.winnerOfRound, null);
  // winner first, then deduplicated fresh seeds; v002 dedup'd from seeds.
  assert.deepEqual(round2.candidates, ['v002', 'v004', 'v005', 'v006']);
  assert.equal(round2.roundStartedAt, '2026-05-28T10:01:00.000Z');
});

test('nextRound("done") freezes the tournament', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const picked = pickWinner(state, 'a', { now: fixedClock('2026-05-28T10:00:30.000Z') });
  const done = nextRound(picked, 'done');

  assert.equal(done.status, STATUS.DONE);
  assert.equal(isDone(done), true);
  assert.equal(overallWinner(done), 'a');
  assert.throws(() => pickWinner(done, 'a'), /non-voting/);
  assert.throws(() => nextRound(done, 'pool', ['b']), /non-between/);
});

test('history accumulates winners across rounds', () => {
  let state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b', 'c', 'd'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  state = pickWinner(state, 'b', { now: fixedClock('2026-05-28T10:00:30.000Z') });
  state = nextRound(state, 'pool', ['e', 'f', 'g'], { now: fixedClock('2026-05-28T10:01:00.000Z') });
  state = pickWinner(state, 'f', { now: fixedClock('2026-05-28T10:01:30.000Z') });

  assert.equal(state.history.length, 2);
  assert.deepEqual(state.history.map((h) => h.winner), ['b', 'f']);
  assert.equal(overallWinner(state), 'f');
});
