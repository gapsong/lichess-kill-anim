import { CanvasOverlay } from './canvas-overlay.js';
import { CanvasSpriteRenderer } from './canvas-sprite-renderer.js';
import { CaptureEventStream } from './event-stream.js';
import { defaultAnimationPack } from './default-animation-pack.js';
import { createRenderEvent } from './render-event.js';
import { createCanvasSpriteDrawer } from './spritesheet.js';
import { readSnapshot } from './move-feed.js';

const PIECE_NAMES = {
  p: 'Bauer',
  n: 'Springer',
  b: 'Läufer',
  r: 'Turm',
  q: 'Dame',
  k: 'König'
};

const stream = new CaptureEventStream();
const overlay = new CanvasOverlay();

let renderer = null;
let frameRequest = null;
let currentContext = null;
let currentSize = 0;

function toast(text) {
  const old = document.getElementById('k-toast');
  if (old) old.remove();

  const element = document.createElement('div');
  element.id = 'k-toast';
  element.textContent = `${text} 💥`;

  Object.assign(element.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '99999',
    background: '#1a1a2e',
    color: '#ff6b6b',
    padding: '10px 20px',
    borderRadius: '8px',
    border: '2px solid #ff6b6b'
  });

  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2000);
}

function ensureRenderer() {
  overlay.attach();
  const state = overlay.sync();

  if (!state?.context) return null;

  currentContext = state.context;
  currentSize = state.size;

  if (!renderer) {
    renderer = new CanvasSpriteRenderer({
      pack: defaultAnimationPack,
      drawSprite: createCanvasSpriteDrawer({
        context: currentContext,
        pack: defaultAnimationPack
      })
    });
  }

  return state;
}

function renderCapture(event, snapshotId) {
  const state = ensureRenderer();
  if (!state || !renderer) return;

  const renderEvent = createRenderEvent(
    event,
    {
      size: state.size,
      isBlackOrientation: state.isBlackOrientation
    },
    snapshotId
  );

  toast(`${PIECE_NAMES[event.movingPiece] || 'Figur'} schlägt`);
  renderer.play(renderEvent);
  startFrameLoop();
}

function startFrameLoop() {
  if (frameRequest) return;

  frameRequest = requestAnimationFrame(frame);
}

function frame(nowMs) {
  frameRequest = null;

  const state = overlay.sync();
  if (state?.context) {
    currentContext = state.context;
    currentSize = state.size;
  }

  currentContext?.clearRect(0, 0, currentSize, currentSize);
  renderer?.tick(nowMs);

  if (renderer?.activeCount) {
    frameRequest = requestAnimationFrame(frame);
  }
}

function scan() {
  const snapshot = readSnapshot(document, location);
  const events = stream.next(snapshot);

  events.forEach((event) => renderCapture(event, snapshot.id));
}

const observer = new MutationObserver(scan);

observer.observe(document.body, {
  childList: true,
  subtree: true
});

scan();
