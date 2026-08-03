// DEMO: capture gallery tiles from the REAL lichess.org board instead of the
// file:// canvas replica in bake-gallery-webp/. Proves the "echtes Board" path
// on two tiles (pattern-pin, pack-nuke) before deciding to convert all 28.
//
// Per tile: open lichess.org/analysis with the position FEN, inject the built
// userscript (bypassCSP context = what Tampermonkey effectively does), record
// the page via CDP screencast, detect the effect window by polling the overlay
// canvases for non-blank pixels, then crop the real cg-board region, resample
// to a uniform fps and encode with img2webp -kmax 1 (all-keyframe, same
// contract as the baked tiles).
//
// Usage: node scripts/debug/capture-live-tiles.mjs <outDir>
// Needs: network to lichess.org, img2webp on PATH, playwright chromium.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'live-tiles'));
const userscript = readFileSync(path.join(root, 'lichess-kill-notifier.user.js'), 'utf8');
// System ffmpeg — playwright's bundled ffmpeg-linux is a stripped WebM-only
// build without the PNG/image2 demuxer and cannot read the frame sequences.
const FFMPEG = '/usr/bin/ffmpeg';

const VIEW = { width: 1440, height: 1000 };
const WEBP_Q = 75;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function newLichessPage(fenUrl) {
  const context = await browser.newContext({ bypassCSP: true, viewport: VIEW });
  const page = await context.newPage();
  await page.goto(fenUrl, { waitUntil: 'load', timeout: 45_000 });
  await page.waitForSelector('cg-board', { timeout: 20_000 });
  await page.waitForTimeout(1500); // let chessground settle / piece CSS load
  // The live analysis page exposes the custom start position only in the
  // underboard FEN input — there is no [data-fen] element, so MoveFeed would
  // assume the standard start position and reject every SAN as illegal.
  // Demo-only shim: mirror the FEN into a data-fen attribute the userscript
  // already reads. (Known gap, noted for a real fix in move-feed.js.)
  await page.evaluate(() => {
    const fen = document.querySelector('input.copyable')?.value
      || document.querySelector('.analyse__underboard input')?.value;
    if (fen) document.body.setAttribute('data-fen', fen);
  });
  return { context, page };
}

// Poll overlay ACTIVITY via draw-call counters, not pixel readback: the live
// renderer drawImages the lichess CDN piece sprites without crossOrigin, which
// TAINTS the kill-overlay canvas — any getImageData/drawImage readback throws
// a SecurityError. (The CDP screencast composites at browser level and is
// unaffected.) Records [epochMs, drewSinceLastTick] pairs per overlay.
async function startOverlayLog(page) {
  await page.evaluate(() => {
    window.__ovlog = { pattern: [], kill: [] };
    const counts = { pattern: 0, kill: 0 };
    const idKey = { 'lichess-pattern-overlay': 'pattern', 'lichess-kill-overlay': 'kill' };
    for (const m of ['arc', 'drawImage', 'fill', 'stroke', 'fillRect', 'fillText']) {
      const orig = CanvasRenderingContext2D.prototype[m];
      CanvasRenderingContext2D.prototype[m] = function (...a) {
        const key = idKey[this.canvas?.id];
        if (key) counts[key]++;
        return orig.apply(this, a);
      };
    }
    let last = { pattern: 0, kill: 0 };
    setInterval(() => {
      for (const key of ['pattern', 'kill']) {
        window.__ovlog[key].push([Date.now(), counts[key] > last[key]]);
        last[key] = counts[key];
      }
    }, 60);
  });
}

async function startScreencast(context, page, frames) {
  const client = await context.newCDPSession(page);
  client.on('Page.screencastFrame', (ev) => {
    frames.push({ buf: Buffer.from(ev.data, 'base64'), ts: ev.metadata.timestamp * 1000 });
    client.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast',
    { format: 'png', maxWidth: VIEW.width, maxHeight: VIEW.height, everyNthFrame: 1 });
  return client;
}

// Pick, for each uniform-timeline tick, the latest captured frame at or before
// it (screencast only emits frames on repaint, so gaps = static board).
function resample(frames, t0, t1, fps) {
  const picked = [];
  const step = 1000 / fps;
  let i = 0;
  for (let t = t0; t <= t1; t += step) {
    while (i + 1 < frames.length && frames[i + 1].ts <= t) i++;
    picked.push(frames[i]);
  }
  return picked;
}

function encode(picked, boardRect, size, fps, outBase) {
  const tmp = path.join(outDir, '.tmp-' + path.basename(outBase));
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(path.join(tmp, 'raw'), { recursive: true });
  mkdirSync(path.join(tmp, 'crop'), { recursive: true });
  picked.forEach((f, n) =>
    writeFileSync(path.join(tmp, 'raw', `f_${String(n).padStart(3, '0')}.png`), f.buf));
  const { x, y, w, h } = boardRect;
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-start_number', '0',
    '-i', path.join(tmp, 'raw', 'f_%03d.png'),
    '-vf', `crop=${w}:${h}:${x}:${y},scale=${size}:${size}:flags=lanczos`,
    '-start_number', '0', path.join(tmp, 'crop', 'f_%03d.png')]);
  const cropped = readdirSync(path.join(tmp, 'crop')).filter((f) => f.endsWith('.png')).sort()
    .map((f) => path.join(tmp, 'crop', f));
  execFileSync('img2webp', ['-loop', '0', '-lossy', '-q', String(WEBP_Q), '-m', '6',
    '-d', String(Math.round(1000 / fps)), '-kmax', '1', ...cropped, '-o', `${outBase}.webp`]);
  // mp4 twin for quick inline viewing (Telegram plays it directly)
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(fps),
    '-i', path.join(tmp, 'crop', 'f_%03d.png'),
    '-pix_fmt', 'yuv420p', '-crf', '20', `${outBase}.mp4`]);
  rmSync(tmp, { recursive: true, force: true });
}

