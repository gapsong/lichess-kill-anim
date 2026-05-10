export function createRenderEvent(captureEvent, board, snapshotId) {
  const orientation = board.isBlackOrientation ? 'black' : 'white';
  const squareSize = board.size / 8;
  const from = boardLocalSquareCenter(captureEvent.from, board.size, board.isBlackOrientation);
  const to = boardLocalSquareCenter(captureEvent.to, board.size, board.isBlackOrientation);
  const victimAt = boardLocalSquareCenter(captureEvent.capturedAt, board.size, board.isBlackOrientation);
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

function boardLocalSquareCenter(square, boardSize, isBlackOrientation = false) {
  let file = square.charCodeAt(0) - 97;
  let rank = 8 - Number.parseInt(square[1], 10);

  if (isBlackOrientation) {
    file = 7 - file;
    rank = 7 - rank;
  }

  const squareSize = boardSize / 8;

  return {
    x: file * squareSize + squareSize / 2,
    y: rank * squareSize + squareSize / 2
  };
}
