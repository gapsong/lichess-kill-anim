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
    likedOfRound: null,
    history: [],
    startedAt,
    roundStartedAt: startedAt
  };
}

export function pickFavorites(state, likedIds, { now = () => new Date() } = {}) {
  if (state.status !== STATUS.VOTING) {
    throw new Error(`pickFavorites called in non-voting status: ${state.status}`);
  }
  if (!Array.isArray(likedIds) || likedIds.length === 0) {
    throw new Error('likedIds must be a non-empty array');
  }
  for (const id of likedIds) {
    if (!state.candidates.includes(id)) {
      throw new Error(`unknown candidate: ${id}`);
    }
  }

  const likedSet = new Set(likedIds);
  const disliked = state.candidates.filter((id) => !likedSet.has(id));
  const pickedAt = now().toISOString();

  return {
    ...state,
    status: STATUS.BETWEEN,
    winnerOfRound: likedIds[0],
    likedOfRound: [...likedIds],
    history: [
      ...state.history,
      {
        round: state.round,
        liked: [...likedIds],
        disliked,
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

  const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
  if (liked.length === 0) throw new Error('no liked IDs recorded for previous round');

  const fresh = seeds.filter((id) => !liked.includes(id));
  const candidates = dedupe([...liked, ...fresh]).slice(0, 12);

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
    likedOfRound: null,
    roundStartedAt
  };
}

export function isDone(state) {
  return state.status === STATUS.DONE;
}

export function overallWinner(state) {
  const last = state.history[state.history.length - 1];
  return last?.liked?.[0] ?? last?.winner ?? null;
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
