export function squareCenter(square, boardRect, isBlackOrientation = false) {
  const local = boardLocalSquareCenter(square, boardRect.width, isBlackOrientation);

  return {
    x: boardRect.left + local.x,
    y: boardRect.top + local.y,
    size: local.size
  };
}

export function boardLocalSquareCenter(square, boardSize, isBlackOrientation = false) {
  let file = square.charCodeAt(0) - 97;
  let rank = 8 - Number.parseInt(square[1], 10);

  if (isBlackOrientation) {
    file = 7 - file;
    rank = 7 - rank;
  }

  const size = boardSize / 8;

  return {
    x: file * size + size / 2,
    y: rank * size + size / 2,
    size
  };
}

export function squareCenterFromDocument(document, square) {
  const board = document.querySelector('cg-board');
  if (!board) return null;

  const wrap = document.querySelector('.cg-wrap');
  const isBlackOrientation = wrap?.classList.contains('orientation-black') ?? false;

  return squareCenter(square, board.getBoundingClientRect(), isBlackOrientation);
}
