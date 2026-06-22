import { PACKS } from '../src/packs.js';
import { startPreview } from './preview.js';
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

async function init() {
  renderSections();
  renderStatus(false);
  renderStatus(await pingExtension());
}

init();
