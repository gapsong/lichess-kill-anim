// Bakes every gallery tile to an optimized animated WebP in gallery/webp/.
// Tiles are LAYERED: the animated WebP holds only pieces + effects on a
// transparent background; the wood board is baked once as a lossless
// board.png that the gallery layers underneath via CSS — so the static board
// never suffers the lossy animation compression and stays sharp.
// Run from the repo root:  node scripts/debug/bake-gallery-webp/bake.mjs
// Needs: a chromium binary (set CHROMIUM_BIN if playwright's default is missing)
// and img2webp from libwebp (Debian/Ubuntu package `webp`). Rebake whenever effects,
// pattern art, or the example FENs in gallery/main.js change, then `npm run build:pages`.
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const outDir = path.join(root, 'gallery', 'webp');
const tmp = path.join(here, '.tmp');

const PACKS = ['signature', 'nuke', 'smash', 'slash', 'zap', 'pixel', 'ascension',
  'splatter', 'inferno', 'vortex', 'shatter', 'void', 'fire', 'arcade'];

// Keep in sync with PATTERN_EXAMPLES in gallery/main.js (slug = label, kebab-cased).
const PATTERNS = [
  ['battery', '6k1/8/4p3/3p4/8/3R4/2P2P2/3Q2K1 w - - 0 1'],
  ['doubled-rooks', '6k1/8/8/3p4/3P4/3R4/8/3R2K1 w - - 0 1'],
  ['pin', '6k1/8/4n3/8/8/8/B7/6K1 w - - 0 1'],
  ['skewer', 'k5r1/6p1/4q1P1/8/8/8/B7/6K1 w - - 0 1'],
  ['fianchetto', '4k3/8/8/6p1/8/6P1/5PBP/6K1 w - - 0 1'],
  ['outpost', '6k1/8/5p2/3N4/4P3/8/8/6K1 w - - 0 1'],
  ['passed-pawn', '6k1/8/8/4P3/8/8/8/6K1 w - - 0 1'],
  ['pawn-chain', '6k1/8/4p3/2p1P3/3P4/2P5/1P6/6K1 w - - 0 1'],
  ['hotspot', '6k1/8/8/4q3/2N3N1/8/1B5B/6K1 w - - 0 1'],
  ['open-file', '6k1/8/8/8/8/8/8/4R1K1 w - - 0 1'],
  ['fortress', '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1'],
  ['fork', 'k7/2q1b3/8/3N4/8/8/8/6K1 w - - 0 1'],
  ['hanging-piece', '6k1/1b6/8/3N4/8/8/8/6K1 w - - 0 1'],
  ['hanging-pawn', '6k1/8/8/8/8/2p5/2P5/B5K1 w - - 0 1']
];

// Halved output fps compensates the size cost of all-keyframe encoding (see
// encode()): full frames are ~4x the bytes of delta frames, half the frames keeps
// the tiles near their old weight. Packs must still STEP at 24fps — the particle
// tail winds down per tick, so a lower capture fps stretches the animation in
// wall time instead of saving frames. Hence: step at PACK_FPS, keep every
// PACK_KEEP_EVERY-th frame, and double the per-frame duration in the file.
// Patterns are purely time-based, so they can simply capture at a lower fps.
const PACK_SIZE = 320, PACK_FPS = 24, PACK_KEEP_EVERY = 2, MAX_FRAMES = 600;
const PAT_SIZE = 240, PAT_FPS = 10, PAT_SECONDS = 7;
// q75 keeps the piece art clean. (The historic q60-vs-q75 ghosting on the wood
// squares is gone by construction — the board is no longer in the WebP at all.)
const WEBP_Q = 75;
// Static board background, shared by all tiles. Rendered big and lossless so
// downscaling in the browser stays crisp on retina screens; flat squares
// compress to a few KB anyway.
const BOARD_PNG_SIZE = 640;

mkdirSync(outDir, { recursive: true });
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

