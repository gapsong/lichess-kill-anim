# Chrome-Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Kill-Animations-Userscript zusätzlich als Chrome-Extension (Manifest V3) mit Bedien-Popup ausliefern, ohne den Tampermonkey-Build zu verlieren.

**Architecture:** `src/` bleibt Single Source of Truth. Die Renderer-Verdrahtung wird in ein injizierbares Runtime-Modul (`src/runtime.js`) extrahiert; Konfiguration zentral in `src/settings.js`. Userscript- und Extension-Entry teilen diese Runtime. Ein esbuild-Build erzeugt das Content-Script + Popup, ein Pack-Schritt das upload-fertige `.zip`.

**Tech Stack:** Vanilla JS ES-Module, esbuild (IIFE-Bundles), `node:test` + `node:assert/strict`, jsdom, Playwright (Icon-Generierung), Chrome `chrome.storage`/MV3.

## Global Constraints

- Store-Name: **Lichess Kill Animations**. Store-Texte: **Englisch**.
- Zielbrowser: **Chrome** (+ Edge/Brave). Kein Firefox, kein Cross-Browser-Manifest.
- **Tampermonkey-Build bleibt** funktionsfähig: `npm run build` → `lichess-kill-notifier.user.js`, `node --check` grün.
- `manifest_version: 3`; `permissions: ["storage"]` und sonst nichts; keine Host-Permission über den Content-Script-Match hinaus; kein Background-Worker; kein Remote-Code (alles gebündelt).
- Default-Settings (eine Quelle): `{ enabled:true, mode:'signature', intensity:7, soundOn:true, buildupMs:0, shakePieces:['q'] }`.
- Manifest-Version wird beim Build aus `package.json#version` gestempelt.
- `lab/` und `scripts/animations/` bleiben eingefroren/unangetastet.
- Build-Gate nach `src/`-Änderungen: `npm test && npm run build && node --check lichess-kill-notifier.user.js` — alle grün.
- Tests prüfen nur deterministische Flächen (Settings-Merge, Config-Propagation, enabled-Suppression). Kein Test für `chrome.*`, Popup-DOM oder Content-Script-Injektion.
- Commits nur lokal; kein Push ohne Ansage.

---

## Phase 1 — Refactor + Settings

### Task 1: Settings-Modul

**Files:**
- Create: `src/settings.js`
- Test: `test/settings.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `DEFAULT_SETTINGS` (Objekt), `KNOWN_PIECES` (Array), `mergeSettings(stored) -> { enabled, mode, intensity, soundOn, buildupMs, shakePieces }`.

- [ ] **Step 1: Failing test schreiben**

Erstelle `test/settings.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS, mergeSettings } from '../src/settings.js';

