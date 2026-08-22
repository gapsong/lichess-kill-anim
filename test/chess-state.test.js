import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveEvents, positionAt } from '../src/chess-state.js';

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

test('positionAt replays the whole mainline when no activePly is set', () => {
  const chess = positionAt({ initialFen: null, sanMoves: ['e4', 'e5', 'Nf3'] });
  assert.equal(chess.get('e4')?.type, 'p');
  assert.equal(chess.get('f3')?.type, 'n');
  assert.equal(chess.turn(), 'b');
});

test('positionAt stops at activePly (viewer looking at an earlier ply)', () => {
  // Viewing ply 1: only 1.e4 has been played, so f3 is still empty and it is
  // Black to move — replaying further would show a position not on screen.
  const chess = positionAt({ initialFen: null, sanMoves: ['e4', 'e5', 'Nf3'], activePly: 1 });
  assert.equal(chess.get('e4')?.type, 'p');
  assert.equal(chess.get('f3'), undefined);
  assert.equal(chess.turn(), 'b');
});

test('positionAt honours a custom initial FEN', () => {
  const chess = positionAt({ initialFen: '4k3/8/8/4n3/8/8/4R3/4K3 w - - 0 1', sanMoves: ['Rxe5'] });
  assert.equal(chess.get('e5')?.type, 'r');
  assert.equal(chess.get('e5')?.color, 'w');
});

test('positionAt stops replaying at the first illegal SAN', () => {
  const chess = positionAt({ initialFen: null, sanMoves: ['e4', 'nonsense', 'e5'] });
  assert.equal(chess.get('e4')?.type, 'p');
  assert.equal(chess.turn(), 'b'); // stopped after 1.e4, Black still to move
});
