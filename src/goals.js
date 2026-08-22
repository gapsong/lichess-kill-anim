// goals.js
// Rule engine that derives small, HARD objectives from a position and phrases
// each as one short imperative German sentence (a "goal"). Everything here is
// computed statically from the position on screen — piece placement, material,
// files, ranks, move history — with chess.js as the single source of truth. It
// runs NO engine and NO evaluation function; every rule is a hand-checkable
// metric ("I castled, the opponent has not", "I am +2 in material", ...).
//
// This is position ANALYSIS / move guidance, i.e. outside assistance under
// fair-play rules, so the runtime only ever shows it in fair-play-safe contexts
// (see play-context.js) — exactly like the undefended-piece overlay it builds on.
//
// Adding a rule = add one function to RULES. Each rule takes the shared `ctx`
// bundle and returns a goal {id, text, priority} or null. Lower priority numbers
// are shown first; the runtime shows at most MAX_GOALS. Priority bands:
//   0–9   tactical / urgent (a loose enemy piece beats any strategic plan)
//   10–29 strategic (middlegame & endgame plans)
//   30+   opening plans (only early, added by the opening layer)

import { findUndefended } from './undefended.js';
import { detectOpening } from './openings.js';

const MAX_GOALS = 3;
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// Correctly-gendered German names for a loose target ("den ungedeckten Turm",
// "die ungedeckte Dame"). Pawns are never chased, so they are absent.
const LOOSE_PIECE_PHRASE = {
  n: 'den ungedeckten Springer',
  b: 'den ungedeckten Läufer',
  r: 'den ungedeckten Turm',
  q: 'die ungedeckte Dame'
};

export function deriveGoals(chess, myColor) {
  const ctx = buildContext(chess, myColor);
  const goals = [];
  for (const rule of RULES) {
    const goal = rule(ctx);
    if (goal) goals.push(goal);
  }
  goals.sort((a, b) => a.priority - b.priority);
  return goals.slice(0, MAX_GOALS);
}

// ---------------------------------------------------------------------------
// Shared, precomputed facts about the position (built once per derivation).
// ---------------------------------------------------------------------------
function buildContext(chess, myColor) {
  const enemyColor = myColor === 'w' ? 'b' : 'w';
  const pieces = []; // flat list of every piece on the board
  for (const row of chess.board()) {
    for (const piece of row) if (piece) pieces.push(piece);
  }
  const kingSquare = {
    w: pieces.find((p) => p.type === 'k' && p.color === 'w')?.square,
    b: pieces.find((p) => p.type === 'k' && p.color === 'b')?.square
  };
  return {
    chess,
    myColor,
    enemyColor,
    pieces,
    occupied: new Map(pieces.map((p) => [p.square, p])),
    fullmove: chess.moveNumber(),
    history: chess.history(), // SAN played to reach this position (opening layer)
    kingSquare,
    // Position-only castling detection: a king on its short/long castled square.
    // Derived from the board rather than move history, so it is correct on the
    // analysis board at any ply AND on puzzles that start mid-game from a FEN.
    castled: {
      w: kingSquare.w === 'g1' || kingSquare.w === 'c1',
      b: kingSquare.b === 'g8' || kingSquare.b === 'c8'
    },
    castlingRights: { w: chess.getCastlingRights('w'), b: chess.getCastlingRights('b') },
    // Reuse the undefended-piece map (the layer this feature builds on): pieces
    // covered by no same-coloured piece, labelled own (danger) / enemy (chance).
    undefended: findUndefended(chess, myColor),
    material: {
      [myColor]: countMaterial(pieces, myColor),
      [enemyColor]: countMaterial(pieces, enemyColor)
    }
  };
}

