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

test('no pin when the pinned unit is a pawn, not a piece', () => {
  const p = patterns('8/8/8/5k2/8/3p4/8/1B5K w - - 0 1');
  assert.ok(!has(p, 'pin'));
});

test('skewer: bishop skewers queen in front of a rook', () => {
  const p = patterns('k5r1/8/4q3/8/8/8/B7/6K1 w - - 0 1');
  assert.ok(has(p, 'skewer', 'w'));
});

test('every detected pattern has the required shape', () => {
  const p = patterns('6k1/8/8/8/8/3R4/8/3Q2K1 w - - 0 1');
  for (const pat of p) {
    assert.ok(typeof pat.type === 'string' && pat.type.length > 0);
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

test('a pawn blocked by its own pawn ahead is not a passed pawn', () => {
  const passers = patterns('6k1/8/4P3/4P3/8/8/8/6K1 w - - 0 1').filter((x) => x.type === 'passed-pawn');
  assert.ok(passers.some((x) => x.squares.includes('e6'))); // front pawn still passes
  assert.ok(!passers.some((x) => x.squares.includes('e5'))); // back pawn blocked by own e6
});

test('pawn chain: three or more diagonally linked pawns, ordered base to tip', () => {
  const p = patterns('6k1/8/8/4P3/3P4/2P5/1P6/6K1 w - - 0 1');
  assert.ok(has(p, 'pawn-chain', 'w'));
  const chain = p.find((x) => x.type === 'pawn-chain');
  assert.equal(chain.squares.length, 4);
  assert.equal(chain.squares[0], 'b2'); // base
  assert.equal(chain.squares[chain.squares.length - 1], 'e5'); // tip
});

test('two linked pawns are not yet a chain', () => {
  assert.ok(!has(patterns('6k1/8/8/8/8/2P5/1P6/6K1 w - - 0 1'), 'pawn-chain'));
});

test('hotspot: a square attacked by four or more pieces', () => {
  const h = patterns('6k1/8/8/4q3/2N3N1/8/1B5B/6K1 w - - 0 1').find((x) => x.type === 'hotspot');
  assert.ok(h && h.side === 'w');
  assert.equal(h.squares[0], 'e5'); // focal square first
  assert.ok(h.squares.length - 1 >= 4); // four+ attackers
});

test('open file: a rook on a pawn-free file', () => {
  assert.ok(has(patterns('6k1/8/8/8/8/8/8/4R1K1 w - - 0 1'), 'open-file', 'w'));
});

test('king fortress: castled king with an intact pawn shield', () => {
  assert.ok(has(patterns('6k1/8/8/8/8/8/5PPP/6K1 w - - 0 1'), 'fortress', 'w'));
});

test('fork: a piece attacking two enemy pieces of equal-or-greater value', () => {
  const f = patterns('k7/2q1b3/8/3N4/8/8/8/6K1 w - - 0 1').find((x) => x.type === 'fork');
  assert.ok(f && f.side === 'w');
  assert.equal(f.squares[0], 'd5'); // the forking piece first
  assert.ok(f.squares.length - 1 >= 2); // two+ targets
});