async function boardRect(page) {
  const r = await page.evaluate(() => {
    const b = document.querySelector('cg-board').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.floor(r.w / 2) * 2, h: Math.floor(r.h / 2) * 2 };
}

// Window where an overlay was continuously active (first true .. last true).
function activeWindow(log) {
  const on = log.filter(([, v]) => v).map(([t]) => t);
  return on.length ? { start: on[0], end: on[on.length - 1] } : null;
}

async function clickSquare(page, rect, file, rank) {
  const sq = rect.w / 8;
  await page.mouse.click(rect.x + (file + 0.5) * sq, rect.y + (7 - rank + 0.5) * sq);
  await page.waitForTimeout(250);
}

// ---- tile 1: pattern-pin from the real analysis board ----------------------
// A zero-move analysis board yields no MoveFeed snapshot (readSnapshot() ->
// null, the script stays silent by design), so the pin position is CREATED by
// playing Bb1-a2 on the real board — that also makes the hint intro pulse part
// of the capture, exactly as a user would see it appear.
async function capturePatternPin() {
  log('pattern-pin: opening real lichess analysis board');
  const { context, page } = await newLichessPage(
    'https://lichess.org/analysis/6k1/8/4n3/8/8/8/8/1B4K1_w_-_-_0_1');
  const frames = [];
  const client = await startScreencast(context, page, frames);
  await startOverlayLog(page);
  await page.addScriptTag({ content: userscript });
  await page.waitForTimeout(2000);
  const r = await boardRect(page);
  log('pattern-pin: playing Bb1-a2 to create the pin, recording');
  await clickSquare(page, r, 1, 0); // b1
  await clickSquare(page, r, 0, 1); // a2
  await page.waitForTimeout(7000);
  const rect = await boardRect(page);
  const ovlog = await page.evaluate(() => window.__ovlog);
  await client.send('Page.stopScreencast');
  await context.close();

  const win = activeWindow(ovlog.pattern);
  if (!win) {
    console.error('ovlog sizes:', ovlog.pattern.length, ovlog.kill.length,
      'pattern true:', ovlog.pattern.filter(([, v]) => v).length,
      'raw frames:', frames.length);
    if (frames.length) writeFileSync(path.join(outDir, 'debug-last-frame.png'), frames[frames.length - 1].buf);
    throw new Error('pattern overlay never drew — no pattern detected on the live board?');
  }
  // Intro pulse is 900ms, then faint steady state: keep 5s from first paint.
  const t0 = win.start - 100, t1 = Math.min(win.start + 5000, frames[frames.length - 1].ts);
  encode(resample(frames, t0, t1, 10), rect, 240, 10, path.join(outDir, 'pattern-pin-LIVE'));
  log('pattern-pin: done,', frames.length, 'raw frames, window', Math.round(t1 - t0), 'ms');
}

// ---- tile 2: pack-nuke — real Qxa8 played on the analysis board ------------
async function capturePackNuke() {
  log('pack-nuke: opening real lichess analysis board');
  const { context, page } = await newLichessPage(
    'https://lichess.org/analysis/r5k1/5ppp/8/8/8/8/5PPP/Q5K1_w_-_-_0_1');
  // The demo shows the kill effect; hints are a separate feature — hide that
  // overlay so the tile matches the pack-* tile content.
  await page.addStyleTag({ content: '#lichess-pattern-overlay { display: none !important; }' });
  const frames = [];
  const client = await startScreencast(context, page, frames);
  await startOverlayLog(page);
  await page.addScriptTag({ content: userscript });
  await page.waitForTimeout(2000);
  const rect = await boardRect(page);
  // Prime the capture stream first: the FIRST snapshot of a context baselines
  // every capture already in the move list silently (anti-replay rule), so a
  // capture in move 1 would be swallowed. A quiet setup move (h2-h3) creates
  // the move list, THEN Qxa8 is a genuinely new capture and fires.
  log('pack-nuke: setup moves h2-h3, h7-h6 (prime the context, keep turn order)');
  await clickSquare(page, rect, 7, 1); // h2
  await clickSquare(page, rect, 7, 2); // h3
  await page.waitForTimeout(1200);
  await clickSquare(page, rect, 7, 6); // h7
  await clickSquare(page, rect, 7, 5); // h6
  await page.waitForTimeout(1800);
  log('pack-nuke: playing Qa1xa8 by click-click');
  await clickSquare(page, rect, 0, 0); // a1
  await clickSquare(page, rect, 0, 7); // a8
  await page.waitForTimeout(6500); // piece slide + full nuke effect
  const ovlog = await page.evaluate(() => window.__ovlog);
  await client.send('Page.stopScreencast');
  await context.close();

  const win = activeWindow(ovlog.kill);
  if (!win) throw new Error('kill overlay never drew — capture not detected on the live board?');
  // Lead-in shows the real chessground piece slide onto a8.
  const t0 = win.start - 600, t1 = win.end + 300;
  encode(resample(frames, t0, t1, 12), rect, 320, 12, path.join(outDir, 'pack-nuke-LIVE'));
  log('pack-nuke: done,', frames.length, 'raw frames, effect window',
    Math.round(win.end - win.start), 'ms');
}

try {
  await capturePatternPin();
  await capturePackNuke();
} finally {
  await browser.close();
}
console.log('live tiles ->', outDir);
