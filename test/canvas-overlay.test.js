import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { CanvasOverlay } from '../src/canvas-overlay.js';

test('creates one board-local canvas overlay and syncs DPR size', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');
  const { document } = dom.window;
  const board = document.querySelector('cg-board');

  board.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: 800,
    height: 800
  });

  const overlay = new CanvasOverlay({
    document,
    devicePixelRatio: 2,
    getContext: () => ({ setTransform() {} })
  });

  overlay.attach();
  overlay.attach();
  overlay.sync();

  const canvases = document.querySelectorAll('#lichess-kill-overlay');
  assert.equal(canvases.length, 1);

  const canvas = canvases[0];
  assert.equal(canvas.style.position, 'fixed');
  assert.equal(canvas.style.left, '10px');
  assert.equal(canvas.style.top, '20px');
  assert.equal(canvas.style.width, '800px');
  assert.equal(canvas.style.height, '800px');
  assert.equal(canvas.style.pointerEvents, 'none');
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 1600);
});

test('does not crash when no board exists', () => {
  const dom = new JSDOM('<main></main>');
  const overlay = new CanvasOverlay({ document: dom.window.document });

  assert.equal(overlay.attach(), null);
  assert.equal(overlay.sync(), null);
});
