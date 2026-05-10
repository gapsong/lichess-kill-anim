import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { readSnapshot } from '../src/move-feed.js';

test('reads SAN moves from a Lichess-style move list', () => {
  const dom = new JSDOM(`
    <l4x>
      <move><san>e4</san></move>
      <move><san>d5</san></move>
      <move><san>exd5</san></move>
    </l4x>
  `);

  assert.deepEqual(readSnapshot(dom.window.document, { pathname: '/abc123' }), {
    id: '/abc123|start',
    initialFen: null,
    sanMoves: ['e4', 'd5', 'exd5'],
    activePly: null
  });
});

test('reads SAN moves from the Lichess TV custom move list', () => {
  const dom = new JSDOM(`
    <rm6>
      <l4x>
        <index>1</index><kwdb>e4</kwdb><kwdb>Nf6</kwdb>
        <index>2</index><kwdb>e5</kwdb><kwdb>Nd5</kwdb>
        <index>3</index><kwdb>Nf3</kwdb><kwdb>d6</kwdb>
        <index>4</index><kwdb>Nc3</kwdb><kwdb>dxe5</kwdb>
      </l4x>
    </rm6>
  `);

  assert.deepEqual(readSnapshot(dom.window.document, { pathname: '/tv' }), {
    id: '/tv|start',
    initialFen: null,
    sanMoves: ['e4', 'Nf6', 'e5', 'Nd5', 'Nf3', 'd6', 'Nc3', 'dxe5'],
    activePly: null
  });
});

test('preserves repeated SAN moves because repetitions are legal game history', () => {
  const dom = new JSDOM(`
    <rm6>
      <l4x>
        <kwdb>Nf3</kwdb>
        <kwdb>Nf6</kwdb>
        <kwdb>Ng1</kwdb>
        <kwdb>Ng8</kwdb>
        <kwdb>Nf3</kwdb>
      </l4x>
    </rm6>
  `);

  assert.deepEqual(readSnapshot(dom.window.document, { pathname: '/tv' })?.sanMoves, [
    'Nf3',
    'Nf6',
    'Ng1',
    'Ng8',
    'Nf3'
  ]);
});

test('reads SAN moves from the Lichess puzzle move history', () => {
  const dom = new JSDOM(`
    <main class="puzzle puzzle-play">
      <a href="/training/BS3bW">#BS3bW</a>
      <move class="hist">d4</move>
      <move class="hist">e6</move>
      <move class="hist">c4</move>
      <move class="hist">d5</move>
      <move class="hist">Nc3</move>
      <move class="hist">Nf6</move>
      <move class="hist">Bd3</move>
      <move class="hist">dxc4</move>
      <move class="hist">Bxc4</move>
    </main>
  `);

  assert.deepEqual(readSnapshot(dom.window.document, { pathname: '/training' }), {
    id: '/training|puzzle:BS3bW|start',
    initialFen: null,
    sanMoves: ['d4', 'e6', 'c4', 'd5', 'Nc3', 'Nf6', 'Bd3', 'dxc4', 'Bxc4'],
    activePly: null
  });
});

test('uses the puzzle id to distinguish different puzzles on the same route', () => {
  const first = new JSDOM(`
    <main class="puzzle puzzle-play">
      <a href="/training/BS3bW">#BS3bW</a>
      <move>d4</move>
    </main>
  `);
  const second = new JSDOM(`
    <main class="puzzle puzzle-play">
      <a href="/training/guHFy">#guHFy</a>
      <move>Nf3</move>
    </main>
  `);

  assert.equal(readSnapshot(first.window.document, { pathname: '/training' })?.id, '/training|puzzle:BS3bW|start');
  assert.equal(readSnapshot(second.window.document, { pathname: '/training' })?.id, '/training|puzzle:guHFy|start');
});

test('normalizes Lichess puzzle feedback markers from SAN moves', () => {
  const dom = new JSDOM(`
    <main class="puzzle puzzle-play">
      <move class="hist">d4</move>
      <move class="hist">d6</move>
      <move class="current">Bxd1</move>
      <move class="active good">Bxf7+✓</move>
      <move>Ke7</move>
      <move class="good">Nd5#✓</move>
    </main>
  `);

  assert.deepEqual(readSnapshot(dom.window.document, { pathname: '/training' })?.sanMoves, [
    'd4',
    'd6',
    'Bxd1',
    'Bxf7+',
    'Ke7',
    'Nd5#'
  ]);
});

test('reads activePly from the active move element on the analysis board', () => {
  const dom = new JSDOM(`
    <div class="tview2">
      <move><san>e4</san></move>
      <move><san>d5</san></move>
      <move class="active"><san>exd5</san></move>
    </div>
  `);

  const snapshot = readSnapshot(dom.window.document, { pathname: '/analysis' });
  assert.equal(snapshot?.activePly, 3);
});

test('activePly is null when no move.active element exists', () => {
  const dom = new JSDOM(`
    <l4x>
      <kwdb>e4</kwdb><kwdb>Nf6</kwdb>
    </l4x>
  `);

  assert.equal(readSnapshot(dom.window.document, { pathname: '/tv' })?.activePly, null);
});

test('does not use input.copyable as initialFen because it reflects current position', () => {
  const dom = new JSDOM(`
    <div class="tview2">
      <move><san>e4</san></move>
      <move><san>d5</san></move>
      <move class="active"><san>exd5</san></move>
    </div>
    <input class="copyable" value="rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2" />
  `);

  const snapshot = readSnapshot(dom.window.document, { pathname: '/analysis' });
  assert.equal(snapshot?.initialFen, null);
  assert.equal(snapshot?.id, '/analysis|start');
});

test('returns null when no move list is available', () => {
  const dom = new JSDOM('<main><cg-board></cg-board></main>');

  assert.equal(readSnapshot(dom.window.document, { pathname: '/tv' }), null);
});
