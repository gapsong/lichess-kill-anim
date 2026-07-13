const FILES = 'abcdefgh';
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

function toSquare(file, rank) {
  return FILES[file] + rank;
}

// chess.board(): board[r][f], r=0 -> rank 8. Index by "file,rank" (file 0..7, rank 1..8).
function indexBoard(board) {
  const at = {};
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell) at[`${f},${8 - r}`] = { type: cell.type, color: cell.color };
    }
  }
  return at;
}

// null = empty, undefined = off board, object = piece.
function pieceAt(at, file, rank) {
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return undefined;
  return at[`${file},${rank}`] || null;
}

function pieceAtSquare(at, sq) {
  return pieceAt(at, sq.charCodeAt(0) - 97, Number(sq[1]));
}
function isPawnOf(piece, color) {
  return piece && piece.type === 'p' && piece.color === color;
}

const FIANCHETTO = [
  { bishop: 'g2', front: 'g3', s1: 'f2', s2: 'h2', color: 'w' },
  { bishop: 'b2', front: 'b3', s1: 'a2', s2: 'c2', color: 'w' },
  { bishop: 'g7', front: 'g6', s1: 'f7', s2: 'h7', color: 'b' },
  { bishop: 'b7', front: 'b6', s1: 'a7', s2: 'c7', color: 'b' }
];

function detectFianchetto(at) {
  const out = [];
  for (const f of FIANCHETTO) {
    const b = pieceAtSquare(at, f.bishop);
    if (!b || b.type !== 'b' || b.color !== f.color) continue;
    if (!isPawnOf(pieceAtSquare(at, f.front), f.color)) continue;
    if (!isPawnOf(pieceAtSquare(at, f.s1), f.color)) continue;
    if (!isPawnOf(pieceAtSquare(at, f.s2), f.color)) continue;
    out.push({ type: 'fianchetto', side: f.color, squares: [f.bishop], line: null, label: 'Fianchetto' });
  }
  return out;
}

function detectOutposts(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p || p.type !== 'n') continue;
      const c = p.color;
      const fwd = c === 'w' ? 1 : -1;
      const inOpponentHalf = c === 'w' ? r >= 5 : r <= 4;
      if (!inOpponentHalf) continue;
      const defended = isPawnOf(pieceAt(at, f - 1, r - fwd), c) || isPawnOf(pieceAt(at, f + 1, r - fwd), c);
      if (!defended) continue;
      const enemy = c === 'w' ? 'b' : 'w';
      let attackable = false;
      for (const af of [f - 1, f + 1]) {
        for (let rr = r + fwd; rr >= 1 && rr <= 8; rr += fwd) {
          if (isPawnOf(pieceAt(at, af, rr), enemy)) attackable = true;
        }
      }
      if (attackable) continue;
      out.push({ type: 'outpost', side: c, squares: [toSquare(f, r)], line: null, label: 'Außenposten' });
    }
  }
  return out;
}

function detectPassedPawns(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p || p.type !== 'p') continue;
      const c = p.color;
      const fwd = c === 'w' ? 1 : -1;
      const enemy = c === 'w' ? 'b' : 'w';
      let blocked = false;
      for (const af of [f - 1, f, f + 1]) {
        if (af < 0 || af > 7) continue;
        for (let rr = r + fwd; rr >= 1 && rr <= 8; rr += fwd) {
          const ahead = pieceAt(at, af, rr);
          if (isPawnOf(ahead, enemy)) blocked = true;
          // an own pawn directly ahead on the same file blocks it — not a true passer
          if (af === f && isPawnOf(ahead, c)) blocked = true;
        }
      }
      if (!blocked) out.push({ type: 'passed-pawn', side: c, squares: [toSquare(f, r)], line: null, label: 'Freibauer' });
    }
  }
  return out;
}

function movesAlong(type, d) {
  const ortho = d[0] === 0 || d[1] === 0;
  const diag = Math.abs(d[0]) === Math.abs(d[1]) && d[0] !== 0;
  if (type === 'r') return ortho;
  if (type === 'b') return diag;
  if (type === 'q') return ortho || diag;
  return false;
}

