import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { UndefendedLayer } from '../src/undefended-layer.js';

// A 2D context that records the calls/state the layer uses, so we can assert what
// it painted without a real canvas.
function recordingContext() {
  const calls = [];
  const colors = [];
  return {
    calls,
    colors,
    setTransform() {},
    clearRect(...a) { calls.push(['clearRect', ...a]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    moveTo() { calls.push(['moveTo']); },
    lineTo() { calls.push(['lineTo']); },
    arc() { calls.push(['arc']); },
    stroke() { calls.push(['stroke']); },
    set strokeStyle(v) { colors.push(v); },
    get strokeStyle() { return colors[colors.length - 1]; },
    set lineWidth(_v) {}, set lineCap(_v) {}, set lineJoin(_v) {},
    set shadowColor(_v) {}, set shadowBlur(_v) {}
  };
}

test('mounts its own distinct canvas id (not the kill-animation canvas)', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');
  const { document } = dom.window;
  document.querySelector('cg-board').getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });
  const ctx = recordingContext();

  const layer = new UndefendedLayer({ document });
  layer.overlay.getContext = () => ctx;

  layer.render([{ square: 'e4', type: 'p', color: 'w', side: 'own' }]);

  assert.equal(document.querySelectorAll('#lichess-undefended-overlay').length, 1);
  assert.equal(document.querySelectorAll('#lichess-kill-overlay').length, 0);
});

test('paints own (red brackets) and enemy (cyan ring) with distinct styles', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');
  const { document } = dom.window;
  document.querySelector('cg-board').getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });
  const ctx = recordingContext();

  const layer = new UndefendedLayer({ document });
  layer.overlay.getContext = () => ctx;

  layer.render([
    { square: 'd3', type: 'b', color: 'w', side: 'own' },
    { square: 'd5', type: 'n', color: 'b', side: 'enemy' }
  ]);

  // Both marker colours were used.
  assert.ok(ctx.colors.includes('#ff5252'), 'own uses red');
  assert.ok(ctx.colors.includes('#25e0d0'), 'enemy uses cyan');
  // Shapes differ: enemy draws a ring (arc), own draws bracket segments (lineTo).
  assert.ok(ctx.calls.some((c) => c[0] === 'arc'), 'a ring was drawn for enemy');
  assert.ok(ctx.calls.some((c) => c[0] === 'lineTo'), 'brackets were drawn for own');
});

test('clear() wipes the canvas and drops the markers', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');
  const { document } = dom.window;
  document.querySelector('cg-board').getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });
  const ctx = recordingContext();

  const layer = new UndefendedLayer({ document });
  layer.overlay.getContext = () => ctx;

  layer.render([{ square: 'd5', type: 'n', color: 'b', side: 'enemy' }]);
  const before = ctx.calls.filter((c) => c[0] === 'clearRect').length;
  layer.clear();
  const after = ctx.calls.filter((c) => c[0] === 'clearRect').length;

  assert.ok(after > before, 'clear repainted (cleared) the canvas');
  assert.equal(layer.pieces.length, 0);
});
