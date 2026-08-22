import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { createRuntime } from '../src/runtime.js';
import { DEFAULT_SETTINGS } from '../src/settings.js';

function setupDoc() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.MutationObserver = dom.window.MutationObserver;
  return dom.window.document;
}

const captureEvent = {
  from: 'e4', to: 'd5', capturedAt: 'd5', ply: 3, san: 'exd5',
  movingPiece: 'p', movingColor: 'w', capturedPiece: 'p', capturedColor: 'b', isEnPassant: false
};

function fakeOverlay() {
  return {
    board: { dummy: true },
    attach() {},
    sync() { return { context: { clearRect() {} }, size: 640, isBlackOrientation: false }; }
  };
}

function baseOpts(doc, overrides = {}) {
  return {
    config: { ...DEFAULT_SETTINGS },
    overlay: fakeOverlay(),
    stream: { next: () => [captureEvent] },
    readSnapshotFn: () => ({ id: 's1', sanMoves: ['e4'] }),
    schedule: () => 0,
    cancel() {},
    notify() {},
    doc,
    loc: {},
    ...overrides
  };
}

test('captures are suppressed when enabled is false', () => {
  const doc = setupDoc();
  const played = [];
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, enabled: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play: (re) => played.push(re), tick() {} })
  }));
  rt.start();
  assert.equal(played.length, 0);
});

test('captures play when enabled', () => {
  const doc = setupDoc();
  const played = [];
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play: (re) => played.push(re), tick() {} })
  }));
  rt.start();
  assert.equal(played.length, 1);
});

test('applyConfig resolves packId into the renderer (mode/routing/fallback)', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  assert.equal(renderer.mode, 'signature');
  assert.equal(renderer.routing, null);
  rt.applyConfig({ packId: 'inferno', intensity: 3, soundOn: false, buildupMs: 680 });
  assert.equal(renderer.mode, 'inferno');
  assert.equal(renderer.routing, null);
  assert.equal(renderer.intensity, 3);
  assert.equal(renderer.soundOn, false);
  assert.equal(renderer.buildupMs, 680);
});

test('applyConfig resolves a theme packId into routing', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  rt.applyConfig({ packId: 'fire' });
  assert.equal(renderer.mode, 'signature');
  assert.equal(renderer.routing.q, 'inferno');
  assert.equal(renderer.fallback, 'inferno');
});

test('stop disconnects the observer and cancels a pending frame', () => {
  const doc = setupDoc();
  const cancelled = [];
  let disconnects = 0;
  const fakeObserver = { observe() {}, disconnect() { disconnects++; } };
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => ({ ...opts, activeCount: 1, play() {}, tick() {} }),
    observerFactory: () => fakeObserver,
    schedule: () => 123,
    cancel: (id) => cancelled.push(id)
  }));
  rt.start();
  rt.stop();
  assert.equal(disconnects, 1);
  assert.deepEqual(cancelled, [123]);
});

function spyLayer() {
  return {
    rendered: [],
    cleared: 0,
    render(pieces) { this.rendered.push(pieces); },
    clear() { this.cleared++; }
  };
}

// A lone black knight on d5 with bare kings: d5 is the only undefended piece.
const loneKnightSnapshot = () => ({ id: 'p1', initialFen: '4k3/8/8/3n4/8/8/8/4K3 w - - 0 1', sanMoves: [] });

test('renders undefended markers in a safe context when the toggle is on', () => {
  const doc = setupDoc();
  const undefended = spyLayer();
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, showUndefended: true },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    undefendedLayer: undefended,
    loc: { pathname: '/analysis' },
    readSnapshotFn: loneKnightSnapshot
  }));
  rt.start();
  assert.equal(undefended.rendered.length, 1);
  assert.deepEqual(undefended.rendered[0].map((p) => p.square), ['d5']);
  assert.equal(undefended.rendered[0][0].side, 'enemy'); // white viewer, black piece
});

test('never renders undefended markers in a live-game context (fair-play gate)', () => {
  const doc = setupDoc();
  const undefended = spyLayer();
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, showUndefended: true },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    undefendedLayer: undefended,
    loc: { pathname: '/abcdefgh' }, // live game page
    readSnapshotFn: loneKnightSnapshot
  }));
  rt.start();
  assert.equal(undefended.rendered.length, 0);
  assert.ok(undefended.cleared >= 1);
});

test('does not render undefended markers when the toggle is off', () => {
  const doc = setupDoc();
  const undefended = spyLayer();
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, showUndefended: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    undefendedLayer: undefended,
    loc: { pathname: '/analysis' },
    readSnapshotFn: loneKnightSnapshot
  }));
  rt.start();
  assert.equal(undefended.rendered.length, 0);
});

test('toggling showUndefended via applyConfig repaints immediately', () => {
  const doc = setupDoc();
  const undefended = spyLayer();
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, showUndefended: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    undefendedLayer: undefended,
    loc: { pathname: '/training' },
    readSnapshotFn: loneKnightSnapshot
  }));
  rt.start();
  assert.equal(undefended.rendered.length, 0);
  rt.applyConfig({ showUndefended: true });
  assert.equal(undefended.rendered.length, 1); // repainted from the last snapshot
});

test('applyConfig clamps out-of-range intensity injected past mergeSettings', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  rt.applyConfig({ intensity: 99 });
  assert.equal(renderer.intensity, 10);
  rt.applyConfig({ intensity: -5 });
  assert.equal(renderer.intensity, 1);
});
