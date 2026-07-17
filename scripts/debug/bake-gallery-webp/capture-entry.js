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

function drawWood(ctx, size) {
  const sq = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#ead9b6' : '#b07f55';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
}

function drawBoard(ctx, size, contextPieces) {
  drawWood(ctx, size);
  const sq = size / 8;
  pieceFont(ctx, sq);
  for (const [type, square, color] of contextPieces) {
    const { col, row } = sq2cr(square);
    drawGlyph(ctx, type, color, (col + 0.5) * sq, (row + 0.5) * sq);
  }
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
    intensity: 6, soundOn: false, buildupMs: 0
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
  drawBoard(s.ctx, s.size, s.sc.context);
  pieceFont(s.ctx, s.sq);
  let cycleDone = false;

  if (t < SLIDE_MS) {
    drawGlyph(s.ctx, s.sc.victim.type, s.sc.victim.color, s.tx, s.ty);
    const p = t / SLIDE_MS;
    drawGlyph(s.ctx, s.sc.attacker.type, s.sc.attacker.color, s.fx + (s.tx - s.fx) * p, s.fy + (s.ty - s.fy) * p);
  } else {
    if (!s.fired) { s.renderer.play(fakeEvent(), s.now); s.fired = true; }
    drawGlyph(s.ctx, s.sc.attacker.type, s.sc.attacker.color, s.tx, s.ty);
    s.renderer.tick(s.now, s.ctx, s.size);
    if (t > SLIDE_MS + REST_MS && s.renderer.activeCount === 0) {
      s.cycleStart = s.now;
      s.i++;
      if (s.i % s.list.length === 0) cycleDone = true;
      setupScenario();
    }
  }
  return { cycleDone, frame: s.canvas.toDataURL('image/png') };
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

  const bg = document.createElement('canvas');
  bg.width = size;
  bg.height = size;
  const bctx = bg.getContext('2d');
  drawWood(bctx, size);
  pieceFont(bctx, size / 8);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const { x, y } = boardLocalSquareCenter(cell.square, size, false);
      bctx.fillStyle = cell.color === 'w' ? '#f4f3ee' : '#2b2926';
      bctx.strokeStyle = cell.color === 'w' ? '#403e39' : '#0d0c0a';
      bctx.strokeText(GLYPH[cell.type], x, y);
      bctx.fillText(GLYPH[cell.type], x, y);
    }
  }

  patternState = { canvas, ctx, bg, size, patterns, theme, now: 0 };
  return { patterns: patterns.length };
};

window.__stepPattern = function (dt) {
  const s = patternState;
  s.now += dt;
  s.ctx.drawImage(s.bg, 0, 0);
  for (const pattern of s.patterns) drawPatternFx(s.ctx, s.size, pattern, s.now, s.theme, false);
  return { frame: s.canvas.toDataURL('image/png') };
};
