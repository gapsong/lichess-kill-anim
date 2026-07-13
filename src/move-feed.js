const MOVE_SELECTORS = [
  'move san',
  '.analyse__moves san',
  '.tview2 move san',
  'main.puzzle move',
  'rm6 l4x kwdb',
  'l4x kwdb'
];


export function readSnapshot(document, location = globalThis.location) {
  const sanMoves = readSanMoves(document);
  if (!sanMoves.length) return null;

  const initialFen = readInitialFen(document);
  const puzzleId = readPuzzleId(document);
  const activePly = readActivePly(document);
  const context = puzzleId
    ? `puzzle:${puzzleId}|${initialFen ?? 'start'}`
    : (initialFen ?? 'start');

  return {
    id: `${location?.pathname ?? 'lichess'}|${context}`,
    initialFen,
    sanMoves,
    activePly
  };
}

// Matches a normalized SAN move: castling, a piece move (with optional
// disambiguation/capture), or a pawn push/capture (with optional promotion),
// plus an optional check/mate suffix. Deliberately tight so non-move UI
// (clocks "2:04", evals "+1.5" / "#3", ratings "1500", player names) is excluded.
const SAN_RE = /^(?:O-O-O|O-O|0-0-0|0-0|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?$/;

export function readSanMoves(document) {
  for (const selector of MOVE_SELECTORS) {
    const moves = [...document.querySelectorAll(selector)]
      .map((element) => normalizeSan(element.textContent))
      .filter(Boolean);

    if (moves.length) return moves;
  }

  // Structural fallback: Lichess TV move-list tags are obfuscated and rotate on
  // every deploy, so no fixed selector survives. Instead, find leaf elements
  // whose text is a valid SAN move, group them by parent container, and return
  // the moves of the container holding the most — keying on SAN content +
  // structure rather than tag names.
  return readSanMovesStructural(document);
}

function readSanMovesStructural(document) {
  const groups = new Map();

  for (const element of document.querySelectorAll('*')) {
    if (element.childElementCount > 0) continue; // leaf nodes only
    const san = normalizeSan(element.textContent);
    if (!san || !SAN_RE.test(san)) continue;

    const parent = element.parentElement;
    if (!parent) continue;

    let list = groups.get(parent);
    if (!list) {
      list = [];
      groups.set(parent, list);
    }
    list.push(san);
  }

  // Pick the container with the longest ordered run of SAN children. Map
  // iteration is DOM order, so a strict `>` keeps the earliest on ties.
  let best = [];
  for (const list of groups.values()) {
    if (list.length > best.length) best = list;
  }
  return best;
}

function readInitialFen(document) {
  const el = document.querySelector('[data-fen]');
  return normalizeFen(el?.dataset.fen) ?? null;
}

function readPuzzleId(document) {
  return [...document.querySelectorAll('main.puzzle a[href*="/training/"]')]
    .find((el) => /^#[A-Za-z0-9]+$/.test(el.textContent?.trim() ?? ''))
    ?.textContent?.trim().slice(1) || null;
}

function readActivePly(document) {
  const activeSan = document.querySelector('move.active san');
  if (!activeSan) return null;

  const allSans = [...document.querySelectorAll('move san')];
  const index = allSans.indexOf(activeSan);
  return index >= 0 ? index + 1 : null;
}

function normalizeSan(value) {
  return value
    ?.trim()
    .replace(/\s+/g, '')
    .replace(/^\d+\.(\.\.)?/, '')
    .replace(/[✓✗!?]+$/g, '')
    || null;
}

function normalizeFen(value) {
  const text = value?.trim();
  if (!text) return null;

  const parts = text.split(/\s+/);
  if (parts.length < 4) return null;
  if (!/^[pnbrqkPNBRQK1-8/]+$/.test(parts[0])) return null;
  if (!/^[wb]$/.test(parts[1])) return null;

  return parts.slice(0, 6).join(' ');
}
