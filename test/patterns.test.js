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

test('battery must bear on the opponent: aimed backwards / blocked ahead does not fire', () => {
  // R d4 + Q d5 aligned, but own pawn on d6 blocks the way to the enemy and the only open
  // line runs back toward white's own half — the battery bears on nothing useful.
  const p = patterns('6k1/8/3P4/3Q4/3R4/8/8/K7 w - - 0 1');
  assert.ok(!has(p, 'battery'));
});

test('battery fires when it bears on an enemy piece even without a fully open file', () => {
  // Q d1 behind R d3, enemy knight on d5 in the line of fire.
  const p = patterns('6k1/8/8/3n4/8/3R4/8/3Q2K1 w - - 0 1');
  assert.ok(has(p, 'battery', 'w'));
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

// Skewer is only surfaced when winning the piece BEHIND actually pays off:
// the back piece must be at least a minor AND the exchange on its square
// (after the front piece steps off the ray) must favor the attacker.
test('skewer: winning an undefended rook behind fires (back >= 3, SEE > 0)', () => {
  // Ra4 sees queen d4 in front of undefended rook h4 along rank 4.
  const p = patterns('4k3/8/8/8/R2q3r/8/8/4K3 w - - 0 1');
  assert.ok(has(p, 'skewer', 'w'));
});

test('skewer over a defended PAWN does NOT fire (back < 3)', () => {
  // Ra4 sees queen d4 in front of pawn h4, defended by g5 pawn — back is a pawn.
  const p = patterns('4k3/8/8/6p1/R2q3p/8/8/4K3 w - - 0 1');
  assert.ok(!has(p, 'skewer'));
});

test('skewer where the back piece is only a PAWN does NOT fire (back < 3)', () => {
  // Ra4 sees queen d4 in front of an undefended pawn h4.
  const p = patterns('4k3/8/8/8/R2q3p/8/8/4K3 w - - 0 1');
  assert.ok(!has(p, 'skewer'));
});

test('skewer over a DEFENDED piece where recapture loses does NOT fire (SEE <= 0)', () => {
  // Ra4 sees queen d4 in front of knight h4, defended by black pawn g5: rook
  // takes knight (3), pawn recaptures rook (5) -> attacker nets -2 -> no win.
  const p = patterns('4k3/8/8/6p1/R2q3n/8/8/4K3 w - - 0 1');
  assert.ok(!has(p, 'skewer'));
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

// The hotspot fires only when the attacking side genuinely WINS material by
// going into the exchange (Static Exchange Evaluation > 0), not on a raw
// attacker/defender count. `hotspotAt` isolates the target square so unrelated
// side-effect hotspots elsewhere on the board don't disturb the assertion.
function hotspotAt(list, square) {
  return list.find((p) => p.type === 'hotspot' && p.squares[0] === square);
}

test('hotspot: queen + bishop battering a DEFENDED pawn does NOT fire (SEE < 0)', () => {
  // d5 black pawn, defended by the c6 pawn; white Qa2 and Bh1 both bear on d5.
  // The cheapest attacker (bishop, 3) is worth more than the pawn it wins (1),
  // so the exchange nets a loss for white -> no hotspot. This is the captain's
  // example of a light that should stay dark.
  assert.ok(!hotspotAt(patterns('6k1/8/2p5/3p4/8/8/Q7/6KB w - - 0 1'), 'd5'));
});

test('hotspot: a cheap piece winning an under-defended heavier piece fires (SEE > 0)', () => {
  // white bishop (3) attacks the d5 rook (5), defended only by the c6 pawn (1):
  // Bxr, pxB -> white nets +2, a real win -> marked.
  const h = hotspotAt(patterns('6k1/8/2p5/3r4/8/8/B7/6K1 w - - 0 1'), 'd5');
  assert.ok(h && h.side === 'w'); // side = the attacking colour
  assert.equal(h.squares[1], 'a2'); // attacker line preserved
});

test('hotspot: a pure even trade does NOT fire (SEE == 0)', () => {
  // d5 black pawn vs e4 white pawn, each defended by a friendly pawn (c6 / d3):
  // an even pawn trade nets nothing for either side -> no hotspot anywhere.
  assert.ok(!has(patterns('6k1/8/2p5/3p4/4P3/3P4/8/6K1 w - - 0 1'), 'hotspot'));
});

test('hotspot: fires only once the pile-up wins, not per single attacker (SEE > 0)', () => {
  // d5 black pawn defended by the c6 pawn. Alone, neither white attacker wins:
  // the e4 pawn is an even trade (SEE 0), the a2 bishop loses (SEE -2). Together
  // the cheapest-first exchange nets +1, so only the combined pile-up marks d5.
  assert.ok(!hotspotAt(patterns('6k1/8/2p5/3p4/4P3/8/8/6K1 w - - 0 1'), 'd5')); // e4 pawn alone
  assert.ok(!hotspotAt(patterns('6k1/8/2p5/3p4/8/8/B7/6K1 w - - 0 1'), 'd5'));   // a2 bishop alone
  const h = hotspotAt(patterns('6k1/8/2p5/3p4/4P3/8/B7/6K1 w - - 0 1'), 'd5');    // both
  assert.ok(h && h.side === 'w');
  assert.equal(h.squares.length - 1, 2); // both attacker squares drawn
});

test('hotspot: an empty square attacked by many pieces does NOT fire', () => {
  // e5 is empty; c4/g4 knights and b2/h2 bishops all bear on it, but there is
  // no piece there to win -> SEE never runs -> no hotspot.
  assert.ok(!hotspotAt(patterns('6k1/8/8/8/2N3N1/8/1B5B/6K1 w - - 0 1'), 'e5'));
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

test('hanging: an attacked, undefended piece is flagged', () => {
  const h = patterns('6k1/8/2p1p3/3N4/8/8/8/6K1 w - - 0 1').find((x) => x.type === 'hanging');
  assert.ok(h && h.side === 'w');
  assert.equal(h.squares[0], 'd5');
});

test('not hanging: an equal-value attacker meets an adequately defended piece', () => {
  const p = patterns('6k1/8/8/3N4/1N6/1b6/8/6K1 w - - 0 1');
  assert.ok(!has(p, 'hanging'));
});

test('hanging: still flagged when defended if the cheapest attacker is worth less than the piece', () => {
  // rook on d5 defended by a bishop, but a knight can take it and win the exchange
  const h = patterns('6k1/8/8/3R4/1n6/1B6/8/6K1 w - - 0 1').find((x) => x.type === 'hanging');
  assert.ok(h && h.squares[0] === 'd5');
});

test('hanging: an attacked, undefended pawn is flagged (same threshold as pieces)', () => {
  const h = patterns('6k1/8/8/8/8/2p5/8/B5K1 w - - 0 1').find((x) => x.type === 'hanging');
  assert.ok(h && h.side === 'b');
  assert.equal(h.squares[0], 'c3');
});

test('not hanging: a pawn defended by another pawn is not flagged', () => {
  const p = patterns('6k1/8/8/8/3p4/2p5/8/B5K1 w - - 0 1');
  assert.ok(!has(p, 'hanging'));
});
