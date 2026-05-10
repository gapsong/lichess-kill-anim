import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const script = await readFile('lichess-kill-notifier.user.js', 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleMessages = [];
page.on('console', (message) => {
  consoleMessages.push(`${message.type()}: ${message.text()}`);
});

await page.goto('https://lichess.org/tv', {
  waitUntil: 'domcontentloaded',
  timeout: 45_000
});

await page.waitForTimeout(5_000);

await page.evaluate((source) => {
  window.eval(source);
}, script);
await page.waitForTimeout(250);

const result = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  moveCount: document.querySelectorAll('rm6 l4x kwdb, l4x kwdb').length,
  boardCount: document.querySelectorAll('cg-board').length,
  toast: document.querySelector('#k-toast')?.textContent ?? null,
  animationCount: document.querySelectorAll('.ka').length,
  consoleMessages: []
}));

console.log(JSON.stringify({ ...result, consoleMessages: consoleMessages.slice(-30) }, null, 2));

await browser.close();
