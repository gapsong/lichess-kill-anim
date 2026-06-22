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
    patternOverlay: { render() {}, clear() {} },
    derivePositionFn: () => ({ board: [], turn: 'w' }),
    detectPatternsFn: () => [],
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

test('patterns are rendered on scan when patternsOn is true', () => {
  const doc = setupDoc();
  const rendered = [];
  const fakeOverlay = { render: (ps) => rendered.push(ps), clear() {} };
  const sentinel = [{ type: 'battery', side: 'w', squares: ['d1'], line: null, label: 'Batterie' }];
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    patternOverlay: fakeOverlay,
    derivePositionFn: () => ({ board: [], turn: 'w' }),
    detectPatternsFn: () => sentinel
  }));
  rt.start();
  assert.equal(rendered.length, 1);
  assert.deepEqual(rendered[0], sentinel);
});

test('patterns are cleared (not rendered) when patternsOn is false', () => {
  const doc = setupDoc();
  let cleared = 0;
  const rendered = [];
  const fakeOverlay = { render: (ps) => rendered.push(ps), clear: () => { cleared++; } };
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, patternsOn: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    patternOverlay: fakeOverlay,
    derivePositionFn: () => ({ board: [], turn: 'w' }),
    detectPatternsFn: () => [{ type: 'battery', side: 'w', squares: ['d1'], line: null, label: 'Batterie' }]
  }));
  rt.start();
  assert.equal(rendered.length, 0);
  assert.ok(cleared >= 1);
});
