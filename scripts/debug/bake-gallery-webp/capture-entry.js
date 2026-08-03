// Deterministic capture harness for baking gallery tiles to animated WebP.
// Same code paths as the live overlay (ParticleFxRenderer / drawPatternFx), but
// stepped by an explicit virtual clock instead of requestAnimationFrame, so the
// baked frames are perfectly smooth no matter how slow toDataURL is.
// Bundled by bake.mjs via esbuild; not loaded by any production build.
import { ParticleFxRenderer } from '../../../src/particle-fx-renderer.js';
import { resolvePack } from '../../../src/packs.js';
import { Chess } from 'chess.js';
import { detectPatterns } from '../../../src/patterns.js';
import { boardLocalSquareCenter } from '../../../src/board-geometry.js';
import { drawPatternFx, PATTERN_THEMES } from '../../../src/pattern-art.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";

// Real lichess piece art (cburnett), loaded by bake.mjs as data URIs before any
// capture starts. Key 'wq', 'bk', ... — same art the live board shows, so the
// baked tiles match lichess instead of whatever unicode font the headless
// browser falls back to.
//
// Each entry also carries the sprite's alpha-weighted centroid offset as a
// FRACTION of the sprite box (measured once at load). cburnett pieces are
// base-heavy: drawn raw at the cell rect their pixel mass sits 4-12% of the
// cell BELOW the center. drawPiece() shifts by that fraction so the visual
// mass of every piece lands on the cell center (target: < 5% of the cell).
const SPRITES = {};

function measureCentroidFraction(img) {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, n, n);
  const { data } = ctx.getImageData(0, 0, n, n);
  let m = 0, mx = 0, my = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = data[(y * n + x) * 4 + 3];
      if (!a) continue;
      m += a; mx += a * (x + 0.5); my += a * (y + 0.5);
    }
  }
  return { fx: (mx / m - n / 2) / n, fy: (my / m - n / 2) / n };
}

window.__loadSprites = function (map) {
  return Promise.all(Object.entries(map).map(([key, dataUri]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { SPRITES[key] = { img, ...measureCentroidFraction(img) }; resolve(); };
    img.onerror = () => reject(new Error(`sprite ${key} failed to load`));
    img.src = dataUri;
  }))).then(() => Object.keys(SPRITES).length);
};

function spriteFor(color, type) {
  return SPRITES[`${color}${type}`]?.img || null;
}

function sq2cr(s) {
  return { col: s.charCodeAt(0) - 97, row: 8 - Number(s[1]) };
}

// Same realistic capture scenarios as gallery/preview.js once used live.
const SCENARIOS = [
  { context: [['k', 'g1', 'w'], ['p', 'f2', 'w'], ['p', 'g2', 'w'], ['p', 'h2', 'w'], ['k', 'g8', 'b'], ['p', 'f7', 'b'], ['p', 'g7', 'b'], ['p', 'h7', 'b']],
    attacker: { type: 'q', color: 'w' }, from: 'a1', to: 'a8', victim: { type: 'r', color: 'b' } },
  { context: [['k', 'g1', 'w'], ['p', 'f2', 'w'], ['p', 'g2', 'w'], ['p', 'h2', 'w'], ['k', 'g8', 'b'], ['p', 'f7', 'b'], ['p', 'g7', 'b'], ['p', 'h7', 'b']],
    attacker: { type: 'r', color: 'w' }, from: 'e1', to: 'e7', victim: { type: 'n', color: 'b' } },
  { context: [['k', 'g1', 'w'], ['p', 'f2', 'w'], ['p', 'g2', 'w'], ['k', 'g8', 'b'], ['p', 'f7', 'b'], ['p', 'g7', 'b']],
    attacker: { type: 'b', color: 'w' }, from: 'c1', to: 'h6', victim: { type: 'n', color: 'b' } },
  { context: [['k', 'g1', 'w'], ['p', 'd2', 'w'], ['p', 'f2', 'w'], ['k', 'g8', 'b'], ['p', 'd7', 'b'], ['p', 'f7', 'b']],
    attacker: { type: 'n', color: 'w' }, from: 'f3', to: 'e5', victim: { type: 'p', color: 'b' } },
  { context: [['k', 'g1', 'w'], ['p', 'f2', 'w'], ['p', 'g2', 'w'], ['k', 'g8', 'b'], ['p', 'f7', 'b'], ['p', 'g7', 'b']],
    attacker: { type: 'p', color: 'w' }, from: 'e4', to: 'd5', victim: { type: 'p', color: 'b' } }
];

const SLIDE_MS = 360;
const REST_MS = 700;

