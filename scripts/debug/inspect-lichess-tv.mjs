import { chromium } from 'playwright';

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

await page.waitForTimeout(8_000);

const result = await page.evaluate(() => {
  const selectors = [
    'move san',
    '.analyse__moves san',
    '.tview2 move san',
    'l4x move san',
    'kwdb move san',
    'rm6 move san',
    'move',
    'san',
    'cg-board',
    '.cg-wrap',
    '.tview2',
    '.analyse__moves',
    'script[type="application/json"]'
  ];

  const sample = (selector) => [...document.querySelectorAll(selector)]
    .slice(0, 20)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      className: element.className?.toString?.() ?? '',
      text: element.textContent?.trim().slice(0, 120) ?? '',
      attrs: [...element.attributes].slice(0, 8).map((attr) => [attr.name, attr.value])
    }));

  const lichessKeys = Object.keys(window.lichess ?? {});
  const bodyText = document.body.innerText.slice(0, 1200);
  const moveLikeElements = [...document.querySelectorAll('body *')]
    .filter((element) => /^(e4|Nf6|dxe4|Qxd1\+|axb3\+)$/.test(element.textContent?.trim() ?? ''))
    .slice(0, 30)
    .map((element) => {
      const parent = element.parentElement;
      const grand = parent?.parentElement;
      return {
        tag: element.tagName.toLowerCase(),
        className: element.className?.toString?.() ?? '',
        text: element.textContent?.trim() ?? '',
        parentTag: parent?.tagName.toLowerCase() ?? '',
        parentClass: parent?.className?.toString?.() ?? '',
        parentText: parent?.textContent?.trim().slice(0, 240) ?? '',
        grandTag: grand?.tagName.toLowerCase() ?? '',
        grandClass: grand?.className?.toString?.() ?? '',
        grandText: grand?.textContent?.trim().slice(0, 400) ?? ''
      };
    });

  return {
    url: location.href,
    title: document.title,
    counts: Object.fromEntries(selectors.map((selector) => [selector, document.querySelectorAll(selector).length])),
    samples: Object.fromEntries(selectors.map((selector) => [selector, sample(selector)])),
    moveLikeElements,
    lichessKeys,
    bodyText
  };
});

console.log(JSON.stringify({ ...result, consoleMessages: consoleMessages.slice(-40) }, null, 2));

await browser.close();
