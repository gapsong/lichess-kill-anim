import { shakeElement } from './board-shake.js';
import { CanvasOverlay } from './canvas-overlay.js';
import { CaptureEventStream } from './event-stream.js';
import { createRenderEvent } from './render-event.js';
import { ParticleFxRenderer } from './particle-fx-renderer.js';
import { readSnapshot } from './move-feed.js';
import { resolvePack } from './packs.js';
import { derivePosition } from './chess-state.js';
import { detectPatterns } from './patterns.js';
import { PatternOverlay } from './pattern-overlay.js';
import { PieceSprites } from './piece-sprites.js';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

function domToast(doc, text) {
  if (!doc) return;
  const old = doc.getElementById('k-toast');
  if (old) old.remove();
  const element = doc.createElement('div');
  element.id = 'k-toast';
  element.textContent = `${text} 💥`;
  Object.assign(element.style, {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '99999', background: '#1a1a2e', color: '#ff6b6b',
    padding: '10px 20px', borderRadius: '8px', border: '2px solid #ff6b6b',
    pointerEvents: 'none'
  });
  doc.body.appendChild(element);
  setTimeout(() => element.remove(), 2000);
}

export function createRuntime({
  config,
  createRenderer = (opts) => new ParticleFxRenderer(opts),
  overlay = new CanvasOverlay(),
  stream = new CaptureEventStream(),
  readSnapshotFn = readSnapshot,
  schedule = (cb) => requestAnimationFrame(cb),
  cancel = (id) => cancelAnimationFrame(id),
  doc = (typeof document !== 'undefined' ? document : null),
  loc = (typeof location !== 'undefined' ? location : null),
  observerFactory = (cb) => new MutationObserver(cb),
  patternOverlay = new PatternOverlay(),
  pieceSprites = null,
  derivePositionFn = derivePosition,
  detectPatternsFn = detectPatterns,
  notify
} = {}) {
  const settings = { ...config, shakePieces: [...(config?.shakePieces ?? [])] };
  const emit = notify || ((text) => domToast(doc, text));
  let renderer = null;
  let frameRequest = null;
  let currentContext = null;
  let currentSize = 0;
  let observer = null;
  let lastPatternSig = null;
  let lastSnapshot = null;
  const sprites = pieceSprites ?? (doc ? new PieceSprites({ document: doc }) : null);

  function ensureRenderer() {
    overlay.attach();
    const state = overlay.sync();
    if (!state?.context) return null;
    currentContext = state.context;
    currentSize = state.size;
    if (!renderer) {
      const packConfig = resolvePack(settings.packId);
      renderer = createRenderer({
        mode: packConfig.mode,
        routing: packConfig.routing,
        fallback: packConfig.fallback,
        intensity: settings.intensity,
        soundOn: settings.soundOn,
        buildupMs: settings.buildupMs,
        getPieceImage: (color, type) => sprites?.get(color, type) ?? null,
        onImpact: (renderEvent, opts) => {
          if (overlay.board && settings.shakePieces.includes(renderEvent?.attacker?.piece)) {
            shakeElement(overlay.board, {
              amplitude: opts?.amplitude ?? 3,
              durationMs: opts?.durationMs ?? 160
            });
          }
        }
      });
    }
    return state;
  }

  function renderCapture(event, snapshotId) {
    if (!settings.enabled) return;
    const state = ensureRenderer();
    if (!state || !renderer) return;
    const renderEvent = createRenderEvent(
      event,
      { size: state.size, isBlackOrientation: state.isBlackOrientation },
      snapshotId
    );
    emit(`${PIECE_NAMES[event.movingPiece] || 'Piece'} captures`);
    renderer.play(renderEvent);
    startFrameLoop();
  }

  function startFrameLoop() {
    if (frameRequest != null) return;
    frameRequest = schedule(frame);
  }

  function frame(nowMs) {
    frameRequest = null;
    const state = overlay.sync();
    if (state?.context) { currentContext = state.context; currentSize = state.size; }
    currentContext?.clearRect(0, 0, currentSize, currentSize);
    renderer?.tick(nowMs, currentContext, currentSize);
    if (renderer?.activeCount) frameRequest = schedule(frame);
  }

  // Includes activePly so browsing backward through an already-loaded analysis
  // game (same snapshot.id, same move count, only the active move changes)
  // still recomputes patterns instead of leaving a resolved hint on screen.
  function patternSig(snapshot) {
    if (!snapshot) return null;
    const moves = snapshot.sanMoves || [];
    const ply = snapshot.activePly ?? moves.length;
    return `${snapshot.id}|${ply}|${moves[ply - 1] || ''}`;
  }

  // TODO(before release): gate pattern hints to NON-ranked pages only. Tactical hints count
  // as "outside assistance" under chess.com/Lichess fair-play rules and must be OFF in
  // ranked/live games (allowed on analysis boards, puzzles, review). Kept ON now for the dev
  // phase — deliberate temporary state. See the fair-play note at the top of AGENTS.md.
  function renderPatterns(snapshot, force) {
    if (!settings.patternsOn) {
      patternOverlay.clear();
      lastPatternSig = null;
      return;
    }
    const sig = patternSig(snapshot);
    if (!force && sig === lastPatternSig) return;
    lastPatternSig = sig;
    if (!snapshot) {
      patternOverlay.clear();
      return;
    }
    const { board } = derivePositionFn(snapshot);
    patternOverlay.render(detectPatternsFn(board));
  }

  function scan() {
    const snapshot = readSnapshotFn(doc, loc);
    lastSnapshot = snapshot;
    const events = stream.next(snapshot);
    events.forEach((event) => renderCapture(event, snapshot?.id));
    renderPatterns(snapshot, false);
  }

  function start() {
    if (doc) {
      observer = observerFactory(scan);
      observer.observe(doc.body, { childList: true, subtree: true });
    }
    // Preload the active piece-set images so the first capture animation
    // already renders the real lichess pieces instead of the glyph fallback.
    sprites?.warm();
    scan();
  }

  function applyConfig(partial) {
    Object.assign(settings, partial);
    if (partial && Array.isArray(partial.shakePieces)) settings.shakePieces = [...partial.shakePieces];
    if (renderer) {
      const packConfig = resolvePack(settings.packId);
      renderer.mode = packConfig.mode;
      renderer.routing = packConfig.routing;
      renderer.fallback = packConfig.fallback;
      renderer.intensity = Math.max(1, Math.min(10, settings.intensity));
      renderer.soundOn = settings.soundOn;
      renderer.buildupMs = settings.buildupMs;
    }
    if (partial && 'patternsOn' in partial) {
      renderPatterns(lastSnapshot, true);
    }
  }

  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    if (frameRequest != null) { cancel(frameRequest); frameRequest = null; }
  }

  return {
    start,
    stop,
    applyConfig,
    get renderer() { return renderer; },
    get settings() { return settings; }
  };
}
