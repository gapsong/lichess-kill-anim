import { drawPatternFx, PATTERN_THEMES } from './pattern-art.js';

const GREEN = '#3bd17a';
const RED = '#e5564b';

export function patternColor(side, isBlackOrientation) {
  const bottomSide = isBlackOrientation ? 'b' : 'w';
  return side === bottomSide ? GREEN : RED;
}

// "Connections" (battery, connected/doubled rooks) and "state" (outpost) hints play
// one strong intro pulse the moment they first appear, then settle to a faint,
// low-opacity resting state for as long as the pattern stays on the board. Every
// other pattern keeps looping at full strength (unchanged).
const FADE_LIFECYCLE_TYPES = new Set(['battery', 'rooks', 'outpost']);
const INTRO_MS = 900;
const STEADY_FADE = 0.16;

function patternKey(pattern) {
  return `${pattern.type}|${pattern.side}|${pattern.squares.join(',')}`;
}

export class PatternOverlay {
  constructor({
    document = globalThis.document,
    devicePixelRatio = globalThis.devicePixelRatio ?? 1,
    ResizeObserver = globalThis.ResizeObserver,
    getContext = (canvas) => canvas.getContext?.('2d'),
    theme = PATTERN_THEMES[0],
    now = () => (globalThis.performance?.now?.() ?? Date.now())
  } = {}) {
    this.document = document;
    this.devicePixelRatio = devicePixelRatio;
    this.ResizeObserver = ResizeObserver;
    this.getContext = getContext;
    this.theme = theme;
    this.now = now;
    this.canvas = null;
    this.board = null;
    this.resizeObserver = null;
    this.patterns = [];
    this.firstSeen = new Map();
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
    const liveKeys = new Set(this.patterns.map(patternKey));
    for (const key of this.firstSeen.keys()) {
      if (!liveKeys.has(key)) this.firstSeen.delete(key); // resolved -> next appearance is a fresh intro
    }
    const now = this.now();
    for (const pattern of this.patterns) {
      const key = patternKey(pattern);
      if (!this.firstSeen.has(key)) this.firstSeen.set(key, now);
    }
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
    this.firstSeen.clear();
    const state = this.sync();
    if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
  }

  // 1 during a fade-lifecycle pattern's one-time intro pulse, STEADY_FADE once it
  // has settled; always 1 for patterns outside the fade lifecycle.
  fadeFor(pattern, atMs) {
    if (!FADE_LIFECYCLE_TYPES.has(pattern.type)) return 1;
    const firstSeenAt = this.firstSeen.get(patternKey(pattern));
    if (firstSeenAt == null) return 1;
    return (atMs - firstSeenAt) < INTRO_MS ? 1 : STEADY_FADE;
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
      drawPatternFx(context, size, pattern, now, this.theme, isBlackOrientation, this.fadeFor(pattern, now));
    }
  }
}
