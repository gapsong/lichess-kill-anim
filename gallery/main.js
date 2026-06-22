import { PACKS } from '../src/packs.js';
import { startPreview } from './preview.js';

const PREVIEW_PX = 200;
const grid = document.getElementById('grid');

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
  btn.dataset.packId = pack.id;
  row.append(label, btn);
  card.appendChild(row);

  grid.appendChild(card);
  startPreview(canvas, pack.id);
}

PACKS.forEach(makeCard);
