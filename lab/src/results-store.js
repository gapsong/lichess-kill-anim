// LocalStorage-backed persistence for the active tournament state, plus a
// JSON export for the "Done" workflow.

const STORAGE_KEY = (piece) => `lab:${piece}`;

export function save(piece, state) {
  try {
    localStorage.setItem(STORAGE_KEY(piece), JSON.stringify(state));
  } catch (_error) {
    // Best-effort persistence — never block the UI on storage failure.
  }
}

export function load(piece) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(piece));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function clear(piece) {
  try { localStorage.removeItem(STORAGE_KEY(piece)); } catch (_error) {}
}

export function exportJson(state) {
  const winner = state.history[state.history.length - 1]?.winner ?? 'no-winner';
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-${state.piece}-${winner}.json`;
  const payload = {
    schemaVersion: 1,
    piece: state.piece,
    winner,
    roundsPlayed: state.history.length,
    history: state.history,
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}
