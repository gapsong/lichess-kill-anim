import { drawPatternFx, PATTERN_THEMES } from './pattern-art.js';

const GREEN = '#3bd17a';
const RED = '#e5564b';

export function patternColor(side, isBlackOrientation) {
  const bottomSide = isBlackOrientation ? 'b' : 'w';
  return side === bottomSide ? GREEN : RED;
}

// EVERY pattern hint blinks ONCE the moment it first appears — full strength for a
// beat, then it eases out to fully OFF (opacity 0) and stays off for as long as the
// pattern remains on the board. A pattern that resolves and later reappears gets a
// fresh blink. PatternOverlay tracks each pattern's first-seen time (firstSeen) and
// applies the resulting opacity uniformly at render time (see _frame / scaleAlpha),
// so no individual draw routine needs to know about the lifecycle.
const HOLD_MS = 900;   // full strength for this long, then
const BLINK_MS = 1200; // eased down to 0 by here — after this the hint is fully off.

function patternKey(pattern) {
  return `${pattern.type}|${pattern.side}|${pattern.squares.join(',')}`;
}

// Wraps a 2D context so every `globalAlpha = x` assignment becomes `x * fade`,
// leaving all other drawing calls (geometry, styles, methods) untouched. Canvas
// globalAlpha is an absolute value, so this proxy is the single place that turns a
// pattern's many per-element opacities into one uniformly dimmed layer during its
// faint resting state — no draw routine has to thread `fade` through by hand.
function scaleAlpha(ctx, fade) {
  return new Proxy(ctx, {
    get(target, prop) {
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      target[prop] = prop === 'globalAlpha' ? value * fade : value;
      return true;
    }
  });
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
    if (!this._ensureBoard()) return null;
    this.canvas = this.document.getElementById('lichess-pattern-overlay');
    if (!this.canvas) {
      this.canvas = this.document.createElement('canvas');
      this.canvas.id = 'lichess-pattern-overlay';
      Object.assign(this.canvas.style, { position: 'absolute', left: '0px', top: '0px', pointerEvents: 'none', zIndex: '2' });
    }
    this.sync();
    return this.canvas;
  }

  // Same stale-node guard as CanvasOverlay: lichess recreates cg-board on
  // flips/resizes/SPA navigation, and a detached node reports a 0x0 rect.
  _ensureBoard() {
    if (this.board && this.board.isConnected !== false) return this.board;
    const board = this.document.querySelector('cg-board');
    if (!board) return null;
    this.board = board;
    if (this.ResizeObserver) {
      this.resizeObserver?.disconnect();
      this.resizeObserver = new this.ResizeObserver(() => this.sync());
      this.resizeObserver.observe(board);
    }
    return board;
  }

  sync() {
    const board = this._ensureBoard();
    if (!board || !this.canvas) return null;
    // Board-local mount: the canvas lives beside cg-board in its container and
    // tracks the board through scrolling, zooming and layout changes.
    const container = board.parentElement;
    if (container && this.canvas.parentElement !== container) container.appendChild(this.canvas);
    const rect = board.getBoundingClientRect();
    const size = rect.width;
    const dpr = this.devicePixelRatio;
    Object.assign(this.canvas.style, { left: `${board.offsetLeft || 0}px`, top: `${board.offsetTop || 0}px`, width: `${size}px`, height: `${size}px` });
    const bufferSize = Math.round(size * dpr);
    if (this.canvas.width !== bufferSize) this.canvas.width = bufferSize;
    if (this.canvas.height !== bufferSize) this.canvas.height = bufferSize;
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
    // Run the rAF loop only while a hint is still blinking. Once every hint has
    // blinked out, the loop stops and stays stopped (no idle 30fps redraws) until a
    // fresh pattern arrives — this is what keeps the overlay off Lichess's back.
    if (this.patterns.some((p) => this.fadeFor(p, now) > 0)) {
      this._start();
    } else if (this.raf == null) {
      this._frame(now); // draw the final (empty) frame once; no loop
    }
  }

  clear() {
    this._stop();
    this.firstSeen.clear();
    const state = this.sync();
    if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
  }

  // One blink: full through HOLD_MS, eased to 0 by BLINK_MS, then off (0).
  // Applies to every pattern type — the universal pop-then-faint lifecycle.
  fadeFor(pattern, atMs) {
    const firstSeenAt = this.firstSeen.get(patternKey(pattern));
    if (firstSeenAt == null) return 1;
    const t = atMs - firstSeenAt;
    if (t >= BLINK_MS) return 0;   // one blink, then fully off
    if (t <= HOLD_MS) return 1;    // full strength during the blink
    return 1 - (t - HOLD_MS) / (BLINK_MS - HOLD_MS); // ease out to 0
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
    let anyVisible = false;
    for (const pattern of this.patterns) {
      const fade = this.fadeFor(pattern, now);
      if (fade <= 0) continue; // finished blinking — nothing to draw
      anyVisible = true;
      // scaleAlpha dims every explicit globalAlpha the routine sets, so the whole
      // hint fades uniformly as it blinks out.
      context.globalAlpha = fade;
      const ctx = fade < 1 ? scaleAlpha(context, fade) : context;
      drawPatternFx(ctx, size, pattern, now, this.theme, isBlackOrientation);
    }
    context.globalAlpha = 1;
    if (!anyVisible) this._stop(); // all hints blinked out — stop the idle loop
  }
}
