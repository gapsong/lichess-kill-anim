import { ParticleFxRenderer } from '../src/particle-fx-renderer.js';
import { resolvePack } from '../src/packs.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";

// 'e4' -> { col, row } with white at the bottom (rank 1 = row 7).
function sq2cr(s) {
  return { col: s.charCodeAt(0) - 97, row: 8 - Number(s[1]) };
}

// Realistic, legal capture situations. `context` is the rest of the position
// (kings + pawns) so the board reads as a real game; the attacker captures the
// victim on `to`. The attacker piece drives the signature/theme effect, so the
// set spans queen/rook/bishop/knight/pawn captures for variety.
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

function drawBoard(ctx, size, contextPieces) {
  const sq = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#ead9b6' : '#b07f55';
      ctx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
  pieceFont(ctx, sq);
  for (const [type, square, color] of contextPieces) {
    const { col, row } = sq2cr(square);
    drawGlyph(ctx, type, color, (col + 0.5) * sq, (row + 0.5) * sq);
  }
}

// Startet eine Endlos-Vorschau eines Packs auf einem Canvas. Gibt eine stop()-Funktion zurück.
export function startPreview(canvas, packId) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const sq = size / 8;
  const cfg = resolvePack(packId);
  const renderer = new ParticleFxRenderer({
    mode: cfg.mode, routing: cfg.routing, fallback: cfg.fallback,
    intensity: 6, soundOn: false, buildupMs: 0
  });

  const SLIDE_MS = 360;   // attacker glide onto the victim square
  const REST_MS = 850;    // hold the resolved position before the next capture

  let raf = null;
  let stopped = false;
  let i = 0;
  let cycleStart = null;
  let last = 0;
  let sc, from, to, tx, ty, fx, fy, fired;

  function setup() {
    sc = SCENARIOS[i % SCENARIOS.length];
    from = sq2cr(sc.from);
    to = sq2cr(sc.to);
    fx = (from.col + 0.5) * sq; fy = (from.row + 0.5) * sq;
    tx = (to.col + 0.5) * sq; ty = (to.row + 0.5) * sq;
    fired = false;
    i++;
  }

  function fakeEvent() {
    return {
      board: { size, squareSize: sq, orientation: 'white' },
      attacker: { piece: sc.attacker.type, color: sc.attacker.color, from: { square: sc.from, x: fx, y: fy }, to: { square: sc.to, x: tx, y: ty } },
      victim: { piece: sc.victim.type, color: sc.victim.color, at: { square: sc.to, x: tx, y: ty } },
      move: { san: 'x', ply: 1, isEnPassant: false },
      direction: { dx: Math.sign(tx - fx) || 1, dy: Math.sign(ty - fy) || -1, angleRad: Math.atan2(ty - fy, tx - fx) }
    };
  }

  function loop(now) {
    raf = stopped ? null : requestAnimationFrame(loop);
    if (now - last < 32) return; // cap to ~30fps
    last = now;
    if (cycleStart == null) cycleStart = now;
    const t = now - cycleStart;
    drawBoard(ctx, size, sc.context);
    pieceFont(ctx, sq);

    if (t < SLIDE_MS) {
      // attacker slides in; victim still sits on the target square
      drawGlyph(ctx, sc.victim.type, sc.victim.color, tx, ty);
      const p = t / SLIDE_MS;
      drawGlyph(ctx, sc.attacker.type, sc.attacker.color, fx + (tx - fx) * p, fy + (ty - fy) * p);
    } else {
      // impact + resolved: attacker holds the square, the effect destroys the victim on top
      if (!fired) { renderer.play(fakeEvent(), now); fired = true; }
      drawGlyph(ctx, sc.attacker.type, sc.attacker.color, tx, ty);
      renderer.tick(now, ctx, size);
      if (t > SLIDE_MS + REST_MS && renderer.activeCount === 0) {
        cycleStart = now;
        setup();
      }
    }
  }

  setup();
  raf = requestAnimationFrame(loop);
  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
  };
}
