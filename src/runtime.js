import { shakeElement } from './board-shake.js';
import { CanvasOverlay } from './canvas-overlay.js';
import { CaptureEventStream } from './event-stream.js';
import { createRenderEvent } from './render-event.js';
import { ParticleFxRenderer } from './particle-fx-renderer.js';
import { readSnapshot } from './move-feed.js';
import { resolvePack } from './packs.js';

const PIECE_NAMES = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };

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
    padding: '10px 20px', borderRadius: '8px', border: '2px solid #ff6b6b'
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
  notify
} = {}) {
  const settings = { ...config, shakePieces: [...(config?.shakePieces ?? [])] };
  const emit = notify || ((text) => domToast(doc, text));
  let renderer = null;
  let frameRequest = null;
  let currentContext = null;
  let currentSize = 0;
  let observer = null;

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
    emit(`${PIECE_NAMES[event.movingPiece] || 'Figur'} schlägt`);
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

  function scan() {
    const snapshot = readSnapshotFn(doc, loc);
    const events = stream.next(snapshot);
    events.forEach((event) => renderCapture(event, snapshot?.id));
  }

  function start() {
    if (doc) {
      observer = observerFactory(scan);
      observer.observe(doc.body, { childList: true, subtree: true });
    }
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
