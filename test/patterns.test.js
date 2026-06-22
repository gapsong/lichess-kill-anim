import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';

import { detectPatterns } from '../src/patterns.js';

function patterns(fen) {
  return detectPatterns(new Chess(fen).board());
}
function has(list, type, side) {
  return list.some((p) => p.type === type && (side ? p.side === side : true));
}

test('battery: white queen behind rook on an open file', () => {
  const p = patterns('6k1/8/8/8/8/3R4/8/3Q2K1 w - - 0 1');
  assert.ok(has(p, 'battery', 'w'));
});

test('no battery when a piece blocks the file', () => {
  const p = patterns('6k1/8/8/8/8/3R4/3P4/3Q2K1 w - - 0 1');
  assert.ok(!has(p, 'battery'));
});

test('rooks: doubled rooks on a file', () => {
  const p = patterns('6k1/8/8/8/8/3R4/8/3R2K1 w - - 0 1');
  assert.ok(has(p, 'rooks', 'w'));
});

test('pin: bishop pins a knight to the king', () => {
  const p = patterns('6k1/8/4n3/8/8/8/B7/6K1 w - - 0 1');
  assert.ok(has(p, 'pin', 'w'));
});

test('skewer: bishop skewers queen in front of a rook', () => {
  const p = patterns('k5r1/8/4q3/8/8/8/B7/6K1 w - - 0 1');
  assert.ok(has(p, 'skewer', 'w'));
});

test('every detected pattern has the required shape', () => {
  const p = patterns('6k1/8/8/8/8/3R4/8/3Q2K1 w - - 0 1');
  for (const pat of p) {
    assert.ok(['battery', 'rooks', 'pin', 'skewer'].includes(pat.type));
    assert.ok(pat.side === 'w' || pat.side === 'b');
    assert.ok(Array.isArray(pat.squares) && pat.squares.length >= 1);
    assert.ok(typeof pat.label === 'string' && pat.label.length > 0);
  }
});

test('fianchetto: white kingside fianchetto structure', () => {
  const p = patterns('6k1/8/8/8/8/6P1/5PBP/6K1 w - - 0 1');
  assert.ok(has(p, 'fianchetto', 'w'));
});

test('outpost: defended white knight that no pawn can attack', () => {
  const p = patterns('6k1/8/8/3N4/4P3/8/8/6K1 w - - 0 1');
  assert.ok(has(p, 'outpost', 'w'));
});

test('passed pawn: white pawn with no enemy pawns ahead', () => {
  const p = patterns('6k1/8/8/4P3/8/8/8/6K1 w - - 0 1');
  assert.ok(has(p, 'passed-pawn', 'w'));
});

test('not a passed pawn when an enemy pawn blocks the file', () => {
  const p = patterns('6k1/8/4p3/4P3/8/8/8/6K1 w - - 0 1');
  assert.ok(!has(p, 'passed-pawn', 'w'));
});
