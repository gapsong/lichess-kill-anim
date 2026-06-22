# Schach-Muster-Erkennung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statische Schach-Formationen (Batterie, Türme, Pin, Spieß, Fianchetto, Außenposten, Freibauer) aus der aktuellen Stellung erkennen und auf dem Lichess-Brett hervorheben (Linie + Feld-Glow + Label), mit Popup-Toggle und Referenz-Doc.

**Architecture:** `derivePosition` (chess.js) liefert die Endstellung; `detectPatterns` (rein) erkennt Muster; eine persistente zweite Canvas-Schicht (`PatternOverlay`) zeichnet sie bei Stellungswechsel; die Runtime verdrahtet alles hinter `settings.patternsOn`.

**Tech Stack:** Vanilla JS ES-Module, `chess.js`, `node:test` + `node:assert/strict`, esbuild, Canvas 2D, Chrome MV3.

## Global Constraints

- 7 Muster-Typen mit `type`: `battery`, `rooks`, `pin`, `skewer`, `fianchetto`, `outpost`, `passed-pawn`.
- `Pattern`-Form: `{ type, side: 'w'|'b', squares: string[], line: {from,to}|null, label: string }`.
- Wertetabelle Pin/Spieß: `{ p:1, n:3, b:3, r:5, q:9, k:100 }`.
- Farbe nach Brett-Orientierung: untere Seite (Betrachter) **grün** `#3bd17a`, obere **rot** `#e5564b`.
- `patternsOn` Default `true`; im Popup als Toggle "Pattern hints".
- Keine neue Permission, keine Manifest-Pflichtfelder; Pattern-Canvas `id="lichess-pattern-overlay"`, `zIndex 99997` (unter dem Effekt-Canvas `99998`).
- Build-Gate nach `src/`-Änderungen: `npm test && npm run build && node --check lichess-kill-notifier.user.js && npm run build:ext` — und das gebaute `lichess-kill-notifier.user.js` wird **mit** committet.
- Tests prüfen nur deterministische Flächen (Detektoren, `derivePosition`, Settings-Merge, Runtime-Verdrahtung). Kein Test für Canvas-DOM/`chrome`.
- `lab/`, `scripts/animations/` bleiben unangetastet. Bestehende 104 Tests bleiben grün.
- Commits nur lokal; kein Push ohne Ansage.

---

## Phase 1 — Stellungsquelle + Detektion „große 4"

### Task 1: `derivePosition`

**Files:**
- Modify: `src/chess-state.js`
- Test: `test/chess-state.test.js`

**Interfaces:**
- Consumes: `Chess` aus `chess.js`; `snapshot.{initialFen, sanMoves}`.
- Produces: `derivePosition(snapshot) -> { board, turn }` — `board` = `chess.board()` (8×8; `board[r][f]`, `r=0` ist Rang 8; Zelle `{ square, type, color }|null`), `turn` = `'w'|'b'`.

- [ ] **Step 1: Failing test schreiben**

An `test/chess-state.test.js` anhängen:

```js
import { derivePosition } from '../src/chess-state.js';

test('derivePosition returns the final board after the moves', () => {
  const { board, turn } = derivePosition({ initialFen: null, sanMoves: ['e4', 'd5', 'exd5'] });
  // d5 now holds a white pawn, e4 is empty
  const d5 = board[3][3]; // r=3 -> rank5, f=3 -> file d
  assert.equal(d5.type, 'p');
  assert.equal(d5.color, 'w');
  assert.equal(turn, 'b');
});

test('derivePosition stops at the first illegal SAN', () => {
  const { board } = derivePosition({ initialFen: null, sanMoves: ['e4', 'Qzz9', 'd5'] });
  // only e4 applied: e4 holds a white pawn, e2 empty
  assert.equal(board[4][4].type, 'p'); // r=4 -> rank4, f=4 -> file e
  assert.equal(board[6][4], null);     // e2 empty
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/chess-state.test.js`
Expected: FAIL — `derivePosition` not exported.

- [ ] **Step 3: Implement `derivePosition`**

In `src/chess-state.js` ans Dateiende anfügen:

