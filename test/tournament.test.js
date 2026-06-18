import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS,
  createTournament,
  pickFavorites,
  nextRound,
  isDone,
  overallWinner
} from '../lab/src/tournament.js';

const fixedClock = (iso) => () => new Date(iso);
const CLOCK = () => new Date('2026-01-01T00:00:00Z');

function makeTournament(candidates = ['v001', 'v002', 'v003', 'v004']) {
  return createTournament({ piece: 'queen', candidates, now: CLOCK });
}

// --- createTournament ---

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

test('createTournament initialises in VOTING status', () => {
  const s = makeTournament();
  assert.equal(s.status, STATUS.VOTING);
  assert.deepEqual(s.candidates, ['v001', 'v002', 'v003', 'v004']);
  assert.equal(s.round, 1);
});

// --- pickFavorites ---

test('pickFavorites archives disliked and advances status to BETWEEN', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['_baseline', 'v001', 'v002', 'v003'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });

  const next = pickFavorites(state, ['v002'], { now: fixedClock('2026-05-28T10:00:30.000Z') });

  assert.equal(next.status, STATUS.BETWEEN);
  assert.equal(next.winnerOfRound, 'v002');
  assert.equal(next.history.length, 1);
  assert.deepEqual(next.history[0].disliked, ['_baseline', 'v001', 'v003']);
  assert.deepEqual(next.history[0].liked, ['v002']);
  assert.equal(next.history[0].round, 1);
  assert.equal(next.history[0].pickedAt, '2026-05-28T10:00:30.000Z');
});

test('pickFavorites with one liked ID sets winnerOfRound and likedOfRound', () => {
  const s = pickFavorites(makeTournament(), ['v002'], { now: CLOCK });
  assert.equal(s.status, STATUS.BETWEEN);
  assert.equal(s.winnerOfRound, 'v002');
  assert.deepEqual(s.likedOfRound, ['v002']);
});

test('pickFavorites with multiple liked IDs records all in likedOfRound', () => {
  const s = pickFavorites(makeTournament(), ['v001', 'v003'], { now: CLOCK });
  assert.deepEqual(s.likedOfRound, ['v001', 'v003']);
  assert.equal(s.winnerOfRound, 'v001');
});

test('pickFavorites history entry has liked and disliked arrays', () => {
  const s = pickFavorites(makeTournament(), ['v002', 'v004'], { now: CLOCK });
  assert.deepEqual(s.history[0].liked, ['v002', 'v004']);
  assert.deepEqual(s.history[0].disliked, ['v001', 'v003']);
});

test('pickFavorites does not mutate the input state', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const snapshot = JSON.stringify(state);

  pickFavorites(state, ['a'], { now: fixedClock('2026-05-28T10:00:10.000Z') });

  assert.equal(JSON.stringify(state), snapshot);
});

test('pickFavorites rejects unknown candidates and non-voting status', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });

  assert.throws(() => pickFavorites(state, ['c']), /unknown candidate/);

  const picked = pickFavorites(state, ['a']);
  assert.throws(() => pickFavorites(picked, ['a']), /non-voting/);
});

test('pickFavorites rejects empty likedIds', () => {
  assert.throws(
    () => pickFavorites(makeTournament(), [], { now: CLOCK }),
    /non-empty array/
  );
});

test('pickFavorites rejects call outside VOTING status', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  assert.throws(
    () => pickFavorites(between, ['v001'], { now: CLOCK }),
    /non-voting status/
  );
});

// --- nextRound ---

test('nextRound seeds a new round with winner first and removes duplicates', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['_baseline', 'v001', 'v002', 'v003'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const picked = pickFavorites(state, ['v002'], { now: fixedClock('2026-05-28T10:00:30.000Z') });

  const round2 = nextRound(picked, 'pool', ['v004', 'v002', 'v005', 'v006'], {
    now: fixedClock('2026-05-28T10:01:00.000Z')
  });

  assert.equal(round2.round, 2);
  assert.equal(round2.status, STATUS.VOTING);
  assert.equal(round2.winnerOfRound, null);
  assert.deepEqual(round2.candidates, ['v002', 'v004', 'v005', 'v006']);
  assert.equal(round2.roundStartedAt, '2026-05-28T10:01:00.000Z');
});

test('nextRound seeds from all liked IDs plus fresh seeds', () => {
  const between = pickFavorites(makeTournament(), ['v001', 'v002'], { now: CLOCK });
  const next = nextRound(between, 'refine', ['v005', 'v006'], { now: CLOCK });
  assert.equal(next.status, STATUS.VOTING);
  assert.equal(next.round, 2);
  assert.deepEqual(next.candidates, ['v001', 'v002', 'v005', 'v006']);
});

test('nextRound deduplicates liked IDs appearing in seeds', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  const next = nextRound(between, 'pool', ['v001', 'v007', 'v008'], { now: CLOCK });
  assert.equal(next.candidates.filter((c) => c === 'v001').length, 1);
});

test('nextRound("done") freezes the tournament', () => {
  const state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  const picked = pickFavorites(state, ['a'], { now: fixedClock('2026-05-28T10:00:30.000Z') });
  const done = nextRound(picked, 'done');

  assert.equal(done.status, STATUS.DONE);
  assert.equal(isDone(done), true);
  assert.equal(overallWinner(done), 'a');
  assert.throws(() => pickFavorites(done, ['a']), /non-voting/);
  assert.throws(() => nextRound(done, 'pool', ['b']), /non-between/);
});

test('nextRound done transitions to DONE', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  const done = nextRound(between, 'done', [], { now: CLOCK });
  assert.equal(done.status, STATUS.DONE);
});

// --- overallWinner ---

test('overallWinner returns first liked ID of last round', () => {
  const between = pickFavorites(makeTournament(), ['v003', 'v001'], { now: CLOCK });
  assert.equal(overallWinner(between), 'v003');
});

test('overallWinner returns null on fresh tournament', () => {
  assert.equal(overallWinner(makeTournament()), null);
});

test('history accumulates winners across rounds', () => {
  let state = createTournament({
    piece: 'queen',
    candidates: ['a', 'b', 'c', 'd'],
    now: fixedClock('2026-05-28T10:00:00.000Z')
  });
  state = pickFavorites(state, ['b'], { now: fixedClock('2026-05-28T10:00:30.000Z') });
  state = nextRound(state, 'pool', ['e', 'f', 'g'], { now: fixedClock('2026-05-28T10:01:00.000Z') });
  state = pickFavorites(state, ['f'], { now: fixedClock('2026-05-28T10:01:30.000Z') });

  assert.equal(state.history.length, 2);
  assert.deepEqual(state.history.map((h) => h.liked[0]), ['b', 'f']);
  assert.equal(overallWinner(state), 'f');
});
