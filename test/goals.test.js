import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';

import { deriveGoals } from '../src/goals.js';

// Helper: the set of goal ids fired for a FEN (order-independent).
function goalIds(fen, myColor = 'w') {
  return new Set(deriveGoals(new Chess(fen), myColor).map((g) => g.id));
}
// Helper: the goal object for one id (or undefined).
function goal(fen, id, myColor = 'w') {
  return deriveGoals(new Chess(fen), myColor).find((g) => g.id === id);
}
// Helper: derive goals from a played move sequence (for development/opening rules
// that read the history and piece placement rather than a hand-written FEN).
function fromMoves(moves, myColor = 'w') {
  const chess = new Chess();
  for (const m of moves) chess.move(m);
  return deriveGoals(chess, myColor);
}

test('connect the rooks after castling once minors are developed', () => {
  // Castled, no minors left on their home squares, but the queen on d1 still
  // sits between the a1/f1 rooks -> they are not yet connected.
  const fen = 'r2q1rk1/pppppppp/8/8/8/8/PPPPPPPP/R2Q1RK1 w - - 0 1';
  const g = goal(fen, 'connect-rooks', 'w');
  assert.ok(g, 'connect-rooks should fire');
  assert.match(g.text, /Türme/);
});

test('no connect-rooks goal once the rooks already defend each other', () => {
  // Rc1 and Rf1 with an empty span between them are already connected.
  const fen = 'r4rk1/pppppppp/8/8/8/8/PPPPPPPP/2R2RK1 w - - 0 1';
  assert.ok(!goalIds(fen).has('connect-rooks'));
});

test('no connect-rooks goal while a minor still sits on its home square', () => {
  // Bishop still on c1 -> development is not finished, so this rule holds off.
  const fen = 'r1b2rk1/pppppppp/8/8/8/8/PPPPPPPP/R1B2RK1 w - - 0 1';
  assert.ok(!goalIds(fen).has('connect-rooks'));
});

test('king activation once queens are off and material is light', () => {
  // Blocked knight-and-pawn endgame: no queens, no rooks, no loose piece and no
  // passer, so king-activation is the one plan that fits. My king on the back rank.
  const fen = '4k3/1p6/2n5/3pp3/3PP3/2N5/1P6/4K3 w - - 0 1';
  const g = goal(fen, 'king-activation', 'w');
  assert.ok(g, 'king-activation should fire in a queenless light endgame');
  assert.match(g.text, /König/);
});

test('no king activation while queens are still on', () => {
  const fen = 'r2qk3/8/8/8/8/8/8/R2QK3 w - - 0 1';
  assert.ok(!goalIds(fen).has('king-activation'));
});

test('no king activation once the king is already central', () => {
  const fen = 'r3k3/8/8/4K3/8/8/8/R7 w - - 0 1'; // white king already on e5
  assert.ok(!goalIds(fen).has('king-activation'));
});

test('development lead of two minors: open the centre', () => {
  // White develops two minors while black only pushes pawns.
  const goals = fromMoves(['e4', 'a6', 'Nf3', 'b6', 'Bc4', 'c6'], 'w');
  const g = goals.find((x) => x.id === 'dev-lead-open-center');
  assert.ok(g, 'dev-lead-open-center should fire');
  assert.match(g.text, /Entwicklungsvorsprung|Zentrum/);
});

test('symmetric development does not fire a development lead', () => {
  const goals = fromMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], 'w');
  assert.ok(!goals.some((x) => x.id === 'dev-lead-open-center'));
});

test('my passed pawn: push and support it', () => {
  const fen = '4k3/8/8/3P4/8/8/8/4K3 w - - 0 1'; // white d5, no black pawns
  const g = goal(fen, 'passed-pawn-own', 'w');
  assert.ok(g, 'passed-pawn-own should fire');
  assert.match(g.text, /Freibauer/);
  assert.match(g.text, /d5/);
});

test('enemy passed pawn: blockade it', () => {
  const fen = '4k3/8/8/3p4/8/8/8/4K3 w - - 0 1'; // black d5, no white pawns
  const g = goal(fen, 'passed-pawn-enemy', 'w');
  assert.ok(g, 'passed-pawn-enemy should fire');
  assert.match(g.text, /[Bb]lockier/);
  assert.match(g.text, /d5/);
});