await build({
  entryPoints: [path.join(here, 'capture-entry.js')],
  outfile: path.join(tmp, 'capture.js'),
  bundle: true, format: 'iife', legalComments: 'none'
});
writeFileSync(path.join(tmp, 'capture.html'),
  '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">' +
  '<canvas id="cap"></canvas><script src="capture.js"></script></body></html>');

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_BIN ? { executablePath: process.env.CHROMIUM_BIN } : {})
});
const page = await browser.newPage();
page.on('pageerror', (e) => { console.error('PAGE EXCEPTION:', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(tmp, 'capture.html'));

// Feed the vendored cburnett SVGs (the lichess default set) into the page as
// data URIs — data URIs never taint the canvas, and the bake needs no CDN or
// live lichess page. Every piece in every tile renders from this art; the
// unicode-glyph path only exists as an emergency fallback and would be a bug
// if it showed up in output, so a missing sprite is fatal.
const piecesDir = path.join(here, 'pieces', 'cburnett');
const spriteMap = {};
for (const f of readdirSync(piecesDir).filter((n) => n.endsWith('.svg'))) {
  const key = f[0] + f[1].toLowerCase(); // wK.svg -> 'wk'
  spriteMap[key] = 'data:image/svg+xml;base64,' +
    readFileSync(path.join(piecesDir, f)).toString('base64');
}
const spriteCount = await page.evaluate((m) => window.__loadSprites(m), spriteMap);
if (spriteCount !== 12) {
  console.error(`expected 12 piece sprites, loaded ${spriteCount}`);
  process.exit(1);
}

// Centering gate: the alpha-weighted pixel centroid of every piece must sit
// within 5% of the cell size from the cell center, in x and y. Printed as
// proof, enforced as a regression guard.
const CENTER_TOL_PCT = 5;
const { cell, results } = await page.evaluate(() => window.__measureCentering({ cell: 128 }));
console.log(`piece centering (centroid offset from cell center, ${cell}px cell):`);
console.log('piece | glyph dx,dy (px / % cell) | cburnett dx,dy (px / % cell)');
const byPiece = new Map();
for (const r of results) {
  if (!byPiece.has(r.piece)) byPiece.set(r.piece, {});
  byPiece.get(r.piece)[r.mode] = r;
}
for (const [piece, { glyph, sprite }] of byPiece) {
  const fmt = (r) => r.error ? r.error :
    `${r.dxPx},${r.dyPx}px / ${r.dxPct},${r.dyPct}%`;
  console.log(`${piece}    | ${fmt(glyph)} | ${fmt(sprite)}`);
}
const bad = results.filter((r) => r.mode === 'sprite' &&
  (r.error || Math.abs(r.dxPct) > CENTER_TOL_PCT || Math.abs(r.dyPct) > CENTER_TOL_PCT));
if (bad.length) {
  console.error(`CENTERING FAIL (> ${CENTER_TOL_PCT}% of cell):`, JSON.stringify(bad));
  process.exit(1);
}

// Bake the shared static board background (no pieces, lossless PNG).
const boardPng = await page.evaluate((size) => window.__renderBoard({ size }), BOARD_PNG_SIZE);
writeFileSync(path.join(outDir, 'board.png'),
  Buffer.from(boardPng.split(',')[1], 'base64'));
console.log(`board.png  (${BOARD_PNG_SIZE}px, lossless background layer)`);

function encode(framesDir, fps, out) {
  // -kmax 1 forces every frame to be a full-canvas keyframe. Delta frames (small
  // subrectangles, the default) render fine in Blink but WebKit/iOS Safari draws
  // them at the wrong scale — on a phone the tiles appear zoomed/shifted with
  // ghost residue. Full keyframes make that rendering path impossible.
  const frames = readdirSync(framesDir).filter((f) => f.endsWith('.png')).sort()
    .map((f) => path.join(framesDir, f));
  execFileSync('img2webp', ['-loop', '0', '-lossy', '-q', String(WEBP_Q), '-m', '6',
    '-d', String(Math.round(1000 / fps)), '-kmax', '1', ...frames, '-o', out]);
}

function frameSink(dir) {
  mkdirSync(dir, { recursive: true });
  let n = 0;
  return {
    save(frame) {
      writeFileSync(path.join(dir, `frame_${String(n++).padStart(3, '0')}.png`),
        Buffer.from(frame.split(',')[1], 'base64'));
    },
    get count() { return n; }
  };
}

for (const packId of PACKS) {
  const dir = path.join(tmp, `pack-${packId}`);
  const sink = frameSink(dir);
  await page.evaluate((a) => window.__initCapture(a), { packId, size: PACK_SIZE, scenarioIndices: null });
  for (let i = 0; i < MAX_FRAMES; i++) {
    const { cycleDone, frame } = await page.evaluate((dt) => window.__step(dt), 1000 / PACK_FPS);
    if (i % PACK_KEEP_EVERY === 0) sink.save(frame);
    if (cycleDone) break;
  }
  const out = path.join(outDir, `pack-${packId}.webp`);
  encode(dir, PACK_FPS / PACK_KEEP_EVERY, out);
  console.log(`pack-${packId}.webp  (${sink.count} frames, ${(sink.count / (PACK_FPS / PACK_KEEP_EVERY)).toFixed(1)}s)`);
}

for (const [slug, fen] of PATTERNS) {
  const dir = path.join(tmp, `pattern-${slug}`);
  const sink = frameSink(dir);
  const { patterns } = await page.evaluate((a) => window.__initPatternCapture(a),
    { fen, themeId: 'classic', size: PAT_SIZE });
  if (!patterns) { console.error(`pattern-${slug}: NO PATTERNS DETECTED — fix the FEN`); process.exitCode = 1; }
  for (let i = 0; i < PAT_SECONDS * PAT_FPS; i++) {
    const { frame } = await page.evaluate((dt) => window.__stepPattern(dt), 1000 / PAT_FPS);
    sink.save(frame);
  }
  encode(dir, PAT_FPS, path.join(outDir, `pattern-${slug}.webp`));
  console.log(`pattern-${slug}.webp  (${patterns} pattern(s))`);
}

await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log('baked ->', outDir);
