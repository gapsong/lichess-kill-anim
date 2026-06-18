import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleMessages = [];
page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

await page.goto('https://lichess.org/analysis', {
  waitUntil: 'load',
  timeout: 45_000
});

await page.waitForTimeout(8_000);

const result = await page.evaluate(() => {
  const SELECTORS = [
    'move san',
    '.analyse__moves san',
    '.tview2 move san',
    'l4x kwdb',
    'rm6 l4x kwdb',
    'move',
    'san',
    'kwdb',
    '[data-fen]',
    '[data-initial-fen]',
    'input.copyable',
    '.analyse__underboard input',
    'cg-board',
    '.cg-wrap',
    '.tview2',
    '.analyse__moves',
    'move.active',
    'move.current',
    'move.m2'
  ];

  const sample = (s) =>
    [...document.querySelectorAll(s)].slice(0, 5).map((el) => ({
      tag: el.tagName.toLowerCase(),
      classes: el.className?.toString?.().trim().slice(0, 80) || null,
      text: el.textContent?.trim().slice(0, 80) || null,
      value: el.value?.slice(0, 120) || null,
      dataAttrs: [...el.attributes]
        .filter((a) => a.name.startsWith('data-'))
        .map((a) => [a.name, a.value.slice(0, 80)])
    }));

  const fenValues = {
    '[data-fen]': document.querySelector('[data-fen]')?.dataset?.fen ?? null,
    '[data-initial-fen]':
      document.querySelector('[data-initial-fen]')?.getAttribute('data-initial-fen') ?? null,
    'input.copyable': document.querySelector('input.copyable')?.value ?? null,
    '.analyse__underboard input':
      document.querySelector('.analyse__underboard input')?.value ?? null
  };

  const tviewHtml = document.querySelector('.tview2')?.outerHTML?.slice(0, 3000) ?? null;
  const analyseMovesHtml =
    document.querySelector('.analyse__moves')?.outerHTML?.slice(0, 3000) ?? null;

  const moveLike =
    /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?|O-O(-O)?)$/;
  const sanNodes = [...document.querySelectorAll('body *')]
    .filter(
      (el) => moveLike.test(el.textContent?.trim() ?? '') && el.children.length === 0
    )
    .slice(0, 25)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      classes: el.className?.toString?.().trim() || null,
      text: el.textContent.trim(),
      parent: `${el.parentElement?.tagName.toLowerCase()} .${el.parentElement?.className?.toString?.().trim()}`,
      grand: `${el.parentElement?.parentElement?.tagName.toLowerCase()} .${el.parentElement?.parentElement?.className?.toString?.().trim()}`
    }));

  return {
    url: location.href,
    title: document.title,
    counts: Object.fromEntries(SELECTORS.map((s) => [s, document.querySelectorAll(s).length])),
    samples: Object.fromEntries(SELECTORS.map((s) => [s, sample(s)])),
    fenValues,
    tviewHtml,
    analyseMovesHtml,
    sanNodes,
    bodyTextSlice: document.body.innerText.slice(0, 800)
  };
});

console.log(
  JSON.stringify({ ...result, consoleMessages: consoleMessages.slice(-20) }, null, 2)
);

await browser.close();
