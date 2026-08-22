// undefended-layer.js
// Board-local canvas layer that marks the undefended pieces produced by
// findUndefended(). It reuses CanvasOverlay (same board-tracking, DPR and
// isConnected handling as the kill-animation canvas) but on its OWN canvas, so
// these static markers are not wiped by the per-frame clear of the animation
// loop. Its markers only change when the position changes, so it repaints on
// demand (render/clear) and — via CanvasOverlay's onSync hook — on board
// flip/resize.
import { CanvasOverlay } from './canvas-overlay.js';
import { boardLocalSquareCenter } from './board-geometry.js';

// Two markers that differ in BOTH hue and shape, so they remain distinguishable
// for red/green colour-blind users and match the script's neon kill aesthetic:
//  - own  (danger to me): red corner brackets framing the square
//  - enemy (my chance):   cyan ring inset in the square
const STYLES = {
  own: { color: '#ff5252', shape: 'brackets' },
  enemy: { color: '#25e0d0', shape: 'ring' }
};

export class UndefendedLayer {
  constructor({ document, overlay } = {}) {
    this.pieces = [];
    this.overlay = overlay ?? new CanvasOverlay({
      document,
      id: 'lichess-undefended-overlay',
      zIndex: '2', // under the kill-animation canvas (z-index 3), over the board
      onSync: (state) => this._draw(state)
    });
  }

  // Replace the highlighted set with findUndefended() output and repaint.
  render(pieces) {
    this.pieces = pieces ?? [];
    this.overlay.attach(); // attach() runs sync() -> onSync -> _draw
  }

  // Remove all markers (feature off, unsafe context, or empty position).
  clear() {
    if (this.pieces.length === 0) return;
    this.pieces = [];
    this.overlay.attach();
  }

  _draw(state) {
    const ctx = state?.context;
    if (!ctx) return;
    const { size, isBlackOrientation } = state;
    ctx.clearRect(0, 0, size, size);
    for (const piece of this.pieces) {
      const { x, y, size: cell } = boardLocalSquareCenter(piece.square, size, isBlackOrientation);
      const style = STYLES[piece.side] ?? STYLES.enemy;
      drawMarker(ctx, style, x, y, cell);
    }
  }
}

function drawMarker(ctx, style, cx, cy, cell) {
  if (style.shape === 'ring') drawRing(ctx, style.color, cx, cy, cell);
  else drawBrackets(ctx, style.color, cx, cy, cell);
}

// Four L-shaped corners inset from the square edges — frames the piece without
// covering its centre.
function drawBrackets(ctx, color, cx, cy, cell) {
  const half = cell / 2;
  const pad = cell * 0.13;
  const arm = cell * 0.24;
  const left = cx - half + pad;
  const right = cx + half - pad;
  const top = cy - half + pad;
  const bottom = cy + half - pad;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, cell * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = cell * 0.1;
  ctx.beginPath();
  ctx.moveTo(left, top + arm); ctx.lineTo(left, top); ctx.lineTo(left + arm, top);
  ctx.moveTo(right - arm, top); ctx.lineTo(right, top); ctx.lineTo(right, top + arm);
  ctx.moveTo(right, bottom - arm); ctx.lineTo(right, bottom); ctx.lineTo(right - arm, bottom);
  ctx.moveTo(left + arm, bottom); ctx.lineTo(left, bottom); ctx.lineTo(left, bottom - arm);
  ctx.stroke();
  ctx.restore();
}

// A ring inset in the square — frames the piece from all sides.
function drawRing(ctx, color, cx, cy, cell) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, cell * 0.07);
  ctx.shadowColor = color;
  ctx.shadowBlur = cell * 0.1;
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
