import { ParticleFxRenderer } from '../src/particle-fx-renderer.js';
import { resolvePack } from '../src/packs.js';

const CYCLE_PIECES = ['q', 'r', 'b', 'n', 'p'];

// Startet eine Endlos-Vorschau eines Packs auf einem Canvas. Gibt eine stop()-Funktion zurück.
export function startPreview(canvas, packId) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cfg = resolvePack(packId);
  const renderer = new ParticleFxRenderer({
    mode: cfg.mode, routing: cfg.routing, fallback: cfg.fallback,
    intensity: 6, soundOn: false, buildupMs: 0
  });

  let raf = null;
  let timer = null;
  let i = 0;
  let stopped = false;

  function fakeEvent(piece) {
    const sq = size / 8;
    const cx = size / 2, cy = size / 2;
    return {
      board: { size, squareSize: sq, orientation: 'white' },
      attacker: { piece, color: 'w', from: { square: 'a1', x: sq * 0.5, y: size - sq * 0.5 }, to: { square: 'e5', x: cx, y: cy } },
      victim: { piece: 'p', color: 'b', at: { square: 'e5', x: cx, y: cy } },
      move: { san: 'x', ply: 1, isEnPassant: false },
      direction: { dx: 1, dy: -1, angleRad: -0.785 }
    };
  }

  function frame(now) {
    raf = null;
    ctx.clearRect(0, 0, size, size);
    renderer.tick(now, ctx, size);
    if (!stopped && renderer.activeCount) raf = requestAnimationFrame(frame);
  }

  function fire() {
    if (stopped) return;
    renderer.play(fakeEvent(CYCLE_PIECES[i % CYCLE_PIECES.length]), performance.now());
    i++;
    if (!raf) raf = requestAnimationFrame(frame);
    timer = setTimeout(fire, 1400);
  }

  fire();
  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
  };
}
