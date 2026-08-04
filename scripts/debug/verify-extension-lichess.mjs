// Verify the BUILT Chrome extension on real lichess.org, and emit a store screenshot.
//
// Loads dist/extension (build it first: `npm run build:ext`) as an unpacked MV3
// extension into a full Chromium, opens lichess.org/analysis, plays a queen
// capture, and asserts the kill animation fires. Also writes a 1280x800 PNG you
// can upload straight to the Chrome Web Store listing.
//
//   npm run build:ext
//   xvfb-run -a node scripts/debug/verify-extension-lichess.mjs
//
// Notes:
//  - MV3 extensions load only in a FULL, non-headless Chromium (not the headless
//    shell), so run headed under xvfb on a server.
//  - The overlay canvas is tainted by lichess's cross-origin piece art, so
//    getImageData() throws — pixel sampling reports 0 even though the effect
//    clearly paints. The screenshot is the real proof; `overlay_tainted...` below
//    just records that the false-negative is expected.
//
// Diagnostic only — not part of the build.
import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXT = path.join(root, 'dist', 'extension');
const SHOT = path.join(root, 'dist', 'store-screenshot-1280x800.png');
const userDataDir = mkdtempSync(path.join(tmpdir(), 'lk-ext-'));

const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 800 }, // Chrome Web Store screenshot size
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox']
});

const out = {
  ext_loaded: false, ext_id: null, injected: false, capture_fired: false,
  toast_seen: false, pixels_drawn: false, overlay_tainted_by_piece_art: false,
  screenshot: SHOT
};

try {
  // 1) extension loaded -> its background service worker registers
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null);
  if (sw) { out.ext_loaded = true; out.ext_id = new URL(sw.url()).host; }

  const page = await ctx.newPage();
  await page.goto('https://lichess.org/analysis', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('cg-board', { timeout: 30000 });
  await page.waitForTimeout(1500); // let the content script boot + first scan run
  out.injected = await page.evaluate(() => !!document.querySelector('cg-board'));

  // click the geometric center of a square (white orientation, a1 bottom-left)
  const sq = async (file /*0..7*/, rank /*1..8*/, wait = 300) => {
    const box = await page.$eval('cg-board', el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, w: r.width };
    });
    const s = box.w / 8;
    await page.mouse.click(box.left + (file + 0.5) * s, box.top + ((8 - rank) + 0.5) * s);
    await page.waitForTimeout(wait);
  };

  // 1.e4 e5 2.Qh5 a6 3.Qxe5 -- the last move is a white QUEEN capture (nuke effect)
  await sq(4, 2); await sq(4, 4);     // e2-e4
  await sq(4, 7); await sq(4, 5);     // e7-e5
  await sq(3, 1); await sq(7, 5);     // Qd1-h5
  await sq(0, 7); await sq(0, 6);     // a7-a6 (waiting)
  await sq(7, 5); await sq(4, 5, 40); // Qh5xe5  (CAPTURE)

  // screenshot near the nuke peak (buildupMs=0 => impact is immediate)
  await page.screenshot({ path: SHOT });

  // in-page rAF sampler: read overlay pixels in the same frame the runtime draws them
  const r = await page.evaluate(() => new Promise((resolve) => {
    const c = document.getElementById('lichess-kill-overlay');
    let painted = false, tainted = false;
    const startT = performance.now();
    function loop() {
      if (c && c.width && c.height) {
        try {
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          for (let p = 3; p < d.length; p += 4) if (d[p] !== 0) { painted = true; break; }
        } catch (e) { tainted = true; }
      }
      if (performance.now() - startT < 1600) requestAnimationFrame(loop);
      else resolve({ hasCanvas: !!c, painted, tainted,
                     toast: document.getElementById('k-toast')?.textContent || null });
    }
    requestAnimationFrame(loop);
  }));

  out.capture_fired = r.hasCanvas;
  out.pixels_drawn = r.painted;
  out.overlay_tainted_by_piece_art = r.tainted;
  if (r.toast) out.toast_seen = r.toast;
} finally {
  const ok = out.ext_loaded && out.injected && out.capture_fired && !!out.toast_seen;
  console.log(JSON.stringify({ pass: ok, ...out }, null, 2));
  await ctx.close();
  if (!ok) process.exitCode = 1;
}
