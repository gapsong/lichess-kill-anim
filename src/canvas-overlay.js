export class CanvasOverlay {
  constructor({
    document = globalThis.document,
    devicePixelRatio = globalThis.devicePixelRatio ?? 1,
    ResizeObserver = globalThis.ResizeObserver,
    getContext = (canvas) => canvas.getContext?.('2d'),
    // Distinct id/zIndex let more than one board-local layer coexist (e.g. the
    // kill-animation canvas and the static undefended-marker canvas).
    id = 'lichess-kill-overlay',
    zIndex = '3',
    // Fired after every sync() with the fresh state. A static layer uses this to
    // repaint on ResizeObserver-driven syncs (flip/resize) without polling.
    onSync = null
  } = {}) {
    this.document = document;
    this.devicePixelRatio = devicePixelRatio;
    this.ResizeObserver = ResizeObserver;
    this.getContext = getContext;
    this.id = id;
    this.zIndex = zIndex;
    this.onSync = onSync;
    this.canvas = null;
    this.board = null;
    this.resizeObserver = null;
  }

  attach() {
    if (!this._ensureBoard()) return null;

    this.canvas = this.document.getElementById(this.id);

    if (!this.canvas) {
      this.canvas = this.document.createElement('canvas');
      this.canvas.id = this.id;
      Object.assign(this.canvas.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        pointerEvents: 'none',
        zIndex: this.zIndex
      });
    }

    this.sync();
    return this.canvas;
  }

  // (Re)acquires cg-board. Lichess recreates the element on board flips,
  // resizes and SPA navigation — a cached detached node reports a 0x0 rect and
  // would silently collapse the overlay, so always check isConnected.
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

    // Mount the canvas next to cg-board inside its container so it inherits the
    // board's exact position through scrolling, zooming and layout changes.
    // (cg-container is position:absolute and coincides with cg-board.)
    const container = board.parentElement;
    if (container && this.canvas.parentElement !== container) {
      container.appendChild(this.canvas);
    }

    const rect = board.getBoundingClientRect();
    const size = rect.width;
    const dpr = this.devicePixelRatio;

    Object.assign(this.canvas.style, {
      left: `${board.offsetLeft || 0}px`,
      top: `${board.offsetTop || 0}px`,
      width: `${size}px`,
      height: `${size}px`
    });

    const bufferSize = Math.round(size * dpr);
    if (this.canvas.width !== bufferSize) this.canvas.width = bufferSize;
    if (this.canvas.height !== bufferSize) this.canvas.height = bufferSize;

    const context = this.getContext(this.canvas);
    context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);

    const state = {
      canvas: this.canvas,
      context,
      size,
      squareSize: size / 8,
      isBlackOrientation: this.document
        .querySelector('.cg-wrap')
        ?.classList
        .contains('orientation-black') ?? false
    };

    this.onSync?.(state);
    return state;
  }
}
