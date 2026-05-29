// Pure tournament state machine. No DOM, no storage, no time-of-day calls
// that we cannot inject — accepts a `now()` clock for deterministic tests.

export const STATUS = Object.freeze({
  VOTING: 'voting',
  BETWEEN: 'between',
  DONE: 'done'
});

export function createTournament({ piece, candidates, now = () => new Date() }) {
  if (!piece) throw new Error('piece required');
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('candidates required');
  }

  const startedAt = now().toISOString();
  return {
    piece,
    round: 1,
    candidates: [...candidates],
    status: STATUS.VOTING,
    winnerOfRound: null,
    history: [],
    startedAt,
    roundStartedAt: startedAt
  };
}

export function pickWinner(state, winnerId, { now = () => new Date() } = {}) {
  if (state.status !== STATUS.VOTING) {
    throw new Error(`pickWinner called in non-voting status: ${state.status}`);
  }
  if (!state.candidates.includes(winnerId)) {
    throw new Error(`unknown candidate: ${winnerId}`);
  }

  const losers = state.candidates.filter((id) => id !== winnerId);
  const pickedAt = now().toISOString();

  return {
    ...state,
    status: STATUS.BETWEEN,
    winnerOfRound: winnerId,
    history: [
      ...state.history,
      {
        round: state.round,
        winner: winnerId,
        losers,
        startedAt: state.roundStartedAt,
        pickedAt
      }
    ]
  };
}

export function nextRound(state, mode, seeds = [], { now = () => new Date() } = {}) {
  if (state.status !== STATUS.BETWEEN) {
    throw new Error(`nextRound called in non-between status: ${state.status}`);
  }
  if (mode === 'done') {
    return { ...state, status: STATUS.DONE };
  }
  if (mode !== 'refine' && mode !== 'pool') {
    throw new Error(`unknown mode: ${mode}`);
  }

  const winner = state.winnerOfRound;
  if (!winner) throw new Error('no winner recorded for previous round');

  const fresh = seeds.filter((id) => id !== winner);
  const candidates = dedupe([winner, ...fresh]).slice(0, 4);

  if (candidates.length < 2) {
    throw new Error('need at least 2 candidates for a new round');
  }

  const roundStartedAt = now().toISOString();
  return {
    ...state,
    round: state.round + 1,
    candidates,
    status: STATUS.VOTING,
    winnerOfRound: null,
    roundStartedAt
  };
}

export function isDone(state) {
  return state.status === STATUS.DONE;
}

export function overallWinner(state) {
  const last = state.history[state.history.length - 1];
  return last?.winner ?? null;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