function countMaterial(pieces, color) {
  let sum = 0;
  for (const p of pieces) if (p.color === color) sum += VALUES[p.type];
  return sum;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Material policy: the side that is clearly ahead wants to swap pieces (heading
// for a won endgame); the side behind wants to keep pieces on and swap pawns.
const MATERIAL_MARGIN = 2; // pawn units before the imbalance is worth acting on
function ruleMaterial(ctx) {
  const diff = ctx.material[ctx.myColor] - ctx.material[ctx.enemyColor];
  if (diff >= MATERIAL_MARGIN) {
    return {
      id: 'material-trade-ahead',
      text: 'Du liegst vorne: Tausche Figuren, nicht Bauern.',
      priority: 12
    };
  }
  if (diff <= -MATERIAL_MARGIN) {
    return {
      id: 'material-trade-behind',
      text: 'Du liegst zurück: Vermeide Figurentausch, tausche eher Bauern.',
      priority: 12
    };
  }
  return null;
}

// Tactical: the opponent has a loose (undefended) piece worth chasing. Reuses
// the undefended map; pawns are ignored (not worth a dedicated goal). Reports
// the single most valuable target. Tactical priority — beats every plan below.
// A rook still on its home corner is skipped: the undefended map always flags
// those (they start undefended), but a rook tucked in the corner is not a real
// target — this is the one documented false-positive of the map.
const HOME_ROOKS = { w: new Set(['a1', 'h1']), b: new Set(['a8', 'h8']) };
function ruleAttackUndefended(ctx) {
  const targets = ctx.undefended.filter(
    (p) =>
      p.side === 'enemy' &&
      p.type in LOOSE_PIECE_PHRASE &&
      !(p.type === 'r' && HOME_ROOKS[ctx.enemyColor].has(p.square))
  );
  if (targets.length === 0) return null;
  const best = targets.reduce((a, b) => (VALUES[b.type] > VALUES[a.type] ? b : a));
  return {
    id: 'attack-undefended',
    text: `Greif ${LOOSE_PIECE_PHRASE[best.type]} auf ${best.square} an.`,
    priority: 5
  };
}

// Rook activity: put a rook on an open file (no pawns of either colour) — or,
// failing that, a half-open one (no pawns of mine). Fully open beats half-open;
// files where I already have a rook are skipped. Reports the first such file.
function ruleRookOpenFile(ctx) {
  const myRooks = ctx.pieces.filter((p) => p.type === 'r' && p.color === ctx.myColor);
  if (myRooks.length === 0) return null;
  const myPawnFiles = pawnFiles(ctx, ctx.myColor);
  const enemyPawnFiles = pawnFiles(ctx, ctx.enemyColor);
  const rookFiles = new Set(myRooks.map((r) => fileOf(r.square)));
  let open = null;
  let half = null;
  for (const f of FILES) {
    if (rookFiles.has(f)) continue; // a rook of mine already works this file
    const mine = myPawnFiles.has(f);
    const theirs = enemyPawnFiles.has(f);
    if (!mine && !theirs) open ??= f;
    else if (!mine && theirs) half ??= f;
  }
  const target = open ?? half;
  if (!target) return null;
  return {
    id: 'rook-open-file',
    text: `Bring einen Turm auf die ${open ? 'offene' : 'halboffene'} ${target}-Linie.`,
    priority: 16
  };
}

// Rook activity: the 7th rank (the enemy's second rank — rank 7 for White,
// rank 2 for Black) is where rooks feed on pawns. If a rook is already there and
// a second exists, doubling up is the plan; otherwise, if a rook can slide
// straight down its file onto the 7th, send it in.
function ruleRookSeventh(ctx) {
  const rooks = ctx.pieces.filter((p) => p.type === 'r' && p.color === ctx.myColor);
  if (rooks.length === 0) return null;
  const seventh = ctx.myColor === 'w' ? 7 : 2;
  const onSeventh = rooks.some((r) => rankOf(r.square) === seventh);
  if (onSeventh) {
    if (rooks.length < 2) return null; // a lone rook already there — nothing to add
    return { id: 'rook-seventh', text: 'Verdopple die Türme auf der 7. Reihe.', priority: 15 };
  }
  if (rooks.some((r) => rookCanReachRank(ctx, r.square, seventh))) {
    return { id: 'rook-seventh', text: 'Bring einen Turm auf die 7. Reihe.', priority: 17 };
  }
  return null;
}

// Coordination: after castling and finishing minor-piece development, the last
// opening task is to connect the rooks (clear the back rank between them so they
// defend each other). Fires only once I have castled and no minor of mine is
// still on its home square, and my rooks are not yet connected.
function ruleConnectRooks(ctx) {
  if (!ctx.castled[ctx.myColor]) return null;
  if (minorsOnHome(ctx, ctx.myColor) > 0) return null;
  const rooks = ctx.pieces.filter((p) => p.type === 'r' && p.color === ctx.myColor);
  if (rooks.length < 2) return null;
  if (rooksConnected(ctx, rooks)) return null;
  return { id: 'connect-rooks', text: 'Verbinde die Türme auf der Grundreihe.', priority: 20 };
}

function minorsOnHome(ctx, color) {
  let count = 0;
  for (const p of ctx.pieces) {
    if ((p.type === 'n' || p.type === 'b') && p.color === color && MINOR_HOME[color].has(p.square)) {
      count += 1;
    }
  }
  return count;
}

// Two rooks are connected when they share a rank or file with an empty span
// between them (so each defends the other).
function rooksConnected(ctx, rooks) {
  for (let i = 0; i < rooks.length; i += 1) {
    for (let j = i + 1; j < rooks.length; j += 1) {
      if (spanBetweenEmpty(ctx, rooks[i].square, rooks[j].square)) return true;
    }
  }
  return false;
}

function spanBetweenEmpty(ctx, a, b) {
  const fa = FILES.indexOf(fileOf(a));
  const fb = FILES.indexOf(fileOf(b));
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return rangeEmpty(ctx, fa, fb, (f) => `${FILES[f]}${ra}`);
  if (fa === fb) return rangeEmpty(ctx, ra, rb, (r) => `${FILES[fa]}${r}`);
  return false; // not aligned -> cannot defend along a line
}

function rangeEmpty(ctx, from, to, squareAt) {
  for (let i = Math.min(from, to) + 1; i < Math.max(from, to); i += 1) {
    if (ctx.occupied.has(squareAt(i))) return false;
  }
  return true;
}

// Endgame: once the queens are off and material is light, the king becomes a
// fighting piece — march it towards the centre. Silent if my king is already
// centralised (files c–f, ranks 3–6), i.e. the job is done.
const ENDGAME_MATERIAL_MAX = 13; // combined non-pawn, non-king material of both sides
function ruleKingActivation(ctx) {
  const queens = ctx.pieces.filter((p) => p.type === 'q');
  if (queens.length > 0) return null;
  const heavyMinor = ctx.pieces
    .filter((p) => p.type === 'r' || p.type === 'n' || p.type === 'b')
    .reduce((sum, p) => sum + VALUES[p.type], 0);
  if (heavyMinor > ENDGAME_MATERIAL_MAX) return null;
  const king = ctx.kingSquare[ctx.myColor];
  if (king && isCentral(king)) return null;
  return {
    id: 'king-activation',
    text: 'Damen sind weg: Aktiviere den König Richtung Zentrum.',
    priority: 20
  };
}

const isCentral = (square) =>
  'cdef'.includes(fileOf(square)) && rankOf(square) >= 3 && rankOf(square) <= 6;

// Development: a lead of two or more minor pieces (knights/bishops in play, off
// their home square) is a reason to open the position and hit before the
// opponent catches up.
const MINOR_HOME = {
  w: new Set(['b1', 'g1', 'c1', 'f1']),
  b: new Set(['b8', 'g8', 'c8', 'f8'])
};
const DEV_LEAD_MARGIN = 2;
function ruleDevelopmentLead(ctx) {
  const lead = developedMinors(ctx, ctx.myColor) - developedMinors(ctx, ctx.enemyColor);
  if (lead < DEV_LEAD_MARGIN) return null;
  return {
    id: 'dev-lead-open-center',
    text: 'Entwicklungsvorsprung: Öffne das Zentrum und nutze ihn, bevor der Gegner aufholt.',
    priority: 19
  };
}

function developedMinors(ctx, color) {
  let count = 0;
  for (const p of ctx.pieces) {
    if ((p.type === 'n' || p.type === 'b') && p.color === color && !MINOR_HOME[color].has(p.square)) {
      count += 1;
    }
  }
  return count;
}

// Passed pawns. My most advanced passer wants to be pushed and supported; the
// enemy's most advanced passer wants to be blockaded before it runs. Blockading
// (defence) is ranked a touch above pushing (offence).
function ruleMyPassedPawn(ctx) {
  const passer = mostAdvancedPasser(ctx, ctx.myColor);
  if (!passer) return null;
  return {
    id: 'passed-pawn-own',
    text: `Freibauer auf ${passer.square}: vorschieben und stützen.`,
    priority: 18
  };
}

function ruleEnemyPassedPawn(ctx) {
  const passer = mostAdvancedPasser(ctx, ctx.enemyColor);
  if (!passer) return null;
  return {
    id: 'passed-pawn-enemy',
    text: `Blockiere den gegnerischen Freibauer auf ${passer.square}.`,
    priority: 14
  };
}

// King safety, my side. Once I have castled and the opponent has not, their
// king is stuck in the centre — the plan is to prise the position open fast.
function ruleAttackUncastledKing(ctx) {
  if (!ctx.castled[ctx.myColor] || ctx.castled[ctx.enemyColor]) return null;
  return {
    id: 'attack-uncastled-king',
    text: 'Du stehst sicher, der Gegner nicht: Öffne die Stellung und greif den König an, bevor er rochiert.',
    priority: 10
  };
}

// King safety, my side. If I have not castled yet, can still castle, and we are
// past the opening's first few moves, get the king to safety now.
const CASTLE_BY_MOVE = 8;
function ruleCastleNow(ctx) {
  if (ctx.castled[ctx.myColor]) return null;
  const rights = ctx.castlingRights[ctx.myColor];
  if (!rights?.k && !rights?.q) return null; // castling no longer possible
  if (ctx.fullmove < CASTLE_BY_MOVE) return null;
  return { id: 'castle-now', text: 'Rochiere jetzt und bring den König in Sicherheit.', priority: 11 };
}

// Opening layer: while still in the opening / early middlegame, attach the
// standard book plan for the detected opening — but only for the side that owns
// it (the other side is covered by the generic rules). Lowest priority band, so
// a hanging piece or a concrete middlegame plan always shows ahead of it.
const OPENING_MAX_MOVE = 12;
function ruleOpening(ctx) {
  if (ctx.fullmove > OPENING_MAX_MOVE) return null;
  const opening = detectOpening(ctx.history);
  const plan = opening?.plans?.[ctx.myColor];
  if (!plan) return null;
  return { id: 'opening-plan', text: plan, priority: 30 };
}

const RULES = [
  ruleOpening,
  ruleAttackUndefended,
  ruleAttackUncastledKing,
  ruleCastleNow,
  ruleEnemyPassedPawn,
  ruleRookSeventh,
  ruleRookOpenFile,
  ruleDevelopmentLead,
  ruleMyPassedPawn,
  ruleKingActivation,
  ruleConnectRooks,
  ruleMaterial
];

// ---------------------------------------------------------------------------
// Board geometry helpers (square strings are algebraic, e.g. "d5")
// ---------------------------------------------------------------------------
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const fileOf = (square) => square[0];
const rankOf = (square) => Number(square[1]);

function pawnFiles(ctx, color) {
  const files = new Set();
  for (const p of ctx.pieces) if (p.type === 'p' && p.color === color) files.add(fileOf(p.square));
  return files;
}

// A pawn is passed when no enemy pawn stands on its file or an adjacent file on
// any square ahead of it (towards promotion). Returns the passer of `color` that
// is closest to promotion, or null.
function mostAdvancedPasser(ctx, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const enemyPawns = ctx.pieces.filter((p) => p.type === 'p' && p.color === enemy);
  const forward = color === 'w' ? 1 : -1;
  const advancement = (sq) => (color === 'w' ? rankOf(sq) : 9 - rankOf(sq));
  let best = null;
  for (const pawn of ctx.pieces) {
    if (pawn.type !== 'p' || pawn.color !== color) continue;
    const file = fileOf(pawn.square);
    const rank = rankOf(pawn.square);
    const blocked = enemyPawns.some((e) => {
      const df = Math.abs(FILES.indexOf(fileOf(e.square)) - FILES.indexOf(file));
      const ahead = forward === 1 ? rankOf(e.square) > rank : rankOf(e.square) < rank;
      return df <= 1 && ahead;
    });
    if (blocked) continue;
    if (!best || advancement(pawn.square) > advancement(best.square)) best = pawn;
  }
  return best;
}

// Can a rook slide straight down its own file onto `targetRank`? True when every
// square in between is empty and the landing square is not blocked by my own
// piece. Pins/checks are ignored (a v1 simplification shared with the rest).
function rookCanReachRank(ctx, from, targetRank) {
  const file = fileOf(from);
  const step = targetRank > rankOf(from) ? 1 : -1;
  for (let r = rankOf(from) + step; r !== targetRank; r += step) {
    if (ctx.occupied.has(`${file}${r}`)) return false;
  }
  const landing = ctx.occupied.get(`${file}${targetRank}`);
  return !landing || landing.color !== ctx.myColor;
}
