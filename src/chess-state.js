import { Chess } from 'chess.js';

// Reconstructs the board position the viewer is currently looking at by replaying
// the SAN list up to `activePly`. On the analysis board every move already lives
// in the DOM, but `snapshot.activePly` is the ply the user is viewing and can be
// smaller than `sanMoves.length` — so anything derived from the position (e.g. the
// undefended-piece overlay) must stop there, exactly like CaptureEventStream does,
// or it would show pieces from a position further ahead than the one on screen.
export function positionAt(snapshot) {
  const chess = snapshot?.initialFen ? new Chess(snapshot.initialFen) : new Chess();
  const sanMoves = snapshot?.sanMoves ?? [];
  const limit = snapshot?.activePly ?? sanMoves.length;

  for (const [index, san] of sanMoves.entries()) {
    if (index >= limit) break;
    try {
      chess.move(san);
    } catch (_error) {
      break;
    }
  }

  return chess;
}

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
