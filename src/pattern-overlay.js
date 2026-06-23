import { drawPatternFx, PATTERN_THEMES } from './pattern-art.js';

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
    getContext = (canvas) => canvas.getContext?.('2d'),
    theme = PATTERN_THEMES[0]
  } = {}) {
    this.document = document;
    this.devicePixelRatio = devicePixelRatio;
    this.ResizeObserver = ResizeObserver;
    this.getContext = getContext;
    this.theme = theme;
    this.canvas = null;
    this.board = null;
    this.resizeObserver = null;
    this.patterns = [];
    this.raf = null;
    this.last = 0;
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

  // Persist the current patterns and animate them on the overlay until they
  // change or the overlay is cleared. Called on each position change.
  render(patterns) {
    this.patterns = patterns || [];
    if (!this.canvas) this.attach();
    if (this.patterns.length === 0) {
      this._stop();
      this.clear();
      return;
    }
    this._start();
  }

  clear() {
    this._stop();
    const state = this.sync();
    if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
  }

  _start() {
    if (this.raf != null) return;
    const raf = globalThis.requestAnimationFrame;
    if (!raf) { this._frame(0); return; }
    const tick = (now) => {
      this.raf = raf(tick);
      if (now - this.last < 32) return; // cap to ~30fps
      this.last = now;
      this._frame(now);
    };
    this.raf = raf(tick);
  }

  _stop() {
    if (this.raf != null && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  _frame(now) {
    const state = this.sync();
    if (!state || !state.context) return;
    const { context, size, isBlackOrientation } = state;
    context.clearRect(0, 0, size, size);
    for (const pattern of this.patterns) {
      drawPatternFx(context, size, pattern, now, this.theme, isBlackOrientation);
    }
  }
}
