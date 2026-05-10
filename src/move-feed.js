const MOVE_SELECTORS = [
  'move san',
  '.analyse__moves san',
  '.tview2 move san',
  'main.puzzle move',
  'rm6 l4x kwdb',
  'l4x kwdb'
];

const FEN_SELECTORS = [
  '[data-fen]'
  // input.copyable and .analyse__underboard input are intentionally excluded:
  // they reflect the CURRENT position FEN, not the game's starting FEN.
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

export function readSanMoves(document) {
  for (const selector of MOVE_SELECTORS) {
    const moves = [...document.querySelectorAll(selector)]
      .map((element) => normalizeSan(element.textContent))
      .filter(Boolean);

    if (moves.length) return moves;
  }

  return [];
}

function readInitialFen(document) {
  for (const selector of FEN_SELECTORS) {
    const element = document.querySelector(selector);
    const value = element?.dataset?.fen || element?.value || element?.textContent;
    const fen = normalizeFen(value);
    if (fen) return fen;
  }

  return null;
}

function readPuzzleId(document) {
  const links = [...document.querySelectorAll('main.puzzle a[href*="/training/"]')];
  const link = links.find((element) => /^#[A-Za-z0-9]+$/.test(element.textContent?.trim() ?? ''));
  return link?.textContent?.trim().slice(1) || null;
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
    .replace(/[✓✗]+$/g, '')
    .replace(/[!?]+$/g, '')
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
