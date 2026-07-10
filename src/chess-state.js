import { Chess } from 'chess.js';

export function deriveEvents(snapshot) {
  const chess = snapshot.initialFen ? new Chess(snapshot.initialFen) : new Chess();
  const events = [];

  for (const [index, san] of snapshot.sanMoves.entries()) {
    let move;

    try {
      move = chess.move(san);
    } catch (_error) {
      break;
    }

    if (!move.captured) continue;

    const isEnPassant = move.flags.includes('e');

    const capturedAt = isEnPassant ? `${move.to[0]}${move.from[1]}` : move.to;

    events.push({
      kind: 'capture',
      ply: index + 1,
      san: move.san,
      from: move.from,
      to: move.to,
      movingPiece: move.piece,
      movingColor: move.color,
      capturedPiece: move.captured,
      capturedColor: move.color === 'w' ? 'b' : 'w',
      capturedAt,
      isEnPassant
    });
  }

  return events;
}

// On the analysis board every move is already in the DOM; `activePly` (set from
// `move.active`) is the ply the user is currently looking at, which can be earlier
// than the end of the loaded game. Stop there instead of always replaying to the
// final move, otherwise pattern hints computed from this position would stay stuck
// on a resolved position while the user browses backward through the game.
export function derivePosition(snapshot) {
  const chess = snapshot.initialFen ? new Chess(snapshot.initialFen) : new Chess();
  const ply = snapshot.activePly ?? snapshot.sanMoves.length;
  for (const san of snapshot.sanMoves.slice(0, ply)) {
    try {
      chess.move(san);
    } catch (_error) {
      break;
    }
  }
  return { board: chess.board(), turn: chess.turn() };
}
