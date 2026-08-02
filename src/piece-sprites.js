// piece-sprites.js
// Resolves the user's ACTIVE lichess piece-set images so kill animations can
// render the exact same piece art as the board (instead of a unicode glyph).
//
// Lichess styles pieces via CSS: `piece.white.knight { background-image: url(...) }`
// scoped to the board wrapper, and the concrete URL depends on the user's chosen
// piece set. To read it without knowing the set, we append a hidden probe
// `<piece class="white knight">` element INSIDE the live cg-board (so every
// ancestor-scoped selector applies), read its computed background-image, and
// remove it again. This works even for piece types not currently on the board.
//
// Images load asynchronously; `get()` returns null until an image is ready (or
// permanently if resolution failed), and callers fall back to the glyph art.

const TYPE_CLASS = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const COLOR_CLASS = { w: 'white', b: 'black' };

export function extractCssUrl(backgroundImage) {
  if (typeof backgroundImage !== 'string') return null;
  const match = backgroundImage.match(/url\((['"]?)(.+?)\1\)/);
  return match ? match[2] : null;
}

export class PieceSprites {
  constructor({
    document = globalThis.document,
    getComputedStyle = (el) => globalThis.getComputedStyle(el),
    createImage = () => new globalThis.Image()
  } = {}) {
    this.document = document;
    this.getComputedStyle = getComputedStyle;
    this.createImage = createImage;
    this.cache = new Map(); // 'wq' -> { image, ready } | null (resolution failed)
  }

  // Preload all 12 piece images so the first capture already has them.
  warm() {
    for (const color of Object.keys(COLOR_CLASS)) {
      for (const type of Object.keys(TYPE_CLASS)) this._resolve(color, type);
    }
  }

  // Returns a drawable image for the piece, or null (not loaded yet / failed).
  get(color, type) {
    const entry = this._resolve(color, type);
    return entry && entry.ready ? entry.image : null;
  }

  _resolve(color, type) {
    const key = `${color}${type}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const url = this._probeUrl(color, type);
    if (!url) {
      // Board not present yet — retry on a later call instead of caching failure.
      if (this.document?.querySelector?.('cg-board')) this.cache.set(key, null);
      return null;
    }
    const entry = { image: this.createImage(), ready: false };
    entry.image.onload = () => { entry.ready = true; };
    entry.image.onerror = () => { this.cache.set(key, null); };
    entry.image.src = url;
    this.cache.set(key, entry);
    return entry;
  }

  _probeUrl(color, type) {
    const doc = this.document;
    const host = doc?.querySelector?.('cg-board') || doc?.querySelector?.('.cg-wrap');
    if (!host) return null;
    const probe = doc.createElement('piece');
    probe.className = `${COLOR_CLASS[color] || 'black'} ${TYPE_CLASS[type] || 'pawn'}`;
    Object.assign(probe.style, { visibility: 'hidden', pointerEvents: 'none' });
    host.appendChild(probe);
    let url = null;
    try {
      url = extractCssUrl(this.getComputedStyle(probe)?.backgroundImage);
    } finally {
      probe.remove();
    }
    return url;
  }
}
