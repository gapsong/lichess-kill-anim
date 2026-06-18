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
    readSnapshotFn: () => ({ id: 's1' }),
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

test('applyConfig propagates mode/intensity/soundOn/buildupMs to the renderer', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  assert.equal(renderer.intensity, 7);
  rt.applyConfig({ intensity: 3, soundOn: false, mode: 'random', buildupMs: 680 });
  assert.equal(renderer.intensity, 3);
  assert.equal(renderer.soundOn, false);
  assert.equal(renderer.mode, 'random');
  assert.equal(renderer.buildupMs, 680);
});