// Walk from (f,r) in direction d over empty squares; return { piece, file, rank } of the first
// non-empty square, or null if the ray leaves the board.
function firstHit(at, f, r, d) {
  let nf = f + d[0];
  let nr = r + d[1];
  while (pieceAt(at, nf, nr) === null) { nf += d[0]; nr += d[1]; }
  const piece = pieceAt(at, nf, nr);
  return piece ? { piece, file: nf, rank: nr } : null;
}

const ALL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT_HOPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

// Squares the piece on (f,r) attacks (sliders stop at the first occupied square,
// which is itself attacked). Returns an array of [file, rank].
function attackSquares(at, f, r) {
  const p = pieceAt(at, f, r);
  if (!p) return [];
  const out = [];
  const onBoard = (nf, nr) => nf >= 0 && nf < 8 && nr >= 1 && nr <= 8;
  if (p.type === 'n') {
    for (const [df, dr] of KNIGHT_HOPS) if (onBoard(f + df, r + dr)) out.push([f + df, r + dr]);
  } else if (p.type === 'k') {
    for (const [df, dr] of ALL_DIRS) if (onBoard(f + df, r + dr)) out.push([f + df, r + dr]);
  } else if (p.type === 'p') {
    const fwd = p.color === 'w' ? 1 : -1;
    if (onBoard(f - 1, r + fwd)) out.push([f - 1, r + fwd]);
    if (onBoard(f + 1, r + fwd)) out.push([f + 1, r + fwd]);
  } else {
    const dirs = p.type === 'r' ? ORTHO_DIRS : p.type === 'b' ? DIAG_DIRS : ALL_DIRS;
    for (const [df, dr] of dirs) {
      let nf = f + df, nr = r + dr;
      while (onBoard(nf, nr)) {
        out.push([nf, nr]);
        if (pieceAt(at, nf, nr)) break;
        nf += df; nr += dr;
      }
    }
  }
  return out;
}

function detectBatteries(at) {
  const out = [];
  const seen = new Set();
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p || !'rbq'.includes(p.type)) continue;
      for (const d of ALL_DIRS) {
        if (!movesAlong(p.type, d)) continue;
        const hit = firstHit(at, f, r, d);
        if (!hit) continue;
        const q = hit.piece;
        if (q.color !== p.color || !'rbq'.includes(q.type) || !movesAlong(q.type, d)) continue;
        // Reserve doubled rooks for the dedicated 'rooks' pattern; a battery needs a queen.
        if (p.type !== 'q' && q.type !== 'q') continue;
        const a = toSquare(f, r);
        const b = toSquare(hit.file, hit.rank);
        const key = [a, b].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: 'battery', side: p.color, squares: [a, b], line: { from: a, to: b }, label: 'Batterie' });
      }
    }
  }
  return out;
}

function detectRooks(at) {
  const out = [];
  const seen = new Set();
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p || p.type !== 'r') continue;
      for (const d of ORTHO_DIRS) {
        const hit = firstHit(at, f, r, d);
        if (!hit || hit.piece.color !== p.color || hit.piece.type !== 'r') continue;
        const a = toSquare(f, r);
        const b = toSquare(hit.file, hit.rank);
        const key = [a, b].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: 'rooks', side: p.color, squares: [a, b], line: { from: a, to: b }, label: 'Türme' });
      }
    }
  }
  return out;
}

function detectPinsAndSkewers(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const s = pieceAt(at, f, r);
      if (!s || !'rbq'.includes(s.type)) continue;
      for (const d of ALL_DIRS) {
        if (!movesAlong(s.type, d)) continue;
        const first = firstHit(at, f, r, d);
        if (!first || first.piece.color === s.color) continue;
        const second = firstHit(at, first.file, first.rank, d);
        if (!second || second.piece.color === s.color) continue;
        const ssq = toSquare(f, r);
        const f1 = toSquare(first.file, first.rank);
        const f2 = toSquare(second.file, second.rank);
        const v1 = VALUE[first.piece.type];
        const v2 = VALUE[second.piece.type];
        // A pinned pawn is too common/noisy to call out; only strong units (n/b/r/q) count as pinned.
        if (v2 > v1 && first.piece.type !== 'p') {
          out.push({ type: 'pin', side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: 'Pin' });
        } else if (v1 > v2) {
          out.push({ type: 'skewer', side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: 'Spieß' });
        }
      }
    }
  }
  return out;
}