```js
export function derivePosition(snapshot) {
  const chess = snapshot.initialFen ? new Chess(snapshot.initialFen) : new Chess();
  for (const san of snapshot.sanMoves) {
    try {
      chess.move(san);
    } catch (_error) {
      break;
    }
  }
  return { board: chess.board(), turn: chess.turn() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/chess-state.test.js`
Expected: PASS (beide neuen + bestehende chess-state-Tests).

- [ ] **Step 5: Commit**

```bash
git add src/chess-state.js test/chess-state.test.js
git commit -m "feat: derivePosition returns the final board for pattern detection"
```

---

### Task 2: Detektion — Batterie, Türme, Pin, Spieß

**Files:**
- Create: `src/patterns.js`
- Test: `test/patterns.test.js`

**Interfaces:**
- Consumes: `board` aus `derivePosition` / `new Chess(fen).board()`.
- Produces: `detectPatterns(board) -> Pattern[]`. In diesem Task erkennt es `battery`, `rooks`, `pin`, `skewer`. (Task 3 ergänzt die restlichen.)

- [ ] **Step 1: Failing test schreiben**

Erstelle `test/patterns.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/patterns.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/patterns.js`**

```js
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
    ...detectPinsAndSkewers(at)
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/patterns.test.js`
Expected: PASS (6 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/patterns.js test/patterns.test.js
git commit -m "feat: detect battery, doubled rooks, pin and skewer patterns"
```

---

## Phase 2 — Detektion Rest

### Task 3: Detektion — Fianchetto, Außenposten, Freibauer

**Files:**
- Modify: `src/patterns.js`
- Test: `test/patterns.test.js`

**Interfaces:**
- Consumes: die Helfer aus Task 2 (`pieceAt`, `toSquare`, `indexBoard`).
- Produces: `detectPatterns` erkennt zusätzlich `fianchetto`, `outpost`, `passed-pawn`.

- [ ] **Step 1: Failing tests schreiben**

An `test/patterns.test.js` anhängen:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/patterns.test.js`
Expected: the 3 positive new tests FAIL (types not yet produced).

- [ ] **Step 3: Implement the three detectors**

In `src/patterns.js`: füge die Helfer + Detektoren ein und erweitere `detectPatterns`.

Nach `pieceAt` ergänzen:
```js
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
```

`detectPatterns` erweitern:
```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/patterns.test.js`
Expected: PASS (alle 10).

- [ ] **Step 5: Commit**

```bash
git add src/patterns.js test/patterns.test.js
git commit -m "feat: detect fianchetto, outpost and passed-pawn patterns"
```

---

## Phase 3 — Highlight-Schicht

### Task 4: `PatternOverlay`

**Files:**
- Create: `src/pattern-overlay.js`
- Test: `test/pattern-overlay.test.js`

**Interfaces:**
- Consumes: `boardLocalSquareCenter` aus `./board-geometry.js`.
- Produces: `patternColor(side, isBlackOrientation) -> string` (pure, getestet); `class PatternOverlay` mit `attach()`, `sync()`, `render(patterns)`, `clear()`. Eigenes Canvas `id="lichess-pattern-overlay"`, `zIndex 99997`.

- [ ] **Step 1: Failing test (reiner Farbteil)**

Erstelle `test/pattern-overlay.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { patternColor } from '../src/pattern-overlay.js';

test('bottom side is green, top side is red (white orientation)', () => {
  assert.equal(patternColor('w', false), '#3bd17a');
  assert.equal(patternColor('b', false), '#e5564b');
});

test('orientation flips which side is the viewer (black orientation)', () => {
  assert.equal(patternColor('b', true), '#3bd17a');
  assert.equal(patternColor('w', true), '#e5564b');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/pattern-overlay.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/pattern-overlay.js`**

```js
import { boardLocalSquareCenter } from './board-geometry.js';

const GREEN = '#3bd17a';
const RED = '#e5564b';

export function patternColor(side, isBlackOrientation) {
  const bottomSide = isBlackOrientation ? 'b' : 'w';
  return side === bottomSide ? GREEN : RED;
}

export class PatternOverlay {
  constructor({
    document = globalThis.document,
    devicePixelRatio = globalThis.devicePixelRatio ?? 1,
    ResizeObserver = globalThis.ResizeObserver,
    getContext = (canvas) => canvas.getContext?.('2d')
  } = {}) {
    this.document = document;
    this.devicePixelRatio = devicePixelRatio;
    this.ResizeObserver = ResizeObserver;
    this.getContext = getContext;
    this.canvas = null;
    this.board = null;
    this.resizeObserver = null;
  }

  attach() {
    this.board = this.document.querySelector('cg-board');
    if (!this.board) return null;
    this.canvas = this.document.getElementById('lichess-pattern-overlay');
    if (!this.canvas) {
      this.canvas = this.document.createElement('canvas');
      this.canvas.id = 'lichess-pattern-overlay';
      Object.assign(this.canvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: '99997' });
      this.document.body.appendChild(this.canvas);
    }
    if (this.ResizeObserver && !this.resizeObserver) {
      this.resizeObserver = new this.ResizeObserver(() => this.sync());
      this.resizeObserver.observe(this.board);
    }
    return this.canvas;
  }

  sync() {
    if (!this.board) this.board = this.document.querySelector('cg-board');
    if (!this.board || !this.canvas) return null;
    const rect = this.board.getBoundingClientRect();
    const size = rect.width;
    const dpr = this.devicePixelRatio;
    Object.assign(this.canvas.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${size}px`, height: `${size}px` });
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    const context = this.getContext(this.canvas);
    context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    const isBlackOrientation = this.document.querySelector('.cg-wrap')?.classList.contains('orientation-black') ?? false;
    return { context, size, isBlackOrientation };
  }

  render(patterns) {
    if (!this.canvas) this.attach();
    const state = this.sync();
    if (!state || !state.context) return;
    const { context, size, isBlackOrientation } = state;
    context.clearRect(0, 0, size, size);
    for (const pattern of patterns) this._draw(pattern, context, size, isBlackOrientation);
  }

  clear() {
    const state = this.sync();
    if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
  }

  _draw(pattern, ctx, size, isBlackOrientation) {
    const color = patternColor(pattern.side, isBlackOrientation);
    const sq = size / 8;
    const center = (square) => boardLocalSquareCenter(square, size, isBlackOrientation);

    // glow ring on each involved square
    for (const square of pattern.squares) {
      const { x, y } = center(square);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, sq * 0.06);
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.35;
      const inset = sq * 0.12;
      ctx.strokeRect(x - sq / 2 + inset, y - sq / 2 + inset, sq - inset * 2, sq - inset * 2);
      ctx.restore();
    }

    // axis line
    if (pattern.line) {
      const a = center(pattern.line.from);
      const b = center(pattern.line.to);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, sq * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }

    // label near the first square
    const key = center(pattern.squares[0]);
    const fontPx = Math.max(9, Math.round(sq * 0.22));
    ctx.save();
    ctx.font = `600 ${fontPx}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = pattern.label;
    const w = ctx.measureText(text).width + fontPx * 0.7;
    const h = fontPx * 1.5;
    const ly = key.y - sq * 0.42;
    ctx.fillStyle = 'rgba(20,18,28,0.85)';
    ctx.beginPath();
    ctx.roundRect(key.x - w / 2, ly - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, key.x, ly);
    ctx.restore();
  }
}
```

