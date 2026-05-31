import { installSharedHelpers } from './shared.js';
import { mockQueenKillEvent } from './mock-event.js';
import { loadManifest, loadVariants, pickActiveIds, metadataFor } from './variant-loader.js';
import { createCellRunner, startPlayground } from './playground.js';
import {
  createTournament,
  pickFavorites,
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
const btnConfirm = document.getElementById('btn-confirm');
const likedCountEl = document.getElementById('liked-count');

let state = null;
let manifest = null;
let stopPlayground = null;
let likedIds = new Set();

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
    state = createTournament({ piece: PIECE, candidates: pickActiveIds(manifest) });
    save(PIECE, state);
    statusEl.textContent = `round ${state.round}`;
  }

  await renderRound();
}

async function renderRound() {
  if (stopPlayground) { stopPlayground(); stopPlayground = null; }
  gridEl.innerHTML = '';
  likedIds.clear();
  updateLikeUI();

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

    return runner;
  });

  stopPlayground = startPlayground({ cells });
  statusEl.textContent = `round ${state.round} — like your favourites, then confirm`;
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

  const likeBtn = document.createElement('button');
  likeBtn.className = 'cell-like';
  likeBtn.type = 'button';
  likeBtn.textContent = '♡ Like';
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLike(variant.id);
  });

  cell.append(header, canvas, hypothesis, likeBtn);
  return { cell, canvas };
}

function handleLike(variantId) {
  if (state.status !== STATUS.VOTING) return;
  if (likedIds.has(variantId)) {
    likedIds.delete(variantId);
  } else {
    likedIds.add(variantId);
  }
  updateLikeUI();
}

function updateLikeUI() {
  const count = likedIds.size;
  likedCountEl.textContent = `${count} liked`;
  likedCountEl.style.display = count > 0 ? 'inline' : 'none';
  btnConfirm.disabled = count === 0;

  document.querySelectorAll('.cell').forEach((cell) => {
    const id = cell.dataset.variantId;
    const btn = cell.querySelector('.cell-like');
    const isLiked = likedIds.has(id);
    cell.classList.toggle('liked', isLiked);
    if (btn) {
      btn.classList.toggle('active', isLiked);
      btn.textContent = isLiked ? '♥ Liked' : '♡ Like';
    }
  });
}

function openModal() {
  const liked = state.likedOfRound ?? [state.winnerOfRound];
  const likedList = liked.map((id) => `<strong>${id}</strong>`).join(', ');
  roundNumberEl.textContent = String(state.round);
  winnerIdEl.textContent = liked[0] ?? '—';
  modalBodyEl.innerHTML = `
    Round ${state.round} done. Liked: ${likedList}.
    <br><br>
    <em>Refine</em>: have Claude generate a new batch seeded from your picks:
    <br>
    <code>/lab-generate ${PIECE} ${liked[0]} --count 8</code>
    <br>
    Then click <em>Refine</em> — the lab reloads and shows the fresh variants.
    <br><br>
    <em>From Pool</em>: seed from unused variants already in the manifest.
    <br>
    <em>Done</em>: freeze the tournament and export the result.
  `;
  modalEl.classList.add('open');
}

function closeModal() {
  modalEl.classList.remove('open');
}

btnConfirm.addEventListener('click', () => {
  if (state.status !== STATUS.VOTING || likedIds.size === 0) return;
  state = pickFavorites(state, [...likedIds]);
  save(PIECE, state);
  likedIds.clear();
  updateLikeUI();
  openModal();
});

btnRefine.addEventListener('click', async () => {
  manifest = await loadManifest(PIECE);
  const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
  const usedIds = new Set(state.history.flatMap((h) => [
    ...(h.liked ?? [h.winner]),
    ...(h.disliked ?? h.losers ?? [])
  ]));
  const fresh = manifest.variants
    .map((v) => v.id)
    .filter((id) => !usedIds.has(id) && !liked.includes(id) && !id.startsWith('_'))
    .slice(-(12 - liked.length));

  if (fresh.length === 0 && liked.length === 0) {
    statusEl.textContent = `no fresh variants — run: /lab-generate ${PIECE} ${state.winnerOfRound} --count 8`;
    return;
  }

  state = nextRound(state, 'refine', fresh);
  save(PIECE, state);
  closeModal();
  await renderRound();
});

btnFromPool.addEventListener('click', async () => {
  const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
  const used = new Set([
    ...liked,
    ...state.history.flatMap((h) => [
      ...(h.liked ?? [h.winner]),
      ...(h.disliked ?? h.losers ?? [])
    ])
  ]);
  const unused = manifest.variants
    .map((v) => v.id)
    .filter((id) => !used.has(id));

  if (unused.length === 0) {
    statusEl.textContent = 'no unused variants left; pick Refine or Done';
    return;
  }

  state = nextRound(state, 'pool', unused.slice(0, 12 - liked.length));
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
