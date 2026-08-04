import { PACKS } from '../src/packs.js';

// Tiles are pre-baked animated WebP (webp/*.webp), rendered once from the same
// engine via the bake harness (scripts/debug/bake-gallery-webp/) — the page
// itself does zero per-frame JS. Rebake after changing effects or examples.
const STORE_URL = 'https://chrome.google.com/webstore/'; // konkrete Listing-URL nach Publish eintragen

const content = document.getElementById('content');
const status = document.getElementById('status');

function makeTile(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.width = 320;
  img.height = 320;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  return img;
}

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

  card.appendChild(makeTile(`webp/pack-${pack.id}.webp`, `${pack.label} capture animation`));

  const meta = document.createElement('div');
  meta.className = 'meta';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = pack.label;
  meta.append(name);
  card.appendChild(meta);

  grid.appendChild(card);
}

function renderPackGroups(panel) {
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
    panel.appendChild(section);
    packs.forEach((pack) => makeCard(pack, grid));
  }
}

function renderStatus() {
  // Tampermonkey userscript: nothing to detect live — the install section is the entry point.
  if (status) status.style.display = 'none';
}

function showTransientError(message) {
  status.className = 'status';
  status.textContent = message;
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => renderStatus(installed), 3000);
}

async function init() {
  renderPackGroups(content);
  renderStatus();
}

init();
