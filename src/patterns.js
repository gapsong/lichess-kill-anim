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
          if (isPawnOf(pieceAt(at, af, rr), enemy)) blocked = true;
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
        if (v2 > v1) {
          out.push({ type: 'pin', side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: 'Pin' });
        } else if (v1 > v2) {
          out.push({ type: 'skewer', side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: 'Spieß' });
        }
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
    ...detectPassedPawns(at)
  ];
}