function pieceFont(ctx, sq) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${sq * 0.78}px ${GFONT}`;
  ctx.lineWidth = Math.max(1, sq * 0.02);
}

function drawGlyph(ctx, type, color, x, y) {
  ctx.fillStyle = color === 'w' ? '#f4f3ee' : '#2b2926';
  ctx.strokeStyle = color === 'w' ? '#403e39' : '#0d0c0a';
  ctx.strokeText(GLYPH[type], x, y);
  ctx.fillText(GLYPH[type], x, y);
}

// Draw a piece with its visual mass centered on (x, y) in a cell of `sq` px:
// the cburnett sprite at full cell size, shifted by its measured centroid
// fraction so the pixel centroid lands on the cell center. Unicode glyph only
// as emergency fallback if a sprite failed to load.
function drawPiece(ctx, type, color, x, y, sq) {
  const entry = SPRITES[`${color}${type}`];
  if (entry) {
    ctx.drawImage(entry.img, x - sq / 2 - entry.fx * sq, y - sq / 2 - entry.fy * sq, sq, sq);
    return;
  }
  pieceFont(ctx, sq);
  drawGlyph(ctx, type, color, x, y);
}

function drawWood(ctx, size) {
  const sq = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#ead9b6' : '#b07f55';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
}

// The animated tiles carry ONLY pieces + effects on a transparent canvas; the
// wood board ships separately as a lossless PNG (window.__renderBoard) that the
// gallery layers underneath via CSS. Keeping the static board out of the lossy
// WebP is what keeps it sharp.
function drawContextPieces(ctx, size, contextPieces) {
  const sq = size / 8;
  for (const [type, square, color] of contextPieces) {
    const { col, row } = sq2cr(square);
    drawPiece(ctx, type, color, (col + 0.5) * sq, (row + 0.5) * sq, sq);
  }
}

// Bare board (no pieces) for the static background layer. Both this PNG and the
// animated overlay are full-bleed 8x8 grids of the same square size, so the
// gallery can stretch both to the same box and stay grid-aligned.
window.__renderBoard = function ({ size }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  drawWood(canvas.getContext('2d'), size);
  return canvas.toDataURL('image/png');
};

// Alpha quantization before PNG export. img2webp compresses the alpha plane
// LOSSLESSLY per keyframe; raw particle glows produce near-continuous alpha
// noise that made transparent tiles ~2.5x heavier than the old opaque ones.
// Snapping alpha to 16-level steps (invisible over the board — verified
// side-by-side) halves the encoded size. Pixels below the cull threshold are
// fully cleared, near-opaque ones snap to 255 so pieces never shimmer.
const ALPHA_STEP = 16, ALPHA_CULL = 16, ALPHA_OPAQUE = 240;

function quantizeAlpha(canvas, ctx) {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    if (a === 0) continue;
    if (a < ALPHA_CULL) { d[i - 3] = 0; d[i - 2] = 0; d[i - 1] = 0; d[i] = 0; continue; }
    d[i] = a >= ALPHA_OPAQUE ? 255 : (a & ~(ALPHA_STEP - 1)) + ALPHA_STEP / 2;
  }
  ctx.putImageData(img, 0, 0);
}

function exportFrame(canvas, ctx) {
  quantizeAlpha(canvas, ctx);
  return canvas.toDataURL('image/png');
}

let state = null;
let patternState = null;

window.__initCapture = function ({ packId, size, scenarioIndices }) {
  const canvas = document.getElementById('cap');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const sq = size / 8;
  const cfg = resolvePack(packId);
  const renderer = new ParticleFxRenderer({
    mode: cfg.mode, routing: cfg.routing, fallback: cfg.fallback,
    intensity: 6, soundOn: false, buildupMs: 0,
    getPieceImage: (color, type) => spriteFor(color, type)
  });
  const list = (scenarioIndices && scenarioIndices.length)
    ? scenarioIndices.map((n) => SCENARIOS[n])
    : SCENARIOS;
  state = { canvas, ctx, size, sq, renderer, list, i: 0, now: 0, cycleStart: 0, fired: false };
  setupScenario();
  return { scenarios: list.length };
};

function setupScenario() {
  const s = state;
  s.sc = s.list[s.i % s.list.length];
  const from = sq2cr(s.sc.from);
  const to = sq2cr(s.sc.to);
  s.fx = (from.col + 0.5) * s.sq; s.fy = (from.row + 0.5) * s.sq;
  s.tx = (to.col + 0.5) * s.sq; s.ty = (to.row + 0.5) * s.sq;
  s.fired = false;
}

function fakeEvent() {
  const s = state;
  return {
    board: { size: s.size, squareSize: s.sq, orientation: 'white' },
    attacker: { piece: s.sc.attacker.type, color: s.sc.attacker.color, from: { square: s.sc.from, x: s.fx, y: s.fy }, to: { square: s.sc.to, x: s.tx, y: s.ty } },
    victim: { piece: s.sc.victim.type, color: s.sc.victim.color, at: { square: s.sc.to, x: s.tx, y: s.ty } },
    move: { san: 'x', ply: 1, isEnPassant: false },
    direction: { dx: Math.sign(s.tx - s.fx) || 1, dy: Math.sign(s.ty - s.fy) || -1, angleRad: Math.atan2(s.ty - s.fy, s.tx - s.fx) }
  };
}

// Advance virtual time by dt ms, draw the frame, report whether the full
// scenario cycle just wrapped (i.e. the next frame would equal frame 0).
window.__step = function (dt) {
  const s = state;
  s.now += dt;
  const t = s.now - s.cycleStart;
  s.ctx.clearRect(0, 0, s.size, s.size);
  drawContextPieces(s.ctx, s.size, s.sc.context);
  let cycleDone = false;

  if (t < SLIDE_MS) {
    drawPiece(s.ctx, s.sc.victim.type, s.sc.victim.color, s.tx, s.ty, s.sq);
    const p = t / SLIDE_MS;
    drawPiece(s.ctx, s.sc.attacker.type, s.sc.attacker.color, s.fx + (s.tx - s.fx) * p, s.fy + (s.ty - s.fy) * p, s.sq);
  } else {
    if (!s.fired) { s.renderer.play(fakeEvent(), s.now); s.fired = true; }
    drawPiece(s.ctx, s.sc.attacker.type, s.sc.attacker.color, s.tx, s.ty, s.sq);
    s.renderer.tick(s.now, s.ctx, s.size);
    if (t > SLIDE_MS + REST_MS && s.renderer.activeCount === 0) {
      s.cycleStart = s.now;
      s.i++;
      if (s.i % s.list.length === 0) cycleDone = true;
      setupScenario();
    }
  }
  return { cycleDone, frame: exportFrame(s.canvas, s.ctx) };
};

// Pattern-hint tile: static board + drawPatternFx, stepped by the virtual clock.
window.__initPatternCapture = function ({ fen, themeId, size }) {
  const canvas = document.getElementById('cap');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const board = new Chess(fen).board();
  const patterns = detectPatterns(board);
  const theme = PATTERN_THEMES.find((t) => t.id === themeId) || PATTERN_THEMES[0];

  // Transparent piece layer only — the wood board is the gallery's static
  // background PNG, not part of the animated frames.
  const bg = document.createElement('canvas');
  bg.width = size;
  bg.height = size;
  const bctx = bg.getContext('2d');
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const { x, y } = boardLocalSquareCenter(cell.square, size, false);
      drawPiece(bctx, cell.type, cell.color, x, y, size / 8);
    }
  }

  patternState = { canvas, ctx, bg, size, patterns, theme, now: 0 };
  return { patterns: patterns.length };
};

window.__stepPattern = function (dt) {
  const s = patternState;
  s.now += dt;
  s.ctx.clearRect(0, 0, s.size, s.size);
  s.ctx.drawImage(s.bg, 0, 0);
  for (const pattern of s.patterns) drawPatternFx(s.ctx, s.size, pattern, s.now, s.theme, false);
  return { frame: exportFrame(s.canvas, s.ctx) };
};

// Objective centering check: draw each piece alone on a transparent cell,
// compute the alpha-weighted centroid of its pixels, and report the offset
// from the geometric cell center in px and as % of the cell size.
// mode 'glyph' = the old unicode-text path, 'sprite' = the cburnett path.
window.__measureCentering = function ({ cell = 128 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = cell;
  canvas.height = cell;
  const ctx = canvas.getContext('2d');
  const results = [];
  for (const mode of ['glyph', 'sprite']) {
    for (const color of ['w', 'b']) {
      for (const type of ['k', 'q', 'r', 'b', 'n', 'p']) {
        ctx.clearRect(0, 0, cell, cell);
        if (mode === 'glyph') {
          pieceFont(ctx, cell);
          drawGlyph(ctx, type, color, cell / 2, cell / 2);
        } else {
          if (!spriteFor(color, type)) { results.push({ mode, piece: color + type, error: 'sprite missing' }); continue; }
          drawPiece(ctx, type, color, cell / 2, cell / 2, cell);
        }
        const { data } = ctx.getImageData(0, 0, cell, cell);
        let m = 0, mx = 0, my = 0;
        for (let y = 0; y < cell; y++) {
          for (let x = 0; x < cell; x++) {
            const a = data[(y * cell + x) * 4 + 3];
            if (!a) continue;
            m += a; mx += a * (x + 0.5); my += a * (y + 0.5);
          }
        }
        const cxOff = mx / m - cell / 2;
        const cyOff = my / m - cell / 2;
        results.push({
          mode, piece: color + type,
          dxPx: +cxOff.toFixed(2), dyPx: +cyOff.toFixed(2),
          dxPct: +(100 * cxOff / cell).toFixed(2), dyPct: +(100 * cyOff / cell).toFixed(2)
        });
      }
    }
  }
  return { cell, results };
};