test('empty/undefined storage yields the defaults', () => {
  assert.deepEqual(mergeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(mergeSettings({}), DEFAULT_SETTINGS);
});

test('partial storage overrides only the named keys', () => {
  const out = mergeSettings({ intensity: 3 });
  assert.equal(out.intensity, 3);
  assert.equal(out.mode, DEFAULT_SETTINGS.mode);
  assert.equal(out.soundOn, DEFAULT_SETTINGS.soundOn);
});

test('intensity is clamped to 1..10 and falls back on non-numbers', () => {
  assert.equal(mergeSettings({ intensity: 0 }).intensity, 1);
  assert.equal(mergeSettings({ intensity: 15 }).intensity, 10);
  assert.equal(mergeSettings({ intensity: 'x' }).intensity, DEFAULT_SETTINGS.intensity);
});

test('unknown keys are ignored', () => {
  const out = mergeSettings({ foo: 1, bar: true });
  assert.deepEqual(out, DEFAULT_SETTINGS);
});

test('shakePieces keeps only known piece letters', () => {
  assert.deepEqual(mergeSettings({ shakePieces: ['q', 'z', 'r'] }).shakePieces, ['q', 'r']);
  assert.deepEqual(mergeSettings({ shakePieces: 'nope' }).shakePieces, DEFAULT_SETTINGS.shakePieces);
});

test('booleans must be real booleans, else default', () => {
  assert.equal(mergeSettings({ enabled: 'yes' }).enabled, true);
  assert.equal(mergeSettings({ soundOn: false }).soundOn, false);
});

test('mergeSettings returns a fresh shakePieces array (no shared reference)', () => {
  const out = mergeSettings({});
  assert.notEqual(out.shakePieces, DEFAULT_SETTINGS.shakePieces);
  assert.deepEqual(out.shakePieces, DEFAULT_SETTINGS.shakePieces);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/settings.test.js`
Expected: FAIL — `Cannot find module '../src/settings.js'`.

- [ ] **Step 3: Implement `src/settings.js`**

```js
export const KNOWN_PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

export const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'signature',
  intensity: 7,
  soundOn: true,
  buildupMs: 0,
  shakePieces: ['q']
};

export function mergeSettings(stored) {
  const s = stored && typeof stored === 'object' ? stored : {};
  const intensity = Number(s.intensity);
  const buildupMs = Number(s.buildupMs);
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SETTINGS.enabled,
    mode: typeof s.mode === 'string' ? s.mode : DEFAULT_SETTINGS.mode,
    intensity: Number.isFinite(intensity)
      ? Math.max(1, Math.min(10, Math.round(intensity)))
      : DEFAULT_SETTINGS.intensity,
    soundOn: typeof s.soundOn === 'boolean' ? s.soundOn : DEFAULT_SETTINGS.soundOn,
    buildupMs: Number.isFinite(buildupMs) ? Math.max(0, buildupMs) : DEFAULT_SETTINGS.buildupMs,
    shakePieces: Array.isArray(s.shakePieces)
      ? s.shakePieces.filter((p) => KNOWN_PIECES.includes(p))
      : [...DEFAULT_SETTINGS.shakePieces]
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/settings.test.js`
Expected: PASS (alle 7 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/settings.js test/settings.test.js
git commit -m "feat: add settings module with defaults and validation"
```

---

### Task 2: Runtime-Modul + Userscript-Entry darauf umstellen

**Files:**
- Create: `src/runtime.js`
- Test: `test/runtime.test.js`
- Modify: `src/userscript-entry.js` (komplett ersetzen)

**Interfaces:**
- Consumes: `DEFAULT_SETTINGS` aus `./settings.js`; bestehende Module `board-shake`, `canvas-overlay`, `event-stream`, `render-event`, `particle-fx-renderer`, `move-feed`.
- Produces: `createRuntime(options) -> { start(), stop(), applyConfig(partial), get renderer, get settings }`. Optionen mit Defaults: `{ config, createRenderer, overlay, stream, readSnapshotFn, schedule, cancel, doc, loc, notify }`.

- [ ] **Step 1: Failing test schreiben**

Erstelle `test/runtime.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { createRuntime } from '../src/runtime.js';
import { DEFAULT_SETTINGS } from '../src/settings.js';

function setupDoc() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.MutationObserver = dom.window.MutationObserver;
  return dom.window.document;
}

const captureEvent = {
  from: 'e4', to: 'd5', capturedAt: 'd5', ply: 3, san: 'exd5',
  movingPiece: 'p', movingColor: 'w', capturedPiece: 'p', capturedColor: 'b', isEnPassant: false
};

function fakeOverlay() {
  return {
    board: { dummy: true },
    attach() {},
    sync() { return { context: { clearRect() {} }, size: 640, isBlackOrientation: false }; }
  };
}

function baseOpts(doc, overrides = {}) {
  return {
    config: { ...DEFAULT_SETTINGS },
    overlay: fakeOverlay(),
    stream: { next: () => [captureEvent] },
    readSnapshotFn: () => ({ id: 's1' }),
    schedule: () => 0,
    cancel() {},
    notify() {},
    doc,
    loc: {},
    ...overrides
  };
}

test('captures are suppressed when enabled is false', () => {
  const doc = setupDoc();
  const played = [];
  const rt = createRuntime(baseOpts(doc, {
    config: { ...DEFAULT_SETTINGS, enabled: false },
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play: (re) => played.push(re), tick() {} })
  }));
  rt.start();
  assert.equal(played.length, 0);
});

test('captures play when enabled', () => {
  const doc = setupDoc();
  const played = [];
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => ({ ...opts, activeCount: 0, play: (re) => played.push(re), tick() {} })
  }));
  rt.start();
  assert.equal(played.length, 1);
});

test('applyConfig propagates mode/intensity/soundOn/buildupMs to the renderer', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  assert.equal(renderer.intensity, 7);
  rt.applyConfig({ intensity: 3, soundOn: false, mode: 'random', buildupMs: 680 });
  assert.equal(renderer.intensity, 3);
  assert.equal(renderer.soundOn, false);
  assert.equal(renderer.mode, 'random');
  assert.equal(renderer.buildupMs, 680);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/runtime.test.js`
Expected: FAIL — `Cannot find module '../src/runtime.js'`.

- [ ] **Step 3: Implement `src/runtime.js`**

```js
import { shakeElement } from './board-shake.js';
import { CanvasOverlay } from './canvas-overlay.js';
import { CaptureEventStream } from './event-stream.js';
import { createRenderEvent } from './render-event.js';
import { ParticleFxRenderer } from './particle-fx-renderer.js';
import { readSnapshot } from './move-feed.js';

const PIECE_NAMES = { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' };

function domToast(doc, text) {
  if (!doc) return;
  const old = doc.getElementById('k-toast');
  if (old) old.remove();
  const element = doc.createElement('div');
  element.id = 'k-toast';
  element.textContent = `${text} 💥`;
  Object.assign(element.style, {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '99999', background: '#1a1a2e', color: '#ff6b6b',
    padding: '10px 20px', borderRadius: '8px', border: '2px solid #ff6b6b'
  });
  doc.body.appendChild(element);
  setTimeout(() => element.remove(), 2000);
}

export function createRuntime({
  config,
  createRenderer = (opts) => new ParticleFxRenderer(opts),
  overlay = new CanvasOverlay(),
  stream = new CaptureEventStream(),
  readSnapshotFn = readSnapshot,
  schedule = (cb) => requestAnimationFrame(cb),
  cancel = (id) => cancelAnimationFrame(id),
  doc = (typeof document !== 'undefined' ? document : null),
  loc = (typeof location !== 'undefined' ? location : null),
  notify
} = {}) {
  const settings = { ...config, shakePieces: [...(config?.shakePieces ?? [])] };
  const emit = notify || ((text) => domToast(doc, text));
  let renderer = null;
  let frameRequest = null;
  let currentContext = null;
  let currentSize = 0;
  let observer = null;

  function ensureRenderer() {
    overlay.attach();
    const state = overlay.sync();
    if (!state?.context) return null;
    currentContext = state.context;
    currentSize = state.size;
    if (!renderer) {
      renderer = createRenderer({
        mode: settings.mode,
        intensity: settings.intensity,
        soundOn: settings.soundOn,
        buildupMs: settings.buildupMs,
        onImpact: (renderEvent, opts) => {
          if (overlay.board && settings.shakePieces.includes(renderEvent?.attacker?.piece)) {
            shakeElement(overlay.board, {
              amplitude: opts?.amplitude ?? 3,
              durationMs: opts?.durationMs ?? 160
            });
          }
        }
      });
    }
    return state;
  }

  function renderCapture(event, snapshotId) {
    if (!settings.enabled) return;
    const state = ensureRenderer();
    if (!state || !renderer) return;
    const renderEvent = createRenderEvent(
      event,
      { size: state.size, isBlackOrientation: state.isBlackOrientation },
      snapshotId
    );
    emit(`${PIECE_NAMES[event.movingPiece] || 'Figur'} schlägt`);
    renderer.play(renderEvent);
    startFrameLoop();
  }

  function startFrameLoop() {
    if (frameRequest != null) return;
    frameRequest = schedule(frame);
  }

  function frame(nowMs) {
    frameRequest = null;
    const state = overlay.sync();
    if (state?.context) { currentContext = state.context; currentSize = state.size; }
    currentContext?.clearRect(0, 0, currentSize, currentSize);
    renderer?.tick(nowMs, currentContext, currentSize);
    if (renderer?.activeCount) frameRequest = schedule(frame);
  }

  function scan() {
    const snapshot = readSnapshotFn(doc, loc);
    const events = stream.next(snapshot);
    events.forEach((event) => renderCapture(event, snapshot?.id));
  }

  function start() {
    if (doc) {
      observer = new MutationObserver(scan);
      observer.observe(doc.body, { childList: true, subtree: true });
    }
    scan();
  }

  function applyConfig(partial) {
    Object.assign(settings, partial);
    if (partial && Array.isArray(partial.shakePieces)) settings.shakePieces = [...partial.shakePieces];
    if (renderer) {
      renderer.mode = settings.mode;
      renderer.intensity = settings.intensity;
      renderer.soundOn = settings.soundOn;
      renderer.buildupMs = settings.buildupMs;
    }
  }

  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    if (frameRequest != null) { cancel(frameRequest); frameRequest = null; }
  }

  return {
    start,
    stop,
    applyConfig,
    get renderer() { return renderer; },
    get settings() { return settings; }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/runtime.test.js`
Expected: PASS (3 Tests).

- [ ] **Step 5: Userscript-Entry auf die Runtime umstellen**

Ersetze den **gesamten** Inhalt von `src/userscript-entry.js` durch:

```js
import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS } from './settings.js';

createRuntime({ config: DEFAULT_SETTINGS }).start();
```

- [ ] **Step 6: Full gate**

Run:
```bash
npm test
npm run build
node --check lichess-kill-notifier.user.js
```
Expected: alle Tests PASS (inkl. settings + runtime; bestehende 72 weiter grün), Build ohne Fehler, `node --check` Exit 0. Das gebaute Userscript verhält sich unverändert (gleiche Defaults).

- [ ] **Step 7: Commit**

```bash
git add src/runtime.js test/runtime.test.js src/userscript-entry.js
git commit -m "refactor: extract runtime module; userscript entry uses it"
```

---

## Phase 2 — Extension-Core

### Task 3: Content-Script-Entry, Manifest, Build-Script

**Files:**
- Create: `src/extension-entry.js`
- Create: `extension/manifest.json`
- Create: `scripts/build-extension.mjs`
- Modify: `package.json` (Scripts)
- Modify: `.gitignore` (`dist/`)

**Interfaces:**
- Consumes: `createRuntime` (Task 2), `DEFAULT_SETTINGS`/`mergeSettings` (Task 1).
- Produces: `npm run build:ext` → `dist/extension/` mit `content.js`, `manifest.json` (versioniert), als ungepacktes Extension-Verzeichnis ladbar.

- [ ] **Step 1: Content-Script-Entry**

Erstelle `src/extension-entry.js`:

```js
import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS, mergeSettings } from './settings.js';

const runtime = createRuntime({ config: DEFAULT_SETTINGS });

function loadAndApply(then) {
  chrome.storage.sync.get(null, (stored) => {
    runtime.applyConfig(mergeSettings(stored));
    if (then) then();
  });
}

loadAndApply(() => runtime.start());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  loadAndApply();
});
```

- [ ] **Step 2: Manifest (V3)**

Erstelle `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Lichess Kill Animations",
  "version": "0.0.0",
  "description": "Plays kill animations on captures at lichess.org.",
  "content_scripts": [
    {
      "matches": ["https://lichess.org/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage"]
}
```

- [ ] **Step 3: Build-Script**

Erstelle `scripts/build-extension.mjs`:

```js
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'dist', 'extension');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// copy static extension assets (manifest, popup.html, icons/) if present
const srcExt = path.join(root, 'extension');
if (existsSync(srcExt)) cpSync(srcExt, outDir, { recursive: true });

// stamp manifest version from package.json
const manifestPath = path.join(outDir, 'manifest.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

// bundle content script
await build({
  entryPoints: [path.join(root, 'src', 'extension-entry.js')],
  outfile: path.join(outDir, 'content.js'),
  bundle: true,
  format: 'iife',
  legalComments: 'none'
});

// bundle popup if a source entry exists (Task 4 adds it)
const popupEntry = path.join(root, 'src', 'popup-entry.js');
if (existsSync(popupEntry)) {
  await build({
    entryPoints: [popupEntry],
    outfile: path.join(outDir, 'popup.js'),
    bundle: true,
    format: 'iife',
    legalComments: 'none'
  });
}

console.log('built extension ->', outDir);

// package into an upload-ready zip when --zip is passed (Task 6 documents package:ext)
if (process.argv.includes('--zip')) {
  const zipPath = path.join(root, 'dist', `lichess-kill-animations-v${pkg.version}.zip`);
  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: outDir });
  console.log('packaged ->', zipPath);
}
```

- [ ] **Step 4: package.json-Scripts ergänzen**

In `package.json`, im `"scripts"`-Block nach `"build": "node scripts/build-userscript.mjs",` einfügen:

```json
    "build:ext": "node scripts/build-extension.mjs",
    "package:ext": "node scripts/build-extension.mjs --zip",
```

- [ ] **Step 5: `.gitignore` ergänzen**

In `.gitignore` nach `node_modules/` (oben) eine Zeile ergänzen:

```
dist/
```

- [ ] **Step 6: Build verifizieren**

Run:
```bash
npm run build:ext
node --check dist/extension/content.js
cat dist/extension/manifest.json
```
Expected: `built extension -> .../dist/extension`; `content.js` `node --check` Exit 0; `manifest.json` zeigt `"version": "0.1.0"` (aus package.json) und enthält **kein** `action`/`icons` (kommt in Tasks 4/5). `npm test` weiter grün (Run separat).

- [ ] **Step 7: Manuelle Lade-Verifikation (optional, lokal)**

Chrome → `chrome://extensions` → Entwicklermodus an → „Entpacktes Verzeichnis laden" → `dist/extension/` wählen → auf `https://lichess.org` ein Capture auslösen → Animation erscheint. (Popup-Icon noch ohne Funktion — folgt in Task 4.)

- [ ] **Step 8: Commit**

```bash
git add src/extension-entry.js extension/manifest.json scripts/build-extension.mjs package.json .gitignore
git commit -m "feat: chrome extension content script + manifest + build"
```

---

## Phase 3 — Popup + Icons

### Task 4: Popup-UI mit Live-Update

**Files:**
- Create: `extension/popup.html`
- Create: `src/popup-entry.js`
- Modify: `extension/manifest.json` (`action` ergänzen)

**Interfaces:**
- Consumes: `mergeSettings` (Task 1), `chrome.storage.sync`. Der Content-Script (Task 3) reagiert bereits auf `chrome.storage.onChanged` → Live-Update.
- Produces: ein klickbares Popup, das `enabled`/`soundOn`/`intensity` in `chrome.storage.sync` schreibt.

- [ ] **Step 1: Popup-HTML**

Erstelle `extension/popup.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  :root { color-scheme: dark; }
  body { margin:0; width:240px; font-family:'Segoe UI',system-ui,sans-serif; background:#15131f; color:#ece8f5; }
  header { padding:14px 16px 8px; font-weight:600; letter-spacing:.02em; }
  .accent { color:#b98cff; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 16px; }
  .row label { font-size:13px; }
  input[type="range"] { width:120px; accent-color:#b98cff; }
  input[type="checkbox"] { width:34px; height:18px; accent-color:#b98cff; }
  .val { min-width:18px; text-align:right; color:#b98cff; font-variant-numeric:tabular-nums; }
  footer { padding:8px 16px 14px; font-size:11px; color:#8a83a0; }
</style>
</head>
<body>
  <header>Lichess Kill <span class="accent">Animations</span></header>
  <div class="row"><label for="enabled">Enabled</label><input id="enabled" type="checkbox"></div>
  <div class="row"><label for="sound">Sound</label><input id="sound" type="checkbox"></div>
  <div class="row">
    <label for="intensity">Intensity</label>
    <input id="intensity" type="range" min="1" max="10" step="1">
    <span class="val" id="intensityVal">7</span>
  </div>
  <footer>Effects show on captures at lichess.org</footer>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Popup-Logik**

Erstelle `src/popup-entry.js`:

```js
import { mergeSettings } from './settings.js';

const byId = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(null, (stored) => {
    const s = mergeSettings(stored);
    byId('enabled').checked = s.enabled;
    byId('sound').checked = s.soundOn;
    byId('intensity').value = String(s.intensity);
    byId('intensityVal').textContent = String(s.intensity);
  });
}

function save(partial) {
  chrome.storage.sync.set(partial);
}

byId('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
byId('sound').addEventListener('change', (e) => save({ soundOn: e.target.checked }));
byId('intensity').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  byId('intensityVal').textContent = String(v);
  save({ intensity: v });
});

load();
```

- [ ] **Step 3: Manifest um `action` ergänzen**

In `extension/manifest.json` nach dem `"permissions"`-Eintrag (vor der schließenden `}`) ergänzen:

```json
  ,"action": { "default_popup": "popup.html" }
