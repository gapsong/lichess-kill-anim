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
  // Board-local mount: absolutely positioned INSIDE the board's container so it
  // tracks the board through scroll/zoom/layout — not fixed to the viewport.
  assert.equal(canvas.parentElement, board.parentElement);
  assert.equal(canvas.style.position, 'absolute');
  assert.equal(canvas.style.left, '0px');
  assert.equal(canvas.style.top, '0px');
  assert.equal(canvas.style.width, '800px');
  assert.equal(canvas.style.height, '800px');
  assert.equal(canvas.style.pointerEvents, 'none');
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 1600);
});

test('re-acquires cg-board when lichess replaces the element', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');
  const { document } = dom.window;
  const main = document.querySelector('main');
  const first = document.querySelector('cg-board');
  first.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });

  const overlay = new CanvasOverlay({ document, getContext: () => ({ setTransform() {} }) });
  overlay.attach();
  assert.equal(overlay.board, first);

  // lichess recreates the board node (flip/resize/SPA navigation)
  first.remove();
  const second = document.createElement('cg-board');
  second.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 720 });
  main.appendChild(second);

  const state = overlay.sync();
  assert.equal(overlay.board, second);
  assert.equal(state.size, 720);
  assert.equal(overlay.canvas.parentElement, main);
});

test('does not crash when no board exists', () => {
  const dom = new JSDOM('<main></main>');
  const overlay = new CanvasOverlay({ document: dom.window.document });

  assert.equal(overlay.attach(), null);
  assert.equal(overlay.sync(), null);
});
