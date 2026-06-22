import { PACKS } from '../src/packs.js';
import { startPreview } from './preview.js';
import { startPatternPreview } from './pattern-preview.js';
import { pingExtension, applyPack } from './extension-bridge.js';

const PREVIEW_PX = 200;
const STORE_URL = 'https://chrome.google.com/webstore/'; // konkrete Listing-URL nach Publish eintragen

const content = document.getElementById('content');
const status = document.getElementById('status');

// Display groups, in order. Each pack lands in the first group it matches.
const GROUPS = [
  { title: 'Signature', match: (p) => p.kind === 'signature',
    desc: 'Each piece gets its own effect. A queen capture looks different from a knight or a pawn capture — the default.' },
  { title: 'Themes', match: (p) => p.kind === 'theme',
    desc: 'A curated set where every piece still has its own effect, but they are chosen to share one coordinated look.' },
  { title: 'Effects', match: (p) => p.kind === 'single',
    desc: 'Force one single effect for every capture, no matter which piece moves.' }
];

// Example positions for the pattern-detection showcase (each holds one pattern).
const PATTERN_EXAMPLES = [
  { label: 'Battery', fen: '6k1/8/8/8/8/3R4/8/3Q2K1 w - - 0 1' },
  { label: 'Doubled rooks', fen: '6k1/8/8/8/8/3R4/8/3R2K1 w - - 0 1' },
  { label: 'Pin', fen: '6k1/8/4n3/8/8/8/B7/6K1 w - - 0 1' },
  { label: 'Skewer', fen: 'k5r1/8/4q3/8/8/8/B7/6K1 w - - 0 1' },
  { label: 'Fianchetto', fen: '6k1/8/8/8/8/6P1/5PBP/6K1 w - - 0 1' },
  { label: 'Outpost', fen: '6k1/8/8/3N4/4P3/8/8/6K1 w - - 0 1' },
  { label: 'Passed pawn', fen: '6k1/8/8/4P3/8/8/8/6K1 w - - 0 1' }
];

let installed = false;
const buttons = [];
let restoreTimer = null;

function makeCard(pack, grid) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.packId = pack.id;

  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_PX;
  canvas.height = PREVIEW_PX;
  card.appendChild(canvas);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = pack.label;
  const btn = document.createElement('button');
  btn.textContent = 'Use';
  btn.disabled = !installed;
  btn.addEventListener('click', async () => {
    const ok = await applyPack(pack.id);
    if (ok) {
      document.querySelectorAll('.card.active').forEach((c) => c.classList.remove('active'));
      buttons.forEach((b) => { if (!b.disabled) b.textContent = 'Use'; });
      card.classList.add('active');
      btn.textContent = 'Active';
    } else {
      showTransientError("Couldn't apply — is the extension still enabled?");
    }
  });
  buttons.push(btn);
  meta.append(name, btn);
  card.appendChild(meta);

  grid.appendChild(card);
  startPreview(canvas, pack.id);
}

function renderSections() {
  for (const group of GROUPS) {
    const packs = PACKS.filter(group.match);
    if (!packs.length) continue;
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.className = 'section-title';
    heading.textContent = group.title;
    const desc = document.createElement('p');
    desc.className = 'section-desc';
    desc.textContent = group.desc;
    const grid = document.createElement('div');
    grid.className = 'grid';
    section.append(heading, desc, grid);
    content.appendChild(section);
    packs.forEach((pack) => makeCard(pack, grid));
  }
}

function renderStatus(isInstalled) {
  installed = isInstalled;
  if (isInstalled) {
    status.className = 'status ok';
    status.innerHTML = '<span class="dot"></span>Connected';
  } else {
    status.className = 'status';
    status.innerHTML = `<span class="dot"></span>Not installed — <a href="${STORE_URL}" target="_blank" rel="noopener">Add to Chrome</a>`;
  }
  buttons.forEach((b) => {
    b.disabled = !isInstalled;
    if (!isInstalled) b.textContent = 'Use';
  });
}

function showTransientError(message) {
  status.className = 'status';
  status.textContent = message;
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => renderStatus(installed), 3000);
}

function renderPatternSection() {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = 'Pattern hints';
  const desc = document.createElement('p');
  desc.className = 'section-desc';
  desc.textContent = 'On the board, the extension highlights tactical and positional formations. Green = your side, red = the opponent. Toggle it in the popup.';
  const grid = document.createElement('div');
  grid.className = 'grid';
  section.append(heading, desc, grid);
  content.appendChild(section);

  for (const example of PATTERN_EXAMPLES) {
    const card = document.createElement('div');
    card.className = 'card';
    const canvas = document.createElement('canvas');
    canvas.width = PREVIEW_PX;
    canvas.height = PREVIEW_PX;
    card.appendChild(canvas);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = example.label;
    meta.appendChild(name);
    card.appendChild(meta);
    grid.appendChild(card);
    startPatternPreview(canvas, example.fen);
  }
}

async function init() {
  renderSections();
  renderPatternSection();
  renderStatus(false);
  renderStatus(await pingExtension());
}

init();