- [ ] **Step 4: Run test + syntax check**

Run:
```bash
node --test test/pattern-overlay.test.js
node --check src/pattern-overlay.js
```
Expected: 2 Tests PASS; `node --check` Exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/pattern-overlay.js test/pattern-overlay.test.js
git commit -m "feat: persistent pattern overlay (glow + axis line + label)"
```

---

## Phase 4 — Integration + Settings + Popup

### Task 5: `settings.patternsOn`

**Files:**
- Modify: `src/settings.js`
- Test: `test/settings.test.js`

**Interfaces:**
- Consumes: nichts neu.
- Produces: `DEFAULT_SETTINGS.patternsOn = true`; `mergeSettings` erzwingt Boolean.

- [ ] **Step 1: Failing test**

An `test/settings.test.js` anhängen:

```js
test('patternsOn defaults to true and coerces to boolean', () => {
  assert.equal(mergeSettings({}).patternsOn, true);
  assert.equal(mergeSettings({ patternsOn: false }).patternsOn, false);
  assert.equal(mergeSettings({ patternsOn: 'yes' }).patternsOn, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/settings.test.js`
Expected: FAIL — `patternsOn` undefined.

- [ ] **Step 3: Implement**

In `src/settings.js`: in `DEFAULT_SETTINGS` nach `buildupMs: 0,` ergänzen `patternsOn: true,` und im `mergeSettings`-Rückgabeobjekt nach der `buildupMs`-Zeile ergänzen:
```js
    patternsOn: typeof s.patternsOn === 'boolean' ? s.patternsOn : DEFAULT_SETTINGS.patternsOn,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/settings.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings.js test/settings.test.js
git commit -m "feat: add patternsOn setting (default on)"
```

---

### Task 6: Runtime-Integration

**Files:**
- Modify: `src/runtime.js`
- Test: `test/runtime.test.js`

**Interfaces:**
- Consumes: `derivePosition` (Task 1), `detectPatterns` (Tasks 2/3), `PatternOverlay` (Task 4), `settings.patternsOn` (Task 5).
- Produces: `createRuntime` akzeptiert zusätzlich `patternOverlay`, `derivePositionFn`, `detectPatternsFn` (alle mit Default = die echten); zeichnet Muster bei Stellungswechsel, leert bei `patternsOn=false`.

- [ ] **Step 1: Failing tests**

An `test/runtime.test.js` anhängen:

```js
test('patterns are rendered on scan when patternsOn is true', () => {
  const doc = setupDoc();
  const rendered = [];
  const fakeOverlay = { render: (ps) => rendered.push(ps), clear() {} };
  const sentinel = [{ type: 'battery', side: 'w', squares: ['d1'], line: null, label: 'Batterie' }];
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    patternOverlay: fakeOverlay,
    derivePositionFn: () => ({ board: [], turn: 'w' }),
    detectPatternsFn: () => sentinel
  }));
  rt.start();
  assert.equal(rendered.length, 1);
  assert.deepEqual(rendered[0], sentinel);
});

