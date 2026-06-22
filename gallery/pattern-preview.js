import { Chess } from 'chess.js';
import { detectPatterns } from '../src/patterns.js';
import { patternColor } from '../src/pattern-overlay.js';
import { boardLocalSquareCenter } from '../src/board-geometry.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";

function pieceFont(ctx, sq) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${sq * 0.78}px ${GFONT}`;
  ctx.lineWidth = Math.max(1, sq * 0.02);
}

function drawBoard(ctx, size, board) {
  const sq = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#ead9b6' : '#b07f55';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
  pieceFont(ctx, sq);
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

function drawPattern(ctx, size, pattern, now, phase) {
  const color = patternColor(pattern.side, false);
  const sq = size / 8;
  const center = (square) => boardLocalSquareCenter(square, size, false);
  const t = now / 1000;

  // breathing glow ring on each involved square
  const pulse = 0.55 + 0.45 * Math.sin(t * 3 + phase);
  for (const square of pattern.squares) {
    const { x, y } = center(square);
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.5 * pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.06);
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * (0.2 + 0.35 * pulse);
    const inset = sq * 0.12;
    ctx.strokeRect(x - sq / 2 + inset, y - sq / 2 + inset, sq - inset * 2, sq - inset * 2);
    ctx.restore();
  }

  // axis line with an energy spark flowing from back to front
  if (pattern.line) {
    const a = center(pattern.line.from);
    const b = center(pattern.line.to);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();

    const prog = ((now + phase * 300) % 1300) / 1300;
    const sx = a.x + (b.x - a.x) * prog;
    const sy = a.y + (b.y - a.y) * prog;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(2, sq * 0.1), 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  // label near the first square
  const key = center(pattern.squares[0]);
  const fontPx = Math.max(9, Math.round(sq * 0.24));
  ctx.save();
  ctx.font = `600 ${fontPx}px 'Space Grotesk', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(pattern.label).width + fontPx * 0.7;
  const h = fontPx * 1.5;
  const ly = key.y - sq * 0.45;
  ctx.fillStyle = 'rgba(20,18,28,0.88)';
  ctx.beginPath();
  ctx.roundRect(key.x - w / 2, ly - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(pattern.label, key.x, ly);
  ctx.restore();
}

// Animated showcase: draws the FEN's board and pulses/flows the detected pattern
// highlights. Returns a stop() function.
export function startPatternPreview(canvas, fen) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const board = new Chess(fen).board();
  const patterns = detectPatterns(board);

  let raf = null;
  let stopped = false;

  function frame(now) {
    raf = null;
    drawBoard(ctx, size, board);
    patterns.forEach((pattern, i) => drawPattern(ctx, size, pattern, now, i * 1.7));
    if (!stopped) raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
  };
}
