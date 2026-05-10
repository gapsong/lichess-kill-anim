export function squareCenter(square, boardRect, isBlackOrientation = false) {
  let file = square.charCodeAt(0) - 97;
  let rank = 8 - Number.parseInt(square[1], 10);

  if (isBlackOrientation) {
    file = 7 - file;
    rank = 7 - rank;
  }

  const size = boardRect.width / 8;

  return {
    x: boardRect.left + file * size + size / 2,
    y: boardRect.top + rank * size + size / 2,
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