// A pawn chain is a straight diagonal run of >= 3 same-colour pawns, each
// defending the next (e.g. b2-c3-d4-e5). A defended pawn in a "V" (two pawns
// supporting one) is NOT a chain — it must be a single diagonal line.
function detectPawnChains(at) {
  const out = [];
  for (const c of ['w', 'b']) {
    const fwd = c === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      for (let f = 0; f < 8; f++) {
        for (let r = 1; r <= 8; r++) {
          if (!isPawnOf(pieceAt(at, f, r), c)) continue;
          // only start at the base of a run (no same-colour pawn behind on this diagonal)
          if (isPawnOf(pieceAt(at, f - df, r - fwd), c)) continue;
          const squares = [];
          let nf = f, nr = r;
          while (isPawnOf(pieceAt(at, nf, nr), c)) {
            squares.push(toSquare(nf, nr)); // walking forward gives base -> tip order
            nf += df;
            nr += fwd;
          }
          if (squares.length >= 3) {
            out.push({ type: 'pawn-chain', side: c, squares, line: null, label: 'Bauernkette' });
          }
        }
      }
    }
  }
  return out;
}

// Static Exchange Evaluation on an occupied square. `onSquareValue` is the value
// of the piece currently sitting there (the one about to be captured);
// `moverVals`/`otherVals` are the VALUEs of the side-to-move's and the other
// side's remaining attackers, each sorted ascending so the cheapest unit always
// captures first. Returns the best net material the side to move can win,
// standing pat (0) whenever capturing would lose material. A king may only
// capture when the other side has no piece left to recapture — it must not
// capture into defence.
function seeGain(onSquareValue, moverVals, otherVals) {
  if (moverVals.length === 0) return 0;
  const cheapest = moverVals[0];
  if (cheapest === VALUE.k && otherVals.length > 0) return 0;
  return Math.max(0, onSquareValue - seeGain(cheapest, otherVals, moverVals.slice(1)));
}

// Net material the attacking side wins by initiating the capture sequence on the
// occupied square. The first attacker is committed (it is the premise "what if I
// capture here"); every later ply is optional. < 0 means the attacker loses
// material, == 0 an even trade — neither is a real threat.
function staticExchange(victimValue, attackerVals, defenderVals) {
  if (attackerVals.length === 0) return 0;
  const cheapest = attackerVals[0];
  if (cheapest === VALUE.k && defenderVals.length > 0) return 0; // lone king can't win a defended square
  return victimValue - seeGain(cheapest, defenderVals, attackerVals.slice(1));
}

// A hotspot marks an occupied square where the attacking side genuinely WINS
// material by going into the exchange (SEE > 0). This is stricter than a raw
// attacker/defender count: a queen + bishop battering a defended pawn pile more
// force on than the defence, but the cheapest attacker (the bishop) is worth more
// than the pawn, so the exchange nets a loss — SEE <= 0 and the square stays dark.
function detectHotspots(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p) continue;
      const enemyColor = p.color === 'w' ? 'b' : 'w';
      const attackers = attackersOf(at, f, r, enemyColor);
      if (attackers.length === 0) continue;
      const defenders = attackersOf(at, f, r, p.color);
      const attackerVals = attackers.map((a) => VALUE[a.type]).sort((a, b) => a - b);
      const defenderVals = defenders.map((d) => VALUE[d.type]).sort((a, b) => a - b);
      if (staticExchange(VALUE[p.type], attackerVals, defenderVals) <= 0) continue;
      out.push({
        type: 'hotspot',
        side: enemyColor,
        squares: [toSquare(f, r), ...attackers.map((a) => a.square)],
        line: null,
        label: 'Brennpunkt'
      });
    }
  }
  return out;
}

function detectOpenFileRooks(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    let pawn = false;
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (p && p.type === 'p') { pawn = true; break; }
    }
    if (pawn) continue;
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (p && p.type === 'r') {
        const endR = p.color === 'w' ? 8 : 1;
        out.push({ type: 'open-file', side: p.color, squares: [toSquare(f, r)], line: { from: toSquare(f, r), to: toSquare(f, endR) }, label: 'Offene Linie' });
      }
    }
  }
  return out;
}