test('patterns are cleared (not rendered) when patternsOn is false', () => {
  const doc = setupDoc();
  let cleared = 0;
  const rendered = [];
  const fakeOverlay = { render: (ps) => rendered.push(ps), clear: () => { cleared++; } };
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, patternsOn: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play() {}, tick() {} }),
    patternOverlay: fakeOverlay,
    derivePositionFn: () => ({ board: [], turn: 'w' }),
    detectPatternsFn: () => [{ type: 'battery', side: 'w', squares: ['d1'], line: null, label: 'Batterie' }]
  }));
  rt.start();
  assert.equal(rendered.length, 0);
  assert.ok(cleared >= 1);
});
```

Note: `baseOpts`'s `readSnapshotFn` returns `{ id: 's1' }` — extend it so the snapshot also has `sanMoves`. In `baseOpts`, change `readSnapshotFn: () => ({ id: 's1' })` to `readSnapshotFn: () => ({ id: 's1', sanMoves: ['e4'] })` (the pattern path reads `snapshot.sanMoves` for its signature).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/runtime.test.js`
Expected: FAIL — overlay never called (no pattern wiring yet).

- [ ] **Step 3: Implement runtime wiring**

In `src/runtime.js`:

a) Imports ergänzen:
```js
import { derivePosition } from './chess-state.js';
import { detectPatterns } from './patterns.js';
import { PatternOverlay } from './pattern-overlay.js';
```

b) Optionen erweitern — in der `createRuntime({ ... })`-Destrukturierung nach `observerFactory` ergänzen:
```js
  patternOverlay = new PatternOverlay(),
  derivePositionFn = derivePosition,
  detectPatternsFn = detectPatterns,
```

