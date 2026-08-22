import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';

import { findUndefended } from '../src/undefended.js';

// Helper: the set of undefended squares (order-independent) for a FEN.
function undefendedSquares(fen, myColor = 'w') {
  return new Set(findUndefended(new Chess(fen), myColor).map((p) => p.square));
}

test('start position: only the four rooks are undefended (kings excluded)', () => {
  // Every minor/major piece and pawn is covered by a neighbour in the initial
  // array; the corner rooks are the sole pieces nobody defends.
  const squares = undefendedSquares(new Chess().fen());
  assert.deepEqual([...squares].sort(), ['a1', 'a8', 'h1', 'h8']);
});

test('a lone hanging piece is undefended', () => {
  const squares = undefendedSquares('4k3/8/8/3n4/8/8/8/4K3 w - - 0 1');
  assert.deepEqual([...squares], ['d5']);
});

test('pawn diagonal cover counts as defence', () => {
  // Black pawn c6 attacks d5, so the d5 knight is defended; the pawn itself is
  // not defended by anything -> only c6 is reported.
  const squares = undefendedSquares('4k3/8/2p5/3n4/8/8/8/4K3 w - - 0 1');
  assert.deepEqual([...squares], ['c6']);
});

test('the king defends adjacent pieces and is never itself flagged', () => {
  // Re2 is covered by Ke1; nothing else on the board -> no undefended pieces.
  const squares = undefendedSquares('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(squares.size, 0);
});

test('x-ray is respected: a blocked defender does not count', () => {
  // Ra1 covers a3 (through the empty a2) but its line to the a5 knight is
  // blocked by the a3 pawn, so a5 is undefended while a3 is not.
  const squares = undefendedSquares('4k3/8/8/N7/8/P7/8/R3K3 w - - 0 1');
  assert.deepEqual([...squares].sort(), ['a1', 'a5']);
});

test('v1 simplification: a pinned piece still counts as a defender', () => {
  // Re3 is pinned to Ke1 by the black Re8, yet it geometrically covers the d3
  // pawn, so d3 is NOT flagged. Re3 and Re8 have no cover of their own.
  const squares = undefendedSquares('4r2k/8/8/8/8/3PR3/8/4K3 w - - 0 1');
  assert.deepEqual([...squares].sort(), ['e3', 'e8']);
  assert.ok(!squares.has('d3'), 'd3 defended by the pinned rook (v1 simplification)');
});

test('classifies undefended pieces as own vs enemy by viewer colour', () => {
  const fen = '4k3/8/8/3n4/8/3B4/8/4K3 w - - 0 1'; // black Nd5, white Bd3, both loose
  const asWhite = findUndefended(new Chess(fen), 'w');
  const bySquareW = Object.fromEntries(asWhite.map((p) => [p.square, p.side]));
  assert.equal(bySquareW.d3, 'own'); // my bishop is hanging -> danger
  assert.equal(bySquareW.d5, 'enemy'); // their knight is hanging -> chance

  // Flipping the viewer colour swaps the labels.
  const asBlack = findUndefended(new Chess(fen), 'b');
  const bySquareB = Object.fromEntries(asBlack.map((p) => [p.square, p.side]));
  assert.equal(bySquareB.d3, 'enemy');
  assert.equal(bySquareB.d5, 'own');
});

test('returns full descriptor (square/type/color/side)', () => {
  const [piece] = findUndefended(new Chess('4k3/8/8/3n4/8/8/8/4K3 w - - 0 1'), 'w');
  assert.deepEqual(piece, { square: 'd5', type: 'n', color: 'b', side: 'enemy' });
});
