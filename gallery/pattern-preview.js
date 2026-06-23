import { Chess } from 'chess.js';
import { detectPatterns } from '../src/patterns.js';
import { boardLocalSquareCenter } from '../src/board-geometry.js';
import { drawPatternFx, PATTERN_THEMES } from '../src/pattern-art.js';

export { PATTERN_THEMES };

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";

function drawBoard(ctx, size, board) {
  const sq = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#ead9b6' : '#b07f55';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${sq * 0.78}px ${GFONT}`;
  ctx.lineWidth = Math.max(1, sq * 0.02);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const { x, y } = boardLocalSquareCenter(cell.square, size, false);
      ctx.fillStyle = cell.color === 'w' ? '#f4f3ee' : '#2b2926';
      ctx.strokeStyle = cell.color === 'w' ? '#403e39' : '#0d0c0a';
      ctx.strokeText(GLYPH[cell.type], x, y);
      ctx.fillText(GLYPH[cell.type], x, y);
    }
  }
}

// Animated showcase: a wood board with the detected pattern highlights drawn by
// the same engine code the live Lichess overlay uses. Returns a stop() function.
export function startPatternPreview(canvas, fen, theme = PATTERN_THEMES[0]) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const board = new Chess(fen).board();
  const patterns = detectPatterns(board);

  // The board + pieces never move — render them once to an offscreen buffer.
  const bg = document.createElement('canvas');
  bg.width = size;
  bg.height = size;
  drawBoard(bg.getContext('2d'), size, board);

  let raf = null;
  let stopped = false;
  let last = 0;

  function frame(now) {
    raf = stopped ? null : requestAnimationFrame(frame);
    if (now - last < 32) return; // cap to ~30fps
    last = now;
    ctx.drawImage(bg, 0, 0);
    for (const pattern of patterns) drawPatternFx(ctx, size, pattern, now, theme, false);
  }

  raf = requestAnimationFrame(frame);
  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
  };
}
