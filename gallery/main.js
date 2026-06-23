import { PACKS } from '../src/packs.js';
import { startPreview } from './preview.js';
import { startPatternPreview, PATTERN_THEMES } from './pattern-preview.js';
import { pingExtension, applyPack } from './extension-bridge.js';

const PREVIEW_PX = 200;
const STORE_URL = 'https://chrome.google.com/webstore/'; // konkrete Listing-URL nach Publish eintragen

const content = document.getElementById('content');
const status = document.getElementById('status');

// Only animate previews that are on-screen — keeps the framerate up with many cards.
const animated = [];
const visibilityObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const rec = animated.find((a) => a.canvas === entry.target);
    if (!rec) continue;
    if (entry.isIntersecting && !rec.stop) rec.stop = rec.make();
    else if (!entry.isIntersecting && rec.stop) { rec.stop(); rec.stop = null; }
  }
}, { rootMargin: '150px' });

function registerAnimated(canvas, make) {
  const rec = { canvas, make, stop: null };
  animated.push(rec);
  visibilityObserver.observe(canvas);
  return rec;
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

// Example positions for the pattern-detection showcase (each holds one pattern).
const PATTERN_EXAMPLES = [
  { label: 'Battery', fen: '6k1/8/8/3p4/3P4/3R4/8/3Q2K1 w - - 0 1' },
  { label: 'Doubled rooks', fen: '6k1/8/8/3p4/3P4/3R4/8/3R2K1 w - - 0 1' },
  { label: 'Pin', fen: '6k1/8/4n3/8/8/8/B7/6K1 w - - 0 1' },
  { label: 'Skewer', fen: 'k5r1/6p1/4q1P1/8/8/8/B7/6K1 w - - 0 1' },
  { label: 'Fianchetto', fen: '4k3/8/8/6p1/8/6P1/5PBP/6K1 w - - 0 1' },
  { label: 'Outpost', fen: '6k1/8/5p2/3N4/4P3/8/8/6K1 w - - 0 1' },
  { label: 'Passed pawn', fen: '6k1/8/8/4P3/8/8/8/6K1 w - - 0 1' },
  { label: 'Pawn chain', fen: '6k1/8/4p3/2p1P3/3P4/2P5/1P6/6K1 w - - 0 1' },
  { label: 'Hotspot', fen: '6k1/8/8/4q3/2N3N1/8/1B5B/6K1 w - - 0 1' },
  { label: 'Open file', fen: '6k1/8/8/8/8/8/8/4R1K1 w - - 0 1' },
  { label: 'Fortress', fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1' },
  { label: 'Fork', fen: 'k7/2q1b3/8/3N4/8/8/8/6K1 w - - 0 1' }
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
  registerAnimated(canvas, () => startPreview(canvas, pack.id));
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

function renderPatternSection(panel) {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = 'Pattern hints';
  const desc = document.createElement('p');
  desc.className = 'section-desc';
  desc.textContent = 'On the board, the extension highlights tactical and positional formations. Green = your side, red = the opponent. Pick a theme to restyle the effects.';

  const themesRow = document.createElement('div');
  Object.assign(themesRow.style, { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '2px 2px 18px' });

  const grid = document.createElement('div');
  grid.className = 'grid';
  section.append(heading, desc, themesRow, grid);
  panel.appendChild(section);

  const chips = [];
  const patternRecs = [];
  let patternTheme = PATTERN_THEMES[0];

  function updateChips(active) {
    chips.forEach((chip) => {
      const on = chip._theme === active;
      Object.assign(chip.style, {
        background: on ? chip._theme.own : 'transparent',
        color: on ? '#15121f' : 'var(--muted)',
        borderColor: on ? chip._theme.own : 'var(--line)'
      });
    });
  }

  function applyTheme(theme) {
    patternTheme = theme;
    // restart only the on-screen cards with the new theme; off-screen ones pick it up when shown
    patternRecs.forEach((rec) => { if (rec.stop) { rec.stop(); rec.stop = rec.make(); } });
    updateChips(theme);
  }

  PATTERN_THEMES.forEach((theme) => {
    const chip = document.createElement('button');
    chip._theme = theme;
    chip.textContent = theme.label;
    Object.assign(chip.style, {
      font: 'inherit', fontSize: '12px', fontWeight: '600',
      padding: '6px 13px', borderRadius: '999px', cursor: 'pointer',
      border: '1px solid var(--line)', transition: 'background .15s ease, color .15s ease, border-color .15s ease'
    });
    chip.addEventListener('click', () => applyTheme(theme));
    chips.push(chip);
    themesRow.appendChild(chip);
  });

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
    patternRecs.push(registerAnimated(canvas, () => startPatternPreview(canvas, example.fen, patternTheme)));
  }

  updateChips(patternTheme);
}

async function init() {
  renderPackGroups(content);
  renderPatternSection(content);
  renderStatus(false);
  renderStatus(await pingExtension());
}

init();
