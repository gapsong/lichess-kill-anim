// undefended.js
// Pure chess logic: which pieces on the board are UNDEFENDED — i.e. not covered
// by any same-coloured piece. This is independent of whether the piece is
// currently attacked; an undefended piece is simply a latent target/risk.
//
// Single source of truth is chess.js. `chess.attackers(square, color)` returns
// the squares of every `color` piece that attacks `square` — for an occupied
// square that is exactly its set of defenders (the occupying piece never attacks
// its own square). This already accounts for pawn diagonal cover, king cover and
// x-ray blockers, so we do NOT re-implement any chess rules here.
//
// v1 simplifications (documented, intentional):
//  - A PINNED piece still counts as a defender. `attackers` is pure geometry and
//    ignores pins, so a defender that could not legally recapture (because it is
//    pinned to its king) is still treated as cover. Fixing this would need a
//    legality check per defender; deferred.
//  - The KING is never reported as undefended (it can never be left "hanging" —
//    capturing a king is illegal). The king DOES count as a defender of adjacent
//    squares, which chess.js handles for free.

const KING = 'k';

/**
 * @param {import('chess.js').Chess} chess  position to inspect
 * @param {'w'|'b'} myColor  the viewer's colour (board orientation), used to
 *        label each undefended piece as 'own' (danger to me) or 'enemy' (my chance)
 * @returns {{square:string,type:string,color:'w'|'b',side:'own'|'enemy'}[]}
 */
export function findUndefended(chess, myColor) {
  const undefended = [];

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      if (piece.type === KING) continue; // king is never "hanging"

      const defenders = chess.attackers(piece.square, piece.color);
      if (defenders.length > 0) continue; // covered by a same-coloured piece

      undefended.push({
        square: piece.square,
        type: piece.type,
        color: piece.color,
        side: piece.color === myColor ? 'own' : 'enemy'
      });
    }
  }

  return undefended;
}