c) State nach `let observer = null;` ergänzen:
```js
  let lastPatternSig = null;
  let lastSnapshot = null;
```

d) Pattern-Render-Helfer (vor `function scan()` einfügen):
```js
  function patternSig(snapshot) {
    if (!snapshot) return null;
    const moves = snapshot.sanMoves || [];
    return `${snapshot.id}|${moves.length}|${moves[moves.length - 1] || ''}`;
  }

  function renderPatterns(snapshot, force) {
    if (!settings.patternsOn) {
      patternOverlay.clear();
      lastPatternSig = null;
      return;
    }
    const sig = patternSig(snapshot);
    if (!force && sig === lastPatternSig) return;
    lastPatternSig = sig;
    if (!snapshot) {
      patternOverlay.clear();
      return;
    }
    const { board } = derivePositionFn(snapshot);
    patternOverlay.render(detectPatternsFn(board));
  }
```

e) `scan()` erweitern:
```js
  function scan() {
    const snapshot = readSnapshotFn(doc, loc);
    lastSnapshot = snapshot;
    const events = stream.next(snapshot);
    events.forEach((event) => renderCapture(event, snapshot?.id));
    renderPatterns(snapshot, false);
  }
```

f) `applyConfig` — am Ende der Funktion (nach dem Renderer-Block) ergänzen:
```js
    if (partial && 'patternsOn' in partial) {
      renderPatterns(lastSnapshot, true);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/runtime.test.js`
Expected: PASS (beide neuen + bestehende Runtime-Tests).

- [ ] **Step 5: Full gate (beide Builds + Bundle committen)**

Run:
```bash
npm test
npm run build
node --check lichess-kill-notifier.user.js
npm run build:ext
node --check dist/extension/content.js
```
Expected: alle grün; beide Builds erfolgreich.

- [ ] **Step 6: Commit (inkl. rebuildetem Userscript)**

```bash
git add src/runtime.js test/runtime.test.js lichess-kill-notifier.user.js
git commit -m "feat: wire pattern detection + overlay into the runtime"
```

---

### Task 7: Popup-Toggle „Pattern hints"

**Files:**
- Modify: `extension/popup.html`
- Modify: `src/popup-entry.js`

**Interfaces:**
- Consumes: `mergeSettings` (Task 5); `chrome.storage.sync`.
- Produces: ein Checkbox-Control `id="patterns"` das `{ patternsOn }` schreibt; der Content-Script aktualisiert live (vorhandener `storage.onChanged`).

- [ ] **Step 1: Popup-HTML ergänzen**

In `extension/popup.html` nach der `sound`-Zeile (`<div class="row"><label for="sound">…`) eine Zeile ergänzen:
```html
  <div class="row"><label for="patterns">Pattern hints</label><input id="patterns" type="checkbox"></div>
```

- [ ] **Step 2: Popup-Logik ergänzen**

In `src/popup-entry.js`:
- in `load()` nach der `sound`-Zeile ergänzen: `byId('patterns').checked = s.patternsOn;`
- bei den Event-Listenern ergänzen:
```js
byId('patterns').addEventListener('change', (e) => save({ patternsOn: e.target.checked }));
```

- [ ] **Step 3: Build + Verifikation**

Run:
```bash
npm run build:ext
node --check dist/extension/popup.js
```
Expected: Build ok; `node --check` Exit 0; `dist/extension/popup.html` enthält das `patterns`-Control. `npm test` weiter grün (separat).

- [ ] **Step 4: Commit**

```bash
git add extension/popup.html src/popup-entry.js
git commit -m "feat: pattern hints toggle in the extension popup"
```

---

## Phase 5 — Referenz-Doc

### Task 8: `docs/PATTERNS.md` + Popup-Link

**Files:**
- Create: `docs/PATTERNS.md`
- Modify: `extension/popup.html`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts.
- Produces: Doku.

- [ ] **Step 1: Referenz-Doc**

Erstelle `docs/PATTERNS.md`:

