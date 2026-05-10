import { boardLocalSquareCenter } from './board-geometry.js';

export function createRenderEvent(captureEvent, board, snapshotId) {
  const orientation = board.isBlackOrientation ? 'black' : 'white';
  const squareSize = board.size / 8;
  const from = renderPoint(captureEvent.from, board);
  const to = renderPoint(captureEvent.to, board);
  const victimAt = renderPoint(captureEvent.capturedAt, board);
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);

  return {
    id: `${snapshotId}|${captureEvent.ply}|${captureEvent.san}|${captureEvent.from}|${captureEvent.to}`,
    board: {
      size: board.size,
      squareSize,
      orientation
    },
    attacker: {
      piece: captureEvent.movingPiece,
      color: captureEvent.movingColor,
      from: { square: captureEvent.from, ...from },
      to: { square: captureEvent.to, ...to }
    },
    victim: {
      piece: captureEvent.capturedPiece,
      color: captureEvent.capturedColor,
      at: { square: captureEvent.capturedAt, ...victimAt }
    },
    move: {
      san: captureEvent.san,
      ply: captureEvent.ply,
      isEnPassant: captureEvent.isEnPassant
    },
    direction: {
      dx,
      dy,
      angleRad: Math.atan2(to.y - from.y, to.x - from.x)
    }
  };
}

function renderPoint(square, board) {
  const { x, y } = boardLocalSquareCenter(square, board.size, board.isBlackOrientation);
  return { x, y };
}
