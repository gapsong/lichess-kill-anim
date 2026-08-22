// openings.js
// A tiny opening recogniser: matches the first few moves of a game against a
// short table of common openings and hands back one hard, standard plan line for
// the side that owns it. Deliberately NOT a full ECO database — simple prefix /
// early-move matching is enough to attach a book plan in the opening and early
// middlegame. Plans are phrased as short imperative German goals and taken from
// mainstream opening theory; only the side with a clear-cut standard plan gets
// one (the other side is served by the generic middlegame rules).

// Normalise a SAN move: drop check/mate and annotation glyphs so "Bxf7+" and
// "Nd5#" match their bare forms. Castling ("O-O") is left intact.
const normalise = (san) => String(san).replace(/[+#!?]/g, '');

// The first `count` moves of one colour (white = even plies, black = odd).
function movesOf(sanMoves, color, count) {
  const start = color === 'w' ? 0 : 1;
  const out = [];
  for (let i = start; i < sanMoves.length && out.length < count; i += 2) out.push(sanMoves[i]);
  return out;
}

// Does the move list start exactly with `prefix`?
const startsWith = (moves, prefix) => prefix.every((san, i) => moves[i] === san);

// Do this colour's first `within` moves include every move in `needed`?
function earlyMovesInclude(sanMoves, color, needed, within) {
  const played = new Set(movesOf(sanMoves, color, within));
  return needed.every((san) => played.has(san));
}

// Each entry: an id/name, a `match(moves)` predicate, a `specificity` used to
// pick the most specific match, and `plans` keyed by the side that owns them.
const OPENINGS = [
  {
    id: 'sicilian',
    name: 'Sizilianisch',
    specificity: 2,
    match: (m) => startsWith(m, ['e4', 'c5']),
    plans: { b: 'Sizilianisch: setz den ...d5-Vorstoß durch und halte den d6-Bauern gedeckt.' }
  },
  {
    id: 'french',
    name: 'Französisch',
    specificity: 2,
    match: (m) => startsWith(m, ['e4', 'e6']),
    plans: { b: 'Französisch: spreng das Zentrum mit ...c5 und aktiviere den weißfeldrigen Läufer.' }
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    specificity: 2,
    match: (m) => startsWith(m, ['e4', 'c6']),
    plans: { b: 'Caro-Kann: setz ...d5 durch und entwickle den weißfeldrigen Läufer vor ...e6.' }
  },
  {
    id: 'italian',
    name: 'Italienisch',
    specificity: 5,
    match: (m) => startsWith(m, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']),
    plans: { w: 'Italienisch: ziel auf f7 und bereite mit c3 und d4 das Zentrum vor.' }
  },
  {
    id: 'ruy-lopez',
    name: 'Spanisch',
    specificity: 5,
    match: (m) => startsWith(m, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']),
    plans: { w: 'Spanisch: erhöhe den Druck auf e5 und c6; bereite c3–d4 und den Läuferrückzug nach c2.' }
  },
  {
    id: 'queens-gambit',
    name: 'Damengambit',
    specificity: 3,
    match: (m) => startsWith(m, ['d4', 'd5', 'c4']),
    plans: { w: 'Damengambit: setz Druck auf d5; bereite e4 oder den Minoritätsangriff mit b4–b5 vor.' }
  },
  {
    id: 'london',
    name: 'London-System',
    specificity: 2,
    // Move-order independent: an early d4 plus Bf4 (can even start 1.Nf3), and
    // no c4 (that would be a Queen's-Gambit-style opening instead).
    match: (m) =>
      earlyMovesInclude(m, 'w', ['d4', 'Bf4'], 3) && !earlyMovesInclude(m, 'w', ['c4'], 3),
    plans: { w: 'London-System: halte die Bf4-Struktur; ziel auf c3, e3, Sbd2 und den Vorstoß Se5.' }
  }
];

/**
 * Detect the opening from a SAN move list.
 * @param {string[]} sanMoves  moves in order, e.g. ['e4','c5','Nf3']
 * @returns {{id:string,name:string,plans:{w?:string,b?:string}}|null}
 */
export function detectOpening(sanMoves) {
  if (!Array.isArray(sanMoves) || sanMoves.length < 2) return null;
  const moves = sanMoves.map(normalise);
  let best = null;
  for (const opening of OPENINGS) {
    if (opening.match(moves) && (!best || opening.specificity > best.specificity)) best = opening;
  }
  return best ? { id: best.id, name: best.name, plans: best.plans } : null;
}