```markdown
# Chess Patterns — what the highlights mean

The extension highlights static formations on the board. Green = the side you're
viewing from (bottom), red = the opponent (top).

- **Batterie (Battery)** — a queen lined up behind a rook (file/rank) or a bishop
  (diagonal). Doubles the firepower along that line; strong for attacking.
- **Türme (Connected/doubled rooks)** — two rooks on the same file or rank with a
  clear line. They defend each other and control the line; a classic strength.
- **Pin** — a piece can't move because a more valuable piece (or the king) sits
  behind it on the same line. The pinned piece is partly paralysed.
- **Spieß (Skewer)** — like a pin reversed: the valuable piece is in front and
  must move, exposing the piece behind it. Usually wins material.
- **Fianchetto** — a bishop developed to b2/g2/b7/g7 behind its flank pawns,
  raking a long diagonal. A solid, flexible setup.
- **Außenposten (Outpost)** — a knight on a square deep in enemy territory,
  protected by a pawn and safe from enemy pawns. A powerful, permanent post.
- **Freibauer (Passed pawn)** — a pawn with no enemy pawns ahead on its file or
  the adjacent files. A long-term winning asset, especially in the endgame.
```

- [ ] **Step 2: Popup-Link**

In `extension/popup.html` im `<footer>` einen Link ergänzen (Ziel = die gehostete Doc; bis zum Hosting Repo-relativer Hinweis):
```html
  <footer>Effects show on captures at lichess.org · <a href="https://github.com/gapsong/lichess-kill-anim/blob/main/docs/PATTERNS.md" target="_blank" rel="noopener">What do the highlights mean?</a></footer>
```
(Falls der bestehende `<footer>` anderen Text hat, den Link anhängen statt ersetzen.)

- [ ] **Step 3: CLAUDE.md ergänzen**

In `CLAUDE.md` bei den Modulen ergänzen:
```markdown
- `src/patterns.js`: erkennt statische Formationen (`detectPatterns(board)` → battery/rooks/pin/skewer/fianchetto/outpost/passed-pawn)
- `src/pattern-overlay.js`: persistente zweite Canvas-Schicht, zeichnet erkannte Muster (Linie + Glow + Label); Toggle `patternsOn`
- `src/chess-state.js`: zusätzlich `derivePosition(snapshot)` → Endstellung (`chess.board()`) für die Muster-Erkennung
```

- [ ] **Step 4: Verifikation**

Run: `npm test && npm run build && node --check lichess-kill-notifier.user.js && npm run build:ext && npm run build:gallery`
Expected: alles grün/erfolgreich (reine Doku/Popup-Änderung; Popup-Build enthält den Link).

- [ ] **Step 5: Commit**

```bash
git add docs/PATTERNS.md extension/popup.html CLAUDE.md
git commit -m "docs: pattern reference + popup link"
```

---

## Self-Review

- **Spec coverage:** A (`derivePosition`) → Task 1; B (Detektion 7 Muster) → Tasks 2,3; C (`PatternOverlay`) → Task 4; D (Runtime-Integration, Snapshot-Sig-Cache, DI, `patternsOn`-Wechsel) → Task 6; E (Settings + Popup) → Tasks 5,7; F (Referenz-Doc) → Task 8; G (Tests) → Tasks 1–6; H (Build/Manifest, Bundle-Commit) → Task 6. Farbzuordnung grün/rot nach Orientierung → Task 4. Alle Spec-Abschnitte abgedeckt.
- **Placeholder scan:** Keine TBD/„handle edge cases". Jeder Code-Step enthält vollständigen Code; Test-FENs sind konkret.
- **Type consistency:** `Pattern`-Form `{type,side,squares,line,label}` über patterns.js + pattern-overlay + Tests identisch. `detectPatterns(board)`, `derivePosition(snapshot)->{board,turn}`, `patternColor(side,isBlackOrientation)`, `PatternOverlay.{attach,sync,render,clear}`, Runtime-Deps `patternOverlay`/`derivePositionFn`/`detectPatternsFn`, `settings.patternsOn` — über alle Tasks konsistent. Helfer `pieceAt`/`toSquare`/`indexBoard`/`firstHit`/`movesAlong` in Task 2 definiert, in Task 3 wiederverwendet.
