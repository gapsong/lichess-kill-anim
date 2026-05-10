export class CanvasOverlay {
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

    this.canvas = this.document.getElementById('lichess-kill-overlay');

    if (!this.canvas) {
      this.canvas = this.document.createElement('canvas');
      this.canvas.id = 'lichess-kill-overlay';
      Object.assign(this.canvas.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '99998'
      });
      this.document.body.appendChild(this.canvas);
    }

    if (this.ResizeObserver && !this.resizeObserver) {
      this.resizeObserver = new this.ResizeObserver(() => this.sync());
      this.resizeObserver.observe(this.board);
    }

    this.sync();
    return this.canvas;
  }

  sync() {
    if (!this.board) {
      this.board = this.document.querySelector('cg-board');
    }

    if (!this.board || !this.canvas) return null;

    const rect = this.board.getBoundingClientRect();
    const size = rect.width;
    const dpr = this.devicePixelRatio;

    Object.assign(this.canvas.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${size}px`,
      height: `${size}px`
    });

    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);

    const context = this.getContext(this.canvas);
    context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);

    return {
      canvas: this.canvas,
      context,
      size,
      squareSize: size / 8,
      isBlackOrientation: this.document
        .querySelector('.cg-wrap')
        ?.classList
        .contains('orientation-black') ?? false
    };
  }
}
