import { installSharedHelpers } from './shared.js';
import { mockQueenKillEvent } from './mock-event.js';
import { loadManifest, loadVariants, pickActiveIds, metadataFor } from './variant-loader.js';
import { createCellRunner, startPlayground } from './playground.js';
import {
  createTournament,
  pickWinner,
  nextRound,
  STATUS,
  overallWinner
} from './tournament.js';
import { save, load, clear, exportJson } from './results-store.js';

const PIECE = 'queen';

installSharedHelpers(window);

const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const modalEl = document.getElementById('modal');
const roundNumberEl = document.getElementById('round-number');
const winnerIdEl = document.getElementById('winner-id');
const modalBodyEl = document.getElementById('modal-body');
const btnRefine = document.getElementById('btn-refine');
const btnFromPool = document.getElementById('btn-from-pool');
const btnDone = document.getElementById('btn-done');

let state = null;
let manifest = null;
let stopPlayground = null;

bootstrap().catch((err) => {
  console.error('[lab] bootstrap failed', err);
  statusEl.textContent = `error: ${err.message}`;
});

async function bootstrap() {
  manifest = await loadManifest(PIECE);

  const persisted = load(PIECE);
  if (persisted && persisted.status !== STATUS.DONE) {
    state = persisted;
    statusEl.textContent = `resumed round ${state.round}`;
  } else {
    state = createTournament({ piece: PIECE, candidates: pickActiveIds(manifest, 4) });
    save(PIECE, state);
    statusEl.textContent = `round ${state.round}`;
  }

  await renderRound();
}

async function renderRound() {
  if (stopPlayground) { stopPlayground(); stopPlayground = null; }
  gridEl.innerHTML = '';

  const variants = await loadVariants(PIECE, state.candidates);
  const event = mockQueenKillEvent({ size: 360 });

  const cells = variants.map((variant) => {
    const meta = metadataFor(manifest, variant.id);
    const wrapper = renderCell(variant, meta);
    gridEl.append(wrapper.cell);

    const runner = createCellRunner({
      canvas: wrapper.canvas,
      variant,
      renderEvent: event
    });

    wrapper.cell.addEventListener('click', () => handlePick(variant.id));
    return runner;
  });

  stopPlayground = startPlayground({ cells });
  statusEl.textContent = `round ${state.round} -- pick one`;
}

function renderCell(variant, meta) {
  const cell = document.createElement('section');
  cell.className = 'cell';
  cell.dataset.variantId = variant.id;

  const header = document.createElement('div');
  header.className = 'cell-header';

  const id = document.createElement('span');
  id.className = 'cell-id';
  id.textContent = variant.id;

  const parent = document.createElement('span');
  parent.className = 'cell-parent';
  parent.textContent = meta?.parent ? `parent: ${meta.parent}` : '';

  header.append(id, parent);

  const canvas = document.createElement('canvas');
  canvas.title = meta?.hypothesis ?? '';

  const hypothesis = document.createElement('div');
  hypothesis.className = 'cell-hypothesis';
  hypothesis.textContent = meta?.hypothesis ?? '';

  cell.append(header, canvas, hypothesis);
  return { cell, canvas };
}

function handlePick(variantId) {
  if (state.status !== STATUS.VOTING) return;
  state = pickWinner(state, variantId);
  save(PIECE, state);
  openModal();
}

function openModal() {
  roundNumberEl.textContent = String(state.round);
  winnerIdEl.textContent = state.winnerOfRound ?? '—';
  modalBodyEl.innerHTML = `
    <strong>${state.winnerOfRound}</strong> won round ${state.round}.
    The other 3 candidates are archived.
    <br><br>
    <em>Refine</em>: run the Generator in a terminal:
    <br>
    <code>npm run lab:generate -- ${PIECE} ${state.winnerOfRound}</code>
    <br>
    feed the printed prompt to a Generator agent, save the response, then:
    <br>
    <code>npm run lab:generate -- ${PIECE} ${state.winnerOfRound} --apply &lt;response.md&gt;</code>
    <br>
    Then click <em>Refine</em> — the lab reloads the manifest and seeds the
    next round with the fresh variants.
    <br><br>
    <em>From Pool</em>: skip generation, seed from unused manifest variants.
    <br>
    <em>Done</em>: freeze the tournament and export the result.
  `;
  modalEl.classList.add('open');
}

function closeModal() {
  modalEl.classList.remove('open');
}

btnRefine.addEventListener('click', async () => {
  manifest = await loadManifest(PIECE);
  const usedIds = new Set(state.history.flatMap((h) => [h.winner, ...h.losers]));
  const fresh = manifest.variants
    .map((v) => v.id)
    .filter((id) => !usedIds.has(id) && id !== state.winnerOfRound && !id.startsWith('_'))
    .slice(-3);

  if (fresh.length === 0) {
    statusEl.textContent =
      `no fresh variants in manifest — run: npm run lab:generate -- ${PIECE} ${state.winnerOfRound}`;
    return;
  }

  state = nextRound(state, 'refine', fresh);
  save(PIECE, state);
  closeModal();
  await renderRound();
});

btnFromPool.addEventListener('click', async () => {
  const used = new Set([state.winnerOfRound, ...state.history.flatMap((h) => [h.winner, ...h.losers])]);
  const unused = manifest.variants
    .map((v) => v.id)
    .filter((id) => !used.has(id));

  if (unused.length === 0) {
    statusEl.textContent = 'no unused variants left; pick Refine or Done';
    return;
  }

  state = nextRound(state, 'pool', unused.slice(0, 3));
  save(PIECE, state);
  closeModal();
  await renderRound();
});

btnDone.addEventListener('click', () => {
  state = nextRound(state, 'done');
  save(PIECE, state);
  closeModal();
  const filename = exportJson(state);
  const winner = overallWinner(state);
  statusEl.textContent = `done -- saved ${filename}. winner: ${winner}. promote with: npm run lab:promote queen ${winner}`;
  clear(PIECE);
});
