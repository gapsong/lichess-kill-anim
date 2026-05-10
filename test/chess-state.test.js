import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveEvents } from '../src/chess-state.js';

test('derives a capture event from a standard SAN mainline', () => {
  const events = deriveEvents({
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5']
  });

  assert.deepEqual(events, [
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
    }
  ]);
});

test('reports the captured pawn square for en passant', () => {
  const events = deriveEvents({
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'h5', 'e5', 'd5', 'exd6']
  });

  assert.deepEqual(events, [
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
    }
  ]);
});

test('does not emit capture events for quiet moves and castling', () => {
  const events = deriveEvents({
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O']
  });

  assert.deepEqual(events, []);
});

test('derives rook capture direction data from FEN and SAN instead of board DOM', () => {
  const events = deriveEvents({
    id: 'game-1',
    initialFen: '4k3/8/8/4n3/8/8/4R3/4K3 w - - 0 1',
    sanMoves: ['Rxe5']
  });

  assert.deepEqual(events, [
    {
      kind: 'capture',
      ply: 1,
      san: 'Rxe5+',
      from: 'e2',
      to: 'e5',
      movingPiece: 'r',
      movingColor: 'w',
      capturedPiece: 'n',
      capturedColor: 'b',
      capturedAt: 'e5',
      isEnPassant: false
    }
  ]);
});

test('keeps earlier capture events when later SAN cannot be applied', () => {
  const events = deriveEvents({
    id: 'game-1',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5', 'not-a-move']
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].san, 'exd5');
});