```

(Resultat: gültiges JSON mit `manifest_version`, `name`, `version`, `description`, `content_scripts`, `permissions`, `action`.)

- [ ] **Step 4: Build + Verifikation**

Run:
```bash
npm run build:ext
node --check dist/extension/popup.js
ls dist/extension
```
Expected: `dist/extension/` enthält jetzt `content.js`, `popup.js`, `popup.html`, `manifest.json`; `popup.js` `node --check` Exit 0; `manifest.json` enthält `action.default_popup`.

- [ ] **Step 5: Manuelle Popup-Verifikation (optional, lokal)**

Extension in Chrome neu laden → Icon anklicken → Popup zeigt Toggles + Slider; Werte ändern → auf Lichess wirkt es (An/Aus sofort beim nächsten Scan, Intensität/Sound beim nächsten Capture).

- [ ] **Step 6: Commit**

```bash
git add extension/popup.html src/popup-entry.js extension/manifest.json
git commit -m "feat: extension popup with live settings via chrome.storage"
```

---

### Task 5: Icons generieren + im Manifest verdrahten

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `extension/icons/icon-16.png`, `extension/icons/icon-48.png`, `extension/icons/icon-128.png` (generiert)
- Modify: `extension/manifest.json` (`icons` + `action.default_icon`)
- Modify: `package.json` (`icons`-Script)

**Interfaces:**
- Consumes: Playwright (vorhandene devDependency).
- Produces: drei PNG-Icons (violetter Schockwellen-Ring auf dunkel), im Manifest referenziert; vom Build automatisch nach `dist/extension/icons/` kopiert.

- [ ] **Step 1: Icon-Generator**

Erstelle `scripts/generate-icons.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'extension', 'icons');
mkdirSync(outDir, { recursive: true });

