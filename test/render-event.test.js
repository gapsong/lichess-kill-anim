import assert from 'node:assert/strict';
import test from 'node:test';

import { createRenderEvent } from '../src/render-event.js';

test('creates a board-local render event from a capture event', () => {
  const renderEvent = createRenderEvent(
    {
      kind: 'capture',
      ply: 3,
      san: 'exd5',
      from: 'e4',
      to: 'd5',
      movingPiece: 'p',
      movingColor: 'w',
      capturedPiece: 'p',
      capturedColor: 'b',
      capturedAt: 'd5',
      isEnPassant: false
    },
    {
      size: 800,
      isBlackOrientation: false
    },
    'game-1'
  );

  assert.deepEqual(renderEvent, {
    id: 'game-1|3|exd5|e4|d5',
    board: {
      size: 800,
      squareSize: 100,
      orientation: 'white'
    },
    attacker: {
      piece: 'p',
      color: 'w',
      from: { square: 'e4', x: 450, y: 450 },
      to: { square: 'd5', x: 350, y: 350 }
    },
    victim: {
      piece: 'p',
      color: 'b',
      at: { square: 'd5', x: 350, y: 350 }
    },
    move: {
      san: 'exd5',
      ply: 3,
      isEnPassant: false
    },
    direction: {
      dx: -1,
      dy: -1,
      angleRad: -2.356194490192345
    }
  });
});

test('keeps en passant target and victim squares separate', () => {
  const renderEvent = createRenderEvent(
    {
      kind: 'capture',
      ply: 5,
      san: 'exd6',
      from: 'e5',
      to: 'd6',
      movingPiece: 'p',
      movingColor: 'w',
      capturedPiece: 'p',
      capturedColor: 'b',
      capturedAt: 'd5',
      isEnPassant: true
    },
    {
      size: 800,
      isBlackOrientation: false
    },
    'game-1'
  );

  assert.deepEqual(renderEvent.attacker.to, { square: 'd6', x: 350, y: 250 });
  assert.deepEqual(renderEvent.victim.at, { square: 'd5', x: 350, y: 350 });
  assert.equal(renderEvent.move.isEnPassant, true);
});
