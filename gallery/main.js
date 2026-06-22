import { PACKS } from '../src/packs.js';
import { startPreview } from './preview.js';
import { pingExtension, applyPack } from './extension-bridge.js';

const PREVIEW_PX = 200;
const STORE_URL = 'https://chrome.google.com/webstore/'; // konkrete Listing-URL nach Publish eintragen
const grid = document.getElementById('grid');
const banner = document.getElementById('banner');

let installed = false;

function makeCard(pack) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.packId = pack.id;

  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_PX;
  canvas.height = PREVIEW_PX;
  card.appendChild(canvas);

  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = pack.label;
  const btn = document.createElement('button');
  btn.textContent = 'Use this';
  btn.disabled = !installed;
  btn.addEventListener('click', async () => {
    const ok = await applyPack(pack.id);
    if (ok) {
      document.querySelectorAll('.card.active').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
    } else {
      renderBanner(false);
    }
  });
  row.append(label, btn);
  card.appendChild(row);

  grid.appendChild(card);
  startPreview(canvas, pack.id);
}

function renderBanner(isInstalled) {
  installed = isInstalled;
  banner.innerHTML = isInstalled
    ? 'Extension connected — click any animation to apply it on lichess.org.'
    : `Not installed yet. <a href="${STORE_URL}" target="_blank" rel="noopener">Add to Chrome</a>, then reload this page.`;
  document.querySelectorAll('.card button').forEach((b) => { b.disabled = !isInstalled; });
}

async function init() {
  PACKS.forEach(makeCard);
  renderBanner(false);
  renderBanner(await pingExtension());
}

init();