test('a pawn held back by an adjacent enemy pawn is not passed', () => {
  const fen = '4k3/2p5/8/3P4/8/8/8/4K3 w - - 0 1'; // black c7 guards d-file advance
  assert.ok(!goalIds(fen).has('passed-pawn-own'));
});

test('rook to the 7th rank when a rook can slide straight to it', () => {
  // White Ra1 on a fully empty a-file can reach a7 (the 7th).
  const fen = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
  const g = goal(fen, 'rook-seventh', 'w');
  assert.ok(g, 'rook-seventh should fire on reachability');
  assert.match(g.text, /auf die 7\. Reihe/);
  assert.doesNotMatch(g.text, /[Vv]erdopple/);
});

test('7th rank is mirrored for black (their 7th is rank 2)', () => {
  // Black Ra8 down an empty a-file can reach a2 (black\'s 7th rank).
  const fen = '4k3/8/8/8/8/8/8/r3K3 b - - 0 1';
  const g = goal(fen, 'rook-seventh', 'b');
  assert.ok(g, 'rook-seventh should fire for black onto rank 2');
});

test('double the rooks when one is already on the 7th', () => {
  // White Ra7 already on the 7th, second rook on h2 -> plan is to double up.
  const fen = '4k3/R7/8/8/8/8/7R/4K3 w - - 0 1';
  const g = goal(fen, 'rook-seventh', 'w');
  assert.ok(g);
  assert.match(g.text, /[Vv]erdopple/);
});

test('a lone rook already on the 7th needs no goal', () => {
  const fen = '4k3/R7/8/8/8/8/8/4K3 w - - 0 1';
  assert.ok(!goalIds(fen).has('rook-seventh'));
});

test('rook to the open file when no rook is on it yet', () => {
  // d- and e-files carry no pawns; white rooks sit on a1/h1. Target the open
  // d-file (first open file scanning a->h).
  const fen = 'r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1';
  const g = goal(fen, 'rook-open-file', 'w');
  assert.ok(g, 'rook-open-file should fire');
  assert.match(g.text, /offene d-Linie/);
});

test('rook to a half-open file when no fully open file exists', () => {
  // White is missing only its d-pawn (d-file half-open); every other file still
  // has a white pawn, so there is no fully open file. Target the half-open d.
  const fen = '4k3/pppppppp/8/8/8/8/PPP1PPPP/R3K2R w KQ - 0 1';
  const g = goal(fen, 'rook-open-file', 'w');
  assert.ok(g, 'rook-open-file should fire on a half-open file');
  assert.match(g.text, /halboffene d-Linie/);
});

test('rook-open-file stays silent when a rook already occupies the open file', () => {
  // Only the d-file is open (every other file still has a white pawn) and a
  // white rook already stands on d1 -> nothing to improve.
  const fen = '4k3/ppp1pppp/8/8/8/8/PPP1PPPP/3RK3 w - - 0 1';
  assert.ok(!goalIds(fen).has('rook-open-file'));
});

test('attack the loose enemy piece (reuses the undefended map)', () => {
  // Black knight d5 is undefended; white bishop d3 is also loose but that is the
  // opponent-danger overlay's job, not a goal. As white we target the knight.
  const fen = '4k3/8/8/3n4/8/3B4/8/4K3 w - - 0 1';
  const g = goal(fen, 'attack-undefended', 'w');
  assert.ok(g, 'attack-undefended should fire');
  assert.match(g.text, /Springer/);
  assert.match(g.text, /d5/);
  // Tactical goals outrank strategic ones (a loose piece beats any plan).
  assert.ok(g.priority < 10);
});

test('attack-undefended picks the most valuable loose enemy piece', () => {
  // Black queen a5 and black knight h5 are both loose; the queen is the target.
  const fen = '4k3/8/8/q6n/8/8/8/4K3 w - - 0 1';
  const g = goal(fen, 'attack-undefended', 'w');
  assert.ok(g);
  assert.match(g.text, /Dame/);
  assert.match(g.text, /a5/);
});

test('a loose enemy pawn alone does not trigger attack-undefended', () => {
  // Lone black pawn e5, nothing else but kings: not worth a "chase it" goal.
  const fen = '4k3/8/8/4p3/8/8/8/4K3 w - - 0 1';
  assert.ok(!goalIds(fen).has('attack-undefended'));
});

