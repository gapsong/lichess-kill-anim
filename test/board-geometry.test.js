import assert from 'node:assert/strict';
import test from 'node:test';

import { squareCenter } from '../src/board-geometry.js';

test('maps white orientation squares to board centers', () => {
  const board = { left: 10, top: 20, width: 800 };

  assert.deepEqual(squareCenter('a8', board), { x: 60, y: 70, size: 100 });
  assert.deepEqual(squareCenter('e4', board), { x: 460, y: 470, size: 100 });
});

test('maps black orientation squares to flipped board centers', () => {
  const board = { left: 10, top: 20, width: 800 };

  assert.deepEqual(squareCenter('a8', board, true), { x: 760, y: 770, size: 100 });
  assert.deepEqual(squareCenter('e4', board, true), { x: 360, y: 370, size: 100 });
});
