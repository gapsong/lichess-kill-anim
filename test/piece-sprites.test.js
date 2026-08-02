import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { PieceSprites, extractCssUrl } from '../src/piece-sprites.js';

test('extractCssUrl parses computed background-image values', () => {
  assert.equal(extractCssUrl('url("https://lichess1.org/assets/hashed/bN.28c70309.svg")'), 'https://lichess1.org/assets/hashed/bN.28c70309.svg');
  assert.equal(extractCssUrl("url('/x/wK.svg')"), '/x/wK.svg');
  assert.equal(extractCssUrl('url(data:image/svg+xml;base64,abc=)'), 'data:image/svg+xml;base64,abc=');
  assert.equal(extractCssUrl('none'), null);
  assert.equal(extractCssUrl(null), null);
});

function fakeImage() {
  return { set src(value) { this._src = value; }, get src() { return this._src; } };
}

test('probes a hidden piece element inside cg-board and serves the loaded image', () => {
  const dom = new JSDOM('<div class="cg-wrap"><cg-container><cg-board></cg-board></cg-container></div>');
  const { document } = dom.window;
  const probed = [];

  const sprites = new PieceSprites({
    document,
    getComputedStyle: (el) => {
      probed.push(el.className);
      return { backgroundImage: `url("https://x/${el.className.replace(' ', '-')}.svg")` };
    },
    createImage: fakeImage
  });

  // not loaded yet -> null, but the probe ran inside cg-board and was removed
  assert.equal(sprites.get('w', 'n'), null);
  assert.deepEqual(probed, ['white knight']);
  assert.equal(document.querySelector('cg-board').children.length, 0);

  const entry = sprites.cache.get('wn');
  assert.equal(entry.image.src, 'https://x/white-knight.svg');

  // once loaded, get() returns the image; no second probe happens
  entry.image.onload();
  assert.equal(sprites.get('w', 'n'), entry.image);
  assert.equal(probed.length, 1);
});

test('returns null and falls back cleanly when no board exists yet, retries later', () => {
  const dom = new JSDOM('<main></main>');
  const { document } = dom.window;
  const sprites = new PieceSprites({
    document,
    getComputedStyle: () => ({ backgroundImage: 'url(https://x/p.svg)' }),
    createImage: fakeImage
  });

  assert.equal(sprites.get('b', 'q'), null);
  assert.equal(sprites.cache.has('bq'), false); // no board -> not cached as failed

  document.body.innerHTML = '<cg-board></cg-board>';
  assert.equal(sprites.get('b', 'q'), null); // now probing succeeds, image loading
  assert.equal(sprites.cache.get('bq').image.src, 'https://x/p.svg');
});

test('failed image load caches null so the glyph fallback stays active', () => {
  const dom = new JSDOM('<cg-board></cg-board>');
  const { document } = dom.window;
  const sprites = new PieceSprites({
    document,
    getComputedStyle: () => ({ backgroundImage: 'url(https://x/broken.svg)' }),
    createImage: fakeImage
  });

  sprites.get('w', 'k');
  sprites.cache.get('wk').image.onerror();
  assert.equal(sprites.get('w', 'k'), null);
  assert.equal(sprites.cache.get('wk'), null);
});
