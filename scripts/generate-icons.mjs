import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'extension', 'icons');
mkdirSync(outDir, { recursive: true });

const sizes = [16, 48, 128];
const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of sizes) {
  const dataUrl = await page.evaluate((S) => {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#15131f';
    ctx.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#b98cff';
    ctx.lineWidth = Math.max(1, S * 0.09);
    ctx.shadowColor = '#b98cff';
    ctx.shadowBlur = S * 0.18;
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.34, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = '#ecd9ff';
    ctx.lineWidth = Math.max(1, S * 0.05);
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.2, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, S * 0.05), 0, 6.2832); ctx.fill();
    return c.toDataURL('image/png');
  }, size);
  writeFileSync(path.join(outDir, `icon-${size}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', `icon-${size}.png`);
}

await browser.close();