const sizes = [16, 48, 128];
const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of sizes) {
  const dataUrl = await page.evaluate((S) => {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#15131f';
    ctx.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#b98cff';
    ctx.lineWidth = Math.max(1, S * 0.09);
    ctx.shadowColor = '#b98cff';
    ctx.shadowBlur = S * 0.18;
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.34, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = '#ecd9ff';
    ctx.lineWidth = Math.max(1, S * 0.05);
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.2, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, S * 0.05), 0, 6.2832); ctx.fill();
    return c.toDataURL('image/png');
  }, size);
  writeFileSync(path.join(outDir, `icon-${size}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', `icon-${size}.png`);
}

await browser.close();
```

- [ ] **Step 2: Icons generieren**

Run: `node scripts/generate-icons.mjs`
Expected: schreibt `extension/icons/icon-16.png`, `icon-48.png`, `icon-128.png`. Prüfen: `ls -la extension/icons` zeigt drei nicht-leere PNGs.

- [ ] **Step 3: `package.json`-Script ergänzen**

Im `"scripts"`-Block nach `"package:ext": ...` einfügen:

```json
    "icons": "node scripts/generate-icons.mjs",
```

- [ ] **Step 4: Manifest um Icons ergänzen**

In `extension/manifest.json` `action` erweitern und `icons` ergänzen, sodass die Datei so endet (nach `permissions`):

```json
  ,"action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
  },
  "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
```

(Ersetzt die in Task 4 ergänzte `action`-Zeile durch diese erweiterte Form.)

- [ ] **Step 5: Build + Verifikation**

Run:
```bash
npm run build:ext
ls dist/extension/icons
```
Expected: `dist/extension/icons/` enthält die drei PNGs; `manifest.json` referenziert `icons` und `action.default_icon`. JSON gültig (`node -e "JSON.parse(require('fs').readFileSync('dist/extension/manifest.json','utf8'))"` ohne Fehler).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-icons.mjs extension/icons package.json extension/manifest.json
git commit -m "feat: brand icons (violet shockwave ring) for the extension"
```

---

## Phase 4 — Packaging + Store-Assets

### Task 6: Zip-Paketierung + Store-Texte + Einreich-Anleitung

**Files:**
- Create: `store/listing.md`
- Create: `store/privacy.md`
- Create: `store/SUBMIT.md`

**Interfaces:**
- Consumes: `npm run package:ext` (das `--zip`-Flag wurde bereits in Task 3 in `scripts/build-extension.mjs` angelegt).
- Produces: `dist/lichess-kill-animations-v<version>.zip` (upload-fertig) und die englischen Store-Texte.

- [ ] **Step 1: Zip-Paketierung verifizieren**

Run: `npm run package:ext`
Expected: `built extension -> .../dist/extension` und `packaged -> .../dist/lichess-kill-animations-v0.1.0.zip`. Prüfen: `unzip -l dist/lichess-kill-animations-v0.1.0.zip` listet `manifest.json`, `content.js`, `popup.js`, `popup.html`, `icons/icon-16.png`, `icon-48.png`, `icon-128.png` — und **keine** Quell-/Map-Dateien.

- [ ] **Step 2: Store-Listing (Englisch)**

Erstelle `store/listing.md`:

```markdown
# Chrome Web Store Listing — Lichess Kill Animations

**Name:** Lichess Kill Animations

**Summary (short):**
Turn every capture on lichess.org into a punchy kill animation.

**Description (long):**
Lichess Kill Animations draws a board-local particle effect on every capture you
make or watch on lichess.org. Each attacking piece gets its own signature hit —
the queen triggers a violet void shockwave, the rook a heavy smash, the knight a
blade slash, the bishop a lightning zap, the pawn an 8-bit pop. Optional synth
sound effects and a subtle board shake on queen captures add extra impact.

Works in normal games, analysis main line, Lichess TV, and puzzle history.
Click the toolbar icon to toggle effects on/off, mute sound, or set intensity.

**Category:** Entertainment (alt: Sports)

**Single purpose:**
Render kill animations for chess captures on lichess.org. The extension runs only
on https://lichess.org/* and does nothing on other sites.

**Permission justification:**
- `storage`: persist the user's local preferences (enabled, sound, intensity).
  No data leaves the browser.
```

- [ ] **Step 3: Privacy-Notiz (Englisch)**

Erstelle `store/privacy.md`:

```markdown
# Privacy — Lichess Kill Animations

This extension does not collect, transmit, or sell any personal data.

- It runs only on https://lichess.org/*.
- It stores a small set of preferences (enabled, sound, intensity) via
  `chrome.storage.sync`. These never leave your browser/Google sync.
- It contains no remote code: all logic (including the bundled chess.js library)
  ships inside the extension package, as required by Manifest V3.
- It makes no network requests of its own and uses no analytics or tracking.

Contact: <add your contact email before submission>.
```

- [ ] **Step 4: Einreich-Anleitung (Englisch)**

Erstelle `store/SUBMIT.md`:

```markdown
# Submitting to the Chrome Web Store

## 1. Build the package
```bash
npm run package:ext
```
This produces `dist/lichess-kill-animations-v<version>.zip`.

## 2. One-time developer setup
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to publish under.
3. Pay the one-time USD 5 developer registration fee.

## 3. Create the listing
1. In the dashboard, click **New item** and upload the `.zip` from step 1.
2. Fill the store listing fields from `store/listing.md`:
   - Name, summary, description, category.
3. Upload assets:
   - **Icon:** `extension/icons/icon-128.png` (already in the package).
   - **Screenshots (required):** at least one 1280×800 or 640×400 PNG/JPEG.
     Recommended: capture a real capture animation on lichess.org
     (open a game/TV, make a capture, screenshot the board). Crop to 1280×800.
   - Optional small promo tile 440×280.
4. **Privacy practices:** declare "Does not collect user data". Paste the
   single-purpose and `storage` justification from `store/listing.md`. Link or
   paste `store/privacy.md` content as the privacy policy.

## 4. Submit for review
1. Set visibility (Public or Unlisted).
2. Click **Submit for review**. Review typically takes a few business days.

## 5. Updates
Bump `version` in `package.json`, run `npm run package:ext`, upload the new
`.zip` to the same item, and submit again.
```

- [ ] **Step 5: Commit**

```bash
git add store/
git commit -m "docs: store listing, privacy notice, and submission guide"
```

---

## Self-Review

- **Spec coverage:** A (Architektur: runtime+settings, beide Entries) → Tasks 1,2,3; B (Settings-Modul) → Task 1; C (Extension-Bestandteile: manifest/popup/icons) → Tasks 3,4,5; D (Build & Packaging, .gitignore, npm-Scripts, Versions-Stempel) → Tasks 3,5,6; E (Store-Assets + SUBMIT) → Task 6; F (Tests settings/runtime) → Tasks 1,2; G (Phasen) → Phasen-Gliederung. Tampermonkey-Build bleibt → Task 2 Step 6 Gate.
- **Bewusste Spec-Abweichung:** Spec E nennt „Kandidaten-Screenshots aus dem Harness via Playwright". Der Plan generiert **keine** Screenshots automatisch (flaky: Effekt-Timing + Canvas-Capture + lokaler Server) und dokumentiert stattdessen in `store/SUBMIT.md` die Aufnahme echter Lichess-Screenshots (bessere Store-Qualität). Beim Pre-Flight dem Menschen vorlegen.
- **Placeholder scan:** Keine TBD/„handle edge cases". `manifest.json` `"version":"0.0.0"` ist ein bewusster, vom Build überschriebener Platzhalter. `store/privacy.md` enthält `<add your contact email before submission>` — bewusst, vom Nutzer auszufüllen.
- **Type consistency:** `createRuntime({ config, createRenderer, overlay, stream, readSnapshotFn, schedule, cancel, doc, loc, notify })`, `applyConfig(partial)`, `DEFAULT_SETTINGS`/`mergeSettings`/`KNOWN_PIECES`, `npm run build:ext`/`package:ext`/`icons`, `dist/extension/`, Icon-Pfade `icons/icon-{16,48,128}.png` — über alle Tasks konsistent.