const FORTRESS = [
  { king: 'g1', pawns: ['f2', 'g2', 'h2'], color: 'w' },
  { king: 'c1', pawns: ['b2', 'c2', 'd2'], color: 'w' },
  { king: 'g8', pawns: ['f7', 'g7', 'h7'], color: 'b' },
  { king: 'c8', pawns: ['b7', 'c7', 'd7'], color: 'b' }
];

function detectKingFortress(at) {
  const out = [];
  for (const fort of FORTRESS) {
    const k = pieceAtSquare(at, fort.king);
    if (!k || k.type !== 'k' || k.color !== fort.color) continue;
    if (!fort.pawns.every((sq) => isPawnOf(pieceAtSquare(at, sq), fort.color))) continue;
    out.push({ type: 'fortress', side: fort.color, squares: [fort.king, ...fort.pawns], line: null, label: 'Festung' });
  }
  return out;
}

function detectForks(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p) continue;
      const myVal = VALUE[p.type];
      const enemy = p.color === 'w' ? 'b' : 'w';
      const targets = [];
      for (const [nf, nr] of attackSquares(at, f, r)) {
        const q = pieceAt(at, nf, nr);
        if (q && q.color === enemy && VALUE[q.type] >= myVal) targets.push(toSquare(nf, nr));
      }
      if (targets.length >= 2) {
        out.push({ type: 'fork', side: p.color, squares: [toSquare(f, r), ...targets], line: null, label: 'Gabel' });
      }
    }
  }
  return out;
}

// Pieces of `color` that attack (f,r) — used both to find attackers of an
// enemy piece and defenders of a friendly one. Each returned piece carries the
// `square` it attacks from, so callers that need the geometry (hotspot lines)
// don't have to re-scan.
function attackersOf(at, f, r, color) {
  const out = [];
  for (let af = 0; af < 8; af++) {
    for (let ar = 1; ar <= 8; ar++) {
      const p = pieceAt(at, af, ar);
      if (!p || p.color !== color) continue;
      for (const [tf, tr] of attackSquares(at, af, ar)) {
        if (tf === f && tr === r) { out.push({ type: p.type, color: p.color, square: toSquare(af, ar) }); break; }
      }
    }
  }
  return out;
}

// Any non-king unit (piece or pawn) is hanging if it is attacked and either
// undefended (free capture) or defended so poorly that the cheapest attacker
// still wins material after the recapture (one-ply exchange estimate, not a
// full SEE). Pawns use the exact same threshold: since pawn value (1) is the
// lowest on the board, a defended pawn can never lose the exchange, so a
// pawn only trips this when it is genuinely undefended — ordinary tension
// where either side has a pawn or piece backing it up stays quiet.
function detectHangingPieces(at) {
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      const p = pieceAt(at, f, r);
      if (!p || p.type === 'k') continue;
      const enemy = p.color === 'w' ? 'b' : 'w';
      const attackers = attackersOf(at, f, r, enemy);
      if (attackers.length === 0) continue;
      const defenders = attackersOf(at, f, r, p.color);
      const cheapestAttacker = Math.min(...attackers.map((a) => VALUE[a.type]));
      const hanging = defenders.length === 0 || cheapestAttacker < VALUE[p.type];
      if (hanging) {
        out.push({ type: 'hanging', side: p.color, squares: [toSquare(f, r)], line: null, label: 'Hängt' });
      }
    }
  }
  return out;
}

export function detectPatterns(board) {
  const at = indexBoard(board);
  return [
    ...detectBatteries(at),
    ...detectRooks(at),
    ...detectPinsAndSkewers(at),
    ...detectFianchetto(at),
    ...detectOutposts(at),
    ...detectPassedPawns(at),
    ...detectPawnChains(at),
    ...detectHotspots(at),
    ...detectOpenFileRooks(at),
    ...detectKingFortress(at),
    ...detectForks(at),
    ...detectHangingPieces(at)
  ];
}
