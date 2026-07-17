// Bakes every gallery tile to an optimized animated WebP in gallery/webp/.
// Run from the repo root:  node scripts/debug/bake-gallery-webp/bake.mjs
// Needs: a chromium binary (set CHROMIUM_BIN if playwright's default is missing)
// and ffmpeg with libwebp_anim. Rebake whenever effects, pattern art, or the
// example FENs in gallery/main.js change, then `npm run build:pages`.
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

const PACK_SIZE = 320, PACK_FPS = 24, MAX_FRAMES = 600;
const PAT_SIZE = 240, PAT_FPS = 20, PAT_SECONDS = 7;
// q60 leaves visible temporal ghosting on the wood squares where effects passed;
// q75 clears it for ~35% more bytes — still far below the old GIF sizes.
const WEBP_Q = 75;

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

function encode(framesDir, fps, out) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps),
    '-i', path.join(framesDir, 'frame_%03d.png'), '-c:v', 'libwebp_anim',
    '-q:v', String(WEBP_Q), '-compression_level', '6', '-loop', '0', out]);
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
    sink.save(frame);
    if (cycleDone) break;
  }
  const out = path.join(outDir, `pack-${packId}.webp`);
  encode(dir, PACK_FPS, out);
  console.log(`pack-${packId}.webp  (${sink.count} frames, ${(sink.count / PACK_FPS).toFixed(1)}s)`);
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