test('castle now: uncastled with rights from move 8 on', () => {
  // Both kings still on e-file, both retain castling rights, fullmove = 8.
  const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 8';
  const g = goal(fen, 'castle-now');
  assert.ok(g, 'castle-now should fire from move 8');
  assert.match(g.text, /[Rr]ochiere/);
  // The uncastled side has not castled, so the "attack the uncastled king" rule
  // must not fire for it.
  assert.ok(!goalIds(fen).has('attack-uncastled-king'));
});

test('castle now stays silent before move 8', () => {
  const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 3';
  assert.ok(!goalIds(fen).has('castle-now'));
});

test('castle now stays silent once castling rights are gone', () => {
  // King shuffled back to e1 but rights lost -> telling it to castle is useless.
  const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w kq - 4 9';
  assert.ok(!goalIds(fen).has('castle-now'));
});

test('attack the uncastled king when I have castled and the opponent has not', () => {
  // White has castled short (Kg1/Rf1); black king still on e8.
  const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 8';
  const g = goal(fen, 'attack-uncastled-king', 'w');
  assert.ok(g, 'attack-uncastled-king should fire for the castled side');
  assert.match(g.text, /[Kk]önig/);
  // From black's perspective in the same position: black is the uncastled side,
  // so black gets "castle now", not "attack".
  assert.ok(goalIds(fen, 'b').has('castle-now'));
  assert.ok(!goalIds(fen, 'b').has('attack-uncastled-king'));
});

test('opening plan shows for the owning side in the early game', () => {
  // 1.e4 c5 — the Sicilian plan belongs to Black.
  const asBlack = fromMoves(['e4', 'c5'], 'b');
  const plan = asBlack.find((g) => g.id === 'opening-plan');
  assert.ok(plan, 'opening-plan should fire for black in a Sicilian');
  assert.match(plan.text, /Sizilianisch/);
  // White has no owned plan in this table, so no opening goal for white.
  assert.ok(!fromMoves(['e4', 'c5'], 'w').some((g) => g.id === 'opening-plan'));
});

test('opening plan is the lowest-priority goal', () => {
  const asBlack = fromMoves(['e4', 'c5'], 'b');
  const plan = asBlack.find((g) => g.id === 'opening-plan');
  assert.ok(plan.priority >= 30);
});

test('opening plan stops once out of the opening / early middlegame', () => {
  // Keep the Sicilian stem, then shuffle knights out and back to burn moves past
  // the early-game cutoff without leaving the opening prefix.
  const moves = ['e4', 'c5'];
  for (let i = 0; i < 6; i += 1) moves.push('Nf3', 'Nc6', 'Ng1', 'Nb8');
  const goals = fromMoves(moves, 'b');
  assert.ok(!goals.some((g) => g.id === 'opening-plan'), 'no opening plan deep into the game');
});

test('a quiet standard position yields no goals (never invents any)', () => {
  // Start position: nothing hard to act on yet. The home-corner rooks are loose
  // by the map but are not real targets, so nothing fires.
  assert.equal(deriveGoals(new Chess(), 'w').length, 0);
  assert.equal(deriveGoals(new Chess(), 'b').length, 0);
});

test('shows at most 3 goals, tactical before strategic', () => {
  // White is up a rook AND black has a loose queen on a5 in the open: several
  // rules fire at once. The loose-piece (tactical) goal must come first, and the
  // list is capped at three.
  const fen = '4k3/8/8/q7/8/8/PPPPPPPP/R3K2R w KQ - 0 1';
  const goals = deriveGoals(new Chess(fen), 'w');
  assert.ok(goals.length <= 3, 'never more than three goals');
  assert.equal(goals[0].id, 'attack-undefended', 'tactical goal ranks first');
});

test('material advantage (>= +2): trade pieces, not pawns', () => {
  // White is a whole rook up (black has no a8 rook): +5.
  const fen = '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1';
  const g = goal(fen, 'material-trade-ahead');
  assert.ok(g, 'material-trade-ahead should fire');
  assert.match(g.text, /Tausche Figuren/i);
  // The mirror rule for the side that is behind must NOT also fire.
  assert.ok(!goalIds(fen).has('material-trade-behind'));
});
