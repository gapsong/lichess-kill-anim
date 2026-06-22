import { boardLocalSquareCenter } from './board-geometry.js';

const GREEN = '#3bd17a';
const RED = '#e5564b';

export function patternColor(side, isBlackOrientation) {
  const bottomSide = isBlackOrientation ? 'b' : 'w';
  return side === bottomSide ? GREEN : RED;
}

export class PatternOverlay {
  constructor({
    document = globalThis.document,
    devicePixelRatio = globalThis.devicePixelRatio ?? 1,
    ResizeObserver = globalThis.ResizeObserver,
    getContext = (canvas) => canvas.getContext?.('2d')
  } = {}) {
    this.document = document;
    this.devicePixelRatio = devicePixelRatio;
    this.ResizeObserver = ResizeObserver;
    this.getContext = getContext;
    this.canvas = null;
    this.board = null;
    this.resizeObserver = null;
  }

  attach() {
    this.board = this.document.querySelector('cg-board');
    if (!this.board) return null;
    this.canvas = this.document.getElementById('lichess-pattern-overlay');
    if (!this.canvas) {
      this.canvas = this.document.createElement('canvas');
      this.canvas.id = 'lichess-pattern-overlay';
      Object.assign(this.canvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: '99997' });
      this.document.body.appendChild(this.canvas);
    }
    if (this.ResizeObserver && !this.resizeObserver) {
      this.resizeObserver = new this.ResizeObserver(() => this.sync());
      this.resizeObserver.observe(this.board);
    }
    return this.canvas;
  }

  sync() {
    if (!this.board) this.board = this.document.querySelector('cg-board');
    if (!this.board || !this.canvas) return null;
    const rect = this.board.getBoundingClientRect();
    const size = rect.width;
    const dpr = this.devicePixelRatio;
    Object.assign(this.canvas.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${size}px`, height: `${size}px` });
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    const context = this.getContext(this.canvas);
    context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    const isBlackOrientation = this.document.querySelector('.cg-wrap')?.classList.contains('orientation-black') ?? false;
    return { context, size, isBlackOrientation };
  }

  render(patterns) {
    if (!this.canvas) this.attach();
    const state = this.sync();
    if (!state || !state.context) return;
    const { context, size, isBlackOrientation } = state;
    context.clearRect(0, 0, size, size);
    for (const pattern of patterns) this._draw(pattern, context, size, isBlackOrientation);
  }

  clear() {
    const state = this.sync();
    if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
  }

  _draw(pattern, ctx, size, isBlackOrientation) {
    const color = patternColor(pattern.side, isBlackOrientation);
    const sq = size / 8;
    const center = (square) => boardLocalSquareCenter(square, size, isBlackOrientation);

    // glow ring on each involved square
    for (const square of pattern.squares) {
      const { x, y } = center(square);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, sq * 0.06);
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.35;
      const inset = sq * 0.12;
      ctx.strokeRect(x - sq / 2 + inset, y - sq / 2 + inset, sq - inset * 2, sq - inset * 2);
      ctx.restore();
    }

    // axis line
    if (pattern.line) {
      const a = center(pattern.line.from);
      const b = center(pattern.line.to);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, sq * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    // label near the first square
    const key = center(pattern.squares[0]);
    const fontPx = Math.max(9, Math.round(sq * 0.22));
    ctx.save();
    ctx.font = `600 ${fontPx}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = pattern.label;
    const w = ctx.measureText(text).width + fontPx * 0.7;
    const h = fontPx * 1.5;
    const ly = key.y - sq * 0.42;
    ctx.fillStyle = 'rgba(20,18,28,0.85)';
    ctx.beginPath();
    ctx.roundRect(key.x - w / 2, ly - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, key.x, ly);
    ctx.restore();
  }
}
