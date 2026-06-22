# Animation-Galerie + Ein-Klick-Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine statische Galerie-Website zeigt alle Kill-Animationen mit Live-Vorschau; ein Klick auf eine Karte aktiviert die Animation sofort in der Chrome-Extension auf Lichess.

**Architecture:** Eine geteilte Pack-Registry (`src/packs.js`) speist Extension und Galerie. Die Engine bekommt konfigurierbares Routing; die Auswahl lebt als `packId` in `chrome.storage`. Die Galerie schickt die Auswahl per `externally_connectable` an einen minimalen Service-Worker, der `chrome.storage` schreibt — der Lichess-Tab aktualisiert live.

**Tech Stack:** Vanilla JS ES-Module, esbuild (IIFE-Bundles), `node:test` + `node:assert/strict`, jsdom, Chrome MV3 (`storage`, `externally_connectable`, Service-Worker), Canvas 2D, GitHub Pages.

## Global Constraints

- Galerie-URL (prod): `https://gapsong.github.io/lichess-kill-anim/`. `externally_connectable.matches` enthält `https://gapsong.github.io/*` und (für Dev) `http://localhost/*`.
- Pack-Arten: `signature` | `single` | `theme`. Default-Pack: `signature`.
- Themes-Routing (Start): Void `{q:'nuke',r:'vortex',b:'zap',n:'slash',p:'shatter',k:'ascension'}` fallback `vortex`; Fire `{q:'inferno',r:'smash',b:'inferno',n:'slash',p:'pixel',k:'ascension'}` fallback `inferno`; Arcade `{q:'pixel',r:'smash',b:'zap',n:'pixel',p:'pixel',k:'ascension'}` fallback `pixel`.
- 10 Einzeleffekte: `nuke, smash, slash, zap, pixel, ascension, splatter, inferno, vortex, shatter`.
- Permission bleibt `["storage"]`; kein Remote-Code; MV3.
- Tampermonkey- UND Extension-Build müssen grün bleiben: `npm test && npm run build && node --check lichess-kill-notifier.user.js` und `npm run build:ext`.
- `lab/` und `scripts/animations/` bleiben eingefroren/unangetastet.
- Tests prüfen nur deterministische Flächen (Registry-Resolve, Routing, Settings-Merge, Message-Handler). Kein Test für Galerie-DOM/Canvas oder echtes `chrome`-Messaging.
- Commits nur lokal; kein Push ohne Ansage.

---

## Phase 1 — Packs + Engine-Routing + Settings

### Task 1: Pack-Registry

**Files:**
- Create: `src/packs.js`
- Test: `test/packs.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `EFFECTS` (Array), `PACKS` (Array), `getPack(id) -> pack|null`, `resolvePack(packId) -> { mode, routing, fallback }`.

- [ ] **Step 1: Failing test schreiben**

Erstelle `test/packs.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { EFFECTS, PACKS, getPack, resolvePack } from '../src/packs.js';

test('signature pack resolves to default routing', () => {
  assert.deepEqual(resolvePack('signature'), { mode: 'signature', routing: null, fallback: 'splatter' });
});

test('single pack resolves mode to its effect', () => {
  assert.deepEqual(resolvePack('inferno'), { mode: 'inferno', routing: null, fallback: 'splatter' });
});

test('theme pack resolves to signature mode with its routing + fallback', () => {
  const r = resolvePack('fire');
  assert.equal(r.mode, 'signature');
  assert.equal(r.fallback, 'inferno');
  assert.equal(r.routing.q, 'inferno');
  assert.equal(r.routing.k, 'ascension');
});

test('unknown packId falls back to signature', () => {
  assert.deepEqual(resolvePack('does-not-exist'), resolvePack('signature'));
});

test('getPack returns the pack or null', () => {
  assert.equal(getPack('void').kind, 'theme');
  assert.equal(getPack('nope'), null);
});

test('every theme routing references only known effects', () => {
  for (const pack of PACKS.filter((p) => p.kind === 'theme')) {
    for (const effect of Object.values(pack.routing)) {
      assert.ok(EFFECTS.includes(effect), `${pack.id} routes to unknown effect ${effect}`);
    }
    assert.ok(EFFECTS.includes(pack.fallback), `${pack.id} fallback ${pack.fallback} unknown`);
  }
});

test('every single pack references a known effect', () => {
  for (const pack of PACKS.filter((p) => p.kind === 'single')) {
    assert.ok(EFFECTS.includes(pack.effect));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/packs.test.js`
Expected: FAIL — `Cannot find module '../src/packs.js'`.

- [ ] **Step 3: Implement `src/packs.js`**

```js
export const EFFECTS = [
  'nuke', 'smash', 'slash', 'zap', 'pixel', 'ascension',
  'splatter', 'inferno', 'vortex', 'shatter'
];

const EFFECT_LABELS = {
  nuke: 'Nuke', smash: 'Smash', slash: 'Slash', zap: 'Zap', pixel: 'Pixel',
  ascension: 'Ascension', splatter: 'Splatter', inferno: 'Inferno',
  vortex: 'Vortex', shatter: 'Shatter'
};

export const PACKS = [
  { id: 'signature', label: 'Signature', kind: 'signature' },
  ...EFFECTS.map((effect) => ({ id: effect, label: EFFECT_LABELS[effect], kind: 'single', effect })),
  {
    id: 'void', label: 'Void', kind: 'theme',
    routing: { q: 'nuke', r: 'vortex', b: 'zap', n: 'slash', p: 'shatter', k: 'ascension' },
    fallback: 'vortex'
  },
  {
    id: 'fire', label: 'Fire', kind: 'theme',
    routing: { q: 'inferno', r: 'smash', b: 'inferno', n: 'slash', p: 'pixel', k: 'ascension' },
    fallback: 'inferno'
  },
  {
    id: 'arcade', label: 'Arcade', kind: 'theme',
    routing: { q: 'pixel', r: 'smash', b: 'zap', n: 'pixel', p: 'pixel', k: 'ascension' },
    fallback: 'pixel'
  }
];

export function getPack(id) {
  return PACKS.find((p) => p.id === id) || null;
}

export function resolvePack(packId) {
  const pack = getPack(packId) || getPack('signature');
  if (pack.kind === 'single') return { mode: pack.effect, routing: null, fallback: 'splatter' };
  if (pack.kind === 'theme') return { mode: 'signature', routing: pack.routing, fallback: pack.fallback };
  return { mode: 'signature', routing: null, fallback: 'splatter' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/packs.test.js`
Expected: PASS (7 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/packs.js test/packs.test.js
git commit -m "feat: add shared animation pack registry"
```

---

### Task 2: Engine — konfigurierbares Routing

**Files:**
- Modify: `src/particle-fx-renderer.js`
- Test: `test/particle-fx-renderer.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `ParticleFxRenderer` akzeptiert `routing` (Map Figur→Effekt, Default `null`) und `fallback` (Default `'splatter'`); `effectFor` nutzt `this.routing || SIG` und `this.fallback`.

- [ ] **Step 1: Failing tests schreiben**

An `test/particle-fx-renderer.test.js` anhängen:

```js
test('routing override maps attacker pieces to themed effects', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno', r: 'vortex' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'p' } }), 'inferno');
  assert.equal(r.effectFor({ attacker: { piece: 'r' }, victim: { piece: 'p' } }), 'vortex');
});

test('routing override falls back to configured fallback for unmapped pieces', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'b' }, victim: { piece: 'p' } }), 'shatter');
});

test('captured king still wins over routing', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'k' } }), 'ascension');
});

test('default routing (null) keeps the built-in SIG table', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'p' } }), 'nuke');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/particle-fx-renderer.test.js`
Expected: the routing tests FAIL (constructor ignores `routing`/`fallback`, `effectFor` uses hardcoded `SIG`/`'splatter'`).

- [ ] **Step 3: Constructor um `routing`/`fallback` erweitern**

In `src/particle-fx-renderer.js`, Constructor-Signatur (Zeilen 24–30) ändern zu:

```js
  constructor({
    onImpact = null,
    mode = 'signature', // 'signature' | 'random' | a fixed effect id
    intensity = 7,      // 1..10
    soundOn = true,
    buildupMs = 0,      // 0 = instant impact; >0 = crosshair buildup before impact
    routing = null,     // map attacker piece -> effect; null = built-in SIG
    fallback = 'splatter'
  } = {}) {
```

Im Constructor-Body nach `this.buildupMs = buildupMs;` ergänzen:

```js
    this.routing = routing;
    this.fallback = fallback;
```

- [ ] **Step 4: `effectFor` nutzt routing + fallback**

Ersetze in `effectFor` die letzte Zeile `return SIG[attacker.piece] || 'splatter';` durch:

```js
    const map = this.routing || SIG;
    return map[attacker.piece] || this.fallback || 'splatter';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/particle-fx-renderer.test.js`
Expected: PASS (alle, inkl. der 4 neuen + bestehende Routing-/Buildup-Tests).

- [ ] **Step 6: Commit**

```bash
git add src/particle-fx-renderer.js test/particle-fx-renderer.test.js
git commit -m "feat: configurable routing + fallback in particle renderer"
```

---

### Task 3: `settings.packId` + Runtime löst Pack auf

**Files:**
- Modify: `src/settings.js`
- Modify: `src/runtime.js`
- Test: `test/settings.test.js` (erweitern/anpassen)
- Test: `test/runtime.test.js` (anpassen)

**Interfaces:**
- Consumes: `resolvePack`/`getPack` aus `./packs.js` (Task 1); `routing`/`fallback` der Engine (Task 2).
- Produces: `DEFAULT_SETTINGS` enthält `packId: 'signature'` (und nicht mehr `mode`); `mergeSettings` validiert `packId` gegen die Registry; die Runtime erzeugt/aktualisiert den Renderer mit `resolvePack(settings.packId)`.

- [ ] **Step 1: settings-Test auf `packId` umstellen**

In `test/settings.test.js`: ersetze jede Erwähnung von `mode` durch `packId`-Fälle. Konkret die Tests „partial storage overrides only the named keys" und „unknown keys are ignored" bleiben (nutzen `intensity`), und füge an:

```js
test('packId defaults to signature and accepts known packs', () => {
  assert.equal(mergeSettings({}).packId, 'signature');
  assert.equal(mergeSettings({ packId: 'inferno' }).packId, 'inferno');
  assert.equal(mergeSettings({ packId: 'fire' }).packId, 'fire');
});

test('unknown packId falls back to signature', () => {
  assert.equal(mergeSettings({ packId: 'nope' }).packId, 'signature');
  assert.equal(mergeSettings({ packId: 42 }).packId, 'signature');
});
```

Falls ein bestehender Test `DEFAULT_SETTINGS.mode` referenziert, entferne diese Assertion (das Feld existiert nicht mehr).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/settings.test.js`
Expected: FAIL — `packId` ist `undefined` (noch nicht implementiert).

- [ ] **Step 3: `settings.js` — `mode` → `packId`**

Ersetze den Inhalt von `src/settings.js` durch:

```js
import { getPack } from './packs.js';

export const KNOWN_PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

export const DEFAULT_SETTINGS = {
  enabled: true,
  packId: 'signature',
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
    packId: (typeof s.packId === 'string' && getPack(s.packId)) ? s.packId : DEFAULT_SETTINGS.packId,
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

- [ ] **Step 4: Run settings test to verify it passes**

Run: `node --test test/settings.test.js`
Expected: PASS.

- [ ] **Step 5: Runtime — Renderer aus dem Pack erzeugen**

In `src/runtime.js`:

a) Import ergänzen (oben bei den Imports):
```js
import { resolvePack } from './packs.js';
```

b) In `ensureRenderer`, den `createRenderer({ ... })`-Aufruf so ändern, dass Pack-Felder einfließen. Ersetze die `mode: settings.mode,`-Zeile und ergänze routing/fallback — der Aufruf beginnt so:
```js
      const packConfig = resolvePack(settings.packId);
      renderer = createRenderer({
        mode: packConfig.mode,
        routing: packConfig.routing,
        fallback: packConfig.fallback,
        intensity: settings.intensity,
        soundOn: settings.soundOn,
        buildupMs: settings.buildupMs,
        onImpact: (renderEvent, opts) => {
```
(Der Rest des `onImpact`-Callbacks bleibt unverändert.)

c) In `applyConfig`, den Renderer-Update-Block ersetzen:
```js
    if (renderer) {
      const packConfig = resolvePack(settings.packId);
      renderer.mode = packConfig.mode;
      renderer.routing = packConfig.routing;
      renderer.fallback = packConfig.fallback;
      renderer.intensity = Math.max(1, Math.min(10, settings.intensity));
      renderer.soundOn = settings.soundOn;
      renderer.buildupMs = settings.buildupMs;
    }
```

- [ ] **Step 6: Runtime-Test anpassen**

In `test/runtime.test.js`: der Test „applyConfig propagates …" setzt aktuell `mode: 'random'`. Ersetze ihn durch packId-basiertes Propagieren:

```js
test('applyConfig resolves packId into the renderer (mode/routing/fallback)', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  assert.equal(renderer.mode, 'signature');
  assert.equal(renderer.routing, null);
  rt.applyConfig({ packId: 'inferno', intensity: 3, soundOn: false, buildupMs: 680 });
  assert.equal(renderer.mode, 'inferno');
  assert.equal(renderer.routing, null);
  assert.equal(renderer.intensity, 3);
  assert.equal(renderer.soundOn, false);
  assert.equal(renderer.buildupMs, 680);
});

test('applyConfig resolves a theme packId into routing', () => {
  const doc = setupDoc();
  let renderer;
  const rt = createRuntime(baseOpts(doc, {
    createRenderer: (opts) => (renderer = { ...opts, activeCount: 0, play() {}, tick() {} })
  }));
  rt.start();
  rt.applyConfig({ packId: 'fire' });
  assert.equal(renderer.mode, 'signature');
  assert.equal(renderer.routing.q, 'inferno');
  assert.equal(renderer.fallback, 'inferno');
});
```

If `baseOpts`/`setupDoc` config passes `DEFAULT_SETTINGS`, it now carries `packId` automatically — no other change needed.

- [ ] **Step 7: Full gate**

Run:
```bash
node --test test/settings.test.js test/runtime.test.js test/packs.test.js
npm test
npm run build
node --check lichess-kill-notifier.user.js
npm run build:ext
node --check dist/extension/content.js
```
Expected: alle Tests grün; beide Builds ok; `node --check` Exit 0. Der gebaute Userscript/Content-Script nutzt jetzt `packId` → Signature als Default (unverändertes Verhalten ab Werk).

- [ ] **Step 8: Commit**

```bash
git add src/settings.js src/runtime.js test/settings.test.js test/runtime.test.js
git commit -m "feat: select animation via packId resolved through the registry"
```

---

## Phase 2 — Extension-Apply (Service-Worker + externally_connectable)

### Task 4: Hintergrund-Worker + Manifest + Build

**Files:**
- Create: `src/background-message.js` (reiner Handler)
- Create: `src/background-entry.js` (Worker, verdrahtet `chrome`)
- Modify: `extension/manifest.json` (`background` + `externally_connectable`)
- Modify: `scripts/build-extension.mjs` (Worker bündeln)
- Test: `test/background-message.test.js`

**Interfaces:**
- Consumes: `getPack` aus `./packs.js` (Task 1).
- Produces: `handleExternalMessage(msg, { getVersion, setPack }) -> responseObject|null`. Nachrichten: `{type:'ping'}` → `{installed:true, version}`; `{type:'setPack', packId}` → gültig: `setPack(packId)` + `{ok:true}`, ungültig: `{ok:false}`.

- [ ] **Step 1: Failing test schreiben**

Erstelle `test/background-message.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { handleExternalMessage } from '../src/background-message.js';

function deps() {
  const saved = [];
  return { saved, getVersion: () => '1.2.3', setPack: (id) => saved.push(id) };
}

test('ping reports installed + version', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'ping' }, d), { installed: true, version: '1.2.3' });
});

test('setPack with a known pack saves it and acks', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'setPack', packId: 'fire' }, d), { ok: true });
  assert.deepEqual(d.saved, ['fire']);
});

test('setPack with an unknown pack is rejected without saving', () => {
  const d = deps();
  assert.deepEqual(handleExternalMessage({ type: 'setPack', packId: 'nope' }, d), { ok: false });
  assert.deepEqual(d.saved, []);
});

test('garbage messages return null', () => {
  const d = deps();
  assert.equal(handleExternalMessage(null, d), null);
  assert.equal(handleExternalMessage({ type: 'whatever' }, d), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/background-message.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/background-message.js`**

```js
import { getPack } from './packs.js';

export function handleExternalMessage(msg, deps) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.type === 'ping') return { installed: true, version: deps.getVersion() };
  if (msg.type === 'setPack') {
    if (getPack(msg.packId)) {
      deps.setPack(msg.packId);
      return { ok: true };
    }
    return { ok: false };
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/background-message.test.js`
Expected: PASS (4 Tests).

- [ ] **Step 5: Worker-Entry**

Erstelle `src/background-entry.js`:

```js
import { handleExternalMessage } from './background-message.js';

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  const response = handleExternalMessage(msg, {
    getVersion: () => chrome.runtime.getManifest().version,
    setPack: (packId) => chrome.storage.sync.set({ packId })
  });
  if (response) {
    sendResponse(response);
    return true; // keep the message channel open for the async storage write
  }
});
```

- [ ] **Step 6: Manifest erweitern**

In `extension/manifest.json` zwei Top-Level-Felder ergänzen (gültiges JSON beibehalten):

```json
  "background": { "service_worker": "background.js" },
  "externally_connectable": { "matches": ["https://gapsong.github.io/*", "http://localhost/*"] }
```

- [ ] **Step 7: Build bündelt den Worker**

In `scripts/build-extension.mjs`, nach dem bedingten Popup-Bundling einen analogen Block für den Worker ergänzen:

```js
const bgEntry = path.join(root, 'src', 'background-entry.js');
if (existsSync(bgEntry)) {
  await build({
    entryPoints: [bgEntry],
    outfile: path.join(outDir, 'background.js'),
    bundle: true,
    format: 'iife',
    legalComments: 'none'
  });
}
```

- [ ] **Step 8: Build + Verifikation**

Run:
```bash
node --test test/background-message.test.js
npm run build:ext
node --check dist/extension/background.js
node -e "const m=JSON.parse(require('fs').readFileSync('dist/extension/manifest.json','utf8')); console.log('bg', JSON.stringify(m.background), 'ext', JSON.stringify(m.externally_connectable))"
```
Expected: Tests grün; `dist/extension/background.js` vorhanden + `node --check` Exit 0; Manifest zeigt `background.service_worker` und `externally_connectable.matches`. `npm test` weiter grün (separat).

- [ ] **Step 9: Manuelle Lade-Verifikation (optional, lokal)**

Extension „Entpackt laden", in der DevTools-Konsole einer beliebigen Seite testen ist nicht möglich (nur erlaubte Origins). Stattdessen in Phase 3 über die lokale Galerie verifizieren.

- [ ] **Step 10: Commit**

```bash
git add src/background-message.js src/background-entry.js extension/manifest.json scripts/build-extension.mjs test/background-message.test.js
git commit -m "feat: background worker accepts pack selection via externally_connectable"
```

---

## Phase 3 — Galerie-Website

### Task 5: Galerie — Grid + Live-Previews + Build

**Files:**
- Create: `gallery/index.html`
- Create: `gallery/config.js`
- Create: `gallery/preview.js`
- Create: `gallery/main.js`
- Create: `scripts/build-gallery.mjs`
- Modify: `package.json` (`build:gallery`-Script)

**Interfaces:**
- Consumes: `PACKS`/`resolvePack` aus `../src/packs.js`; `ParticleFxRenderer` aus `../src/particle-fx-renderer.js`.
- Produces: `npm run build:gallery` → `dist/gallery/` (`index.html` + `gallery.js`), statisch servierbar; Karten mit Live-Vorschau pro Pack. (Apply/Install-Banner kommt in Task 6.)

- [ ] **Step 1: Galerie-Config (Extension-ID Platzhalter)**

Erstelle `gallery/config.js`:

```js
// Nach Store-Publish die echte Extension-ID eintragen.
// Für lokale Dev: ID aus chrome://extensions der entpackten Extension kopieren.
export const EXT_ID = '__REPLACE_WITH_EXTENSION_ID__';
```

- [ ] **Step 2: Preview-Modul**

Erstelle `gallery/preview.js`:

```js
import { ParticleFxRenderer } from '../src/particle-fx-renderer.js';
import { resolvePack } from '../src/packs.js';

const CYCLE_PIECES = ['q', 'r', 'b', 'n', 'p'];

// Startet eine Endlos-Vorschau eines Packs auf einem Canvas. Gibt eine stop()-Funktion zurück.
export function startPreview(canvas, packId) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cfg = resolvePack(packId);
  const renderer = new ParticleFxRenderer({
    mode: cfg.mode, routing: cfg.routing, fallback: cfg.fallback,
    intensity: 6, soundOn: false, buildupMs: 0
  });

  let raf = null;
  let timer = null;
  let i = 0;
  let stopped = false;

  function fakeEvent(piece) {
    const sq = size / 8;
    const cx = size / 2, cy = size / 2;
    return {
      board: { size, squareSize: sq, orientation: 'white' },
      attacker: { piece, color: 'w', from: { square: 'a1', x: sq * 0.5, y: size - sq * 0.5 }, to: { square: 'e5', x: cx, y: cy } },
      victim: { piece: 'p', color: 'b', at: { square: 'e5', x: cx, y: cy } },
      move: { san: 'x', ply: 1, isEnPassant: false },
      direction: { dx: 1, dy: -1, angleRad: -0.785 }
    };
  }

  function frame(now) {
    raf = null;
    ctx.clearRect(0, 0, size, size);
    renderer.tick(now, ctx, size);
    if (!stopped && renderer.activeCount) raf = requestAnimationFrame(frame);
  }

  function fire() {
    if (stopped) return;
    renderer.play(fakeEvent(CYCLE_PIECES[i % CYCLE_PIECES.length]), performance.now());
    i++;
    if (!raf) raf = requestAnimationFrame(frame);
    timer = setTimeout(fire, 1400);
  }

  fire();
  return function stop() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
  };
}
```

- [ ] **Step 3: Galerie-HTML**

Erstelle `gallery/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lichess Kill Animations</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#15131f; color:#ece8f5; font-family:'Segoe UI',system-ui,sans-serif; }
  header { padding:32px 24px 8px; }
  h1 { margin:0; font-size:28px; letter-spacing:.01em; }
  h1 .accent { color:#b98cff; }
  header p { color:#9a93b0; margin:6px 0 0; }
  #banner { margin:16px 24px 0; padding:12px 16px; border-radius:10px; background:#221c33; font-size:14px; }
  #banner a { color:#b98cff; font-weight:600; text-decoration:none; }
  main { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:18px; padding:24px; }
  .card { background:#1c1830; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; }
  .card canvas { width:100%; aspect-ratio:1/1; background:#0e0c17; border-radius:8px; display:block; }
  .card .row { display:flex; align-items:center; justify-content:space-between; }
  .card .label { font-weight:600; }
  .card button { background:#b98cff; color:#15131f; border:0; border-radius:8px; padding:7px 12px; font-weight:600; cursor:pointer; }
  .card button:disabled { opacity:.5; cursor:default; }
  .card.active { outline:2px solid #b98cff; }
</style>
</head>
<body>
  <header>
    <h1>Lichess Kill <span class="accent">Animations</span></h1>
    <p>Pick an animation — it applies to your board instantly.</p>
  </header>
  <div id="banner"></div>
  <main id="grid"></main>
  <script src="gallery.js"></script>
</body>
</html>
```

- [ ] **Step 4: Galerie-Logik (nur Grid + Previews in diesem Task)**

Erstelle `gallery/main.js`:

```js
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
```

- [ ] **Step 5: Build-Script**

Erstelle `scripts/build-gallery.mjs`:

```js
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'gallery');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(path.join(root, 'gallery', 'index.html'), path.join(outDir, 'index.html'));

await build({
  entryPoints: [path.join(root, 'gallery', 'main.js')],
  outfile: path.join(outDir, 'gallery.js'),
  bundle: true,
  format: 'iife',
  legalComments: 'none'
});

console.log('built gallery ->', outDir);
```

- [ ] **Step 6: package.json-Script ergänzen**

Im `"scripts"`-Block nach `"package:ext": ...` einfügen:

```json
    "build:gallery": "node scripts/build-gallery.mjs",
```

- [ ] **Step 7: Build + Verifikation**

Run:
```bash
npm run build:gallery
node --check dist/gallery/gallery.js
ls dist/gallery
```
Expected: `built gallery -> .../dist/gallery`; `dist/gallery/` enthält `index.html` + `gallery.js`; `node --check` Exit 0.

- [ ] **Step 8: Manuelle Sicht-Verifikation (optional, lokal)**

```bash
python3 -m http.server 8849 --directory dist/gallery
```
`http://localhost:8849/` öffnen → Grid mit ~14 Karten, jede zeigt eine laufende Effekt-Vorschau. (Buttons noch ohne Funktion — Task 6.)

- [ ] **Step 9: Commit**

```bash
git add gallery/index.html gallery/config.js gallery/preview.js gallery/main.js scripts/build-gallery.mjs package.json
git commit -m "feat: animation gallery with live per-card previews"
```

---

### Task 6: Galerie — Apply + Install-Banner

**Files:**
- Create: `gallery/extension-bridge.js`
- Modify: `gallery/main.js`
- Test: `test/extension-bridge.test.js`

**Interfaces:**
- Consumes: `EXT_ID` aus `./config.js`; das `chrome.runtime`-Messaging der Extension (Task 4).
- Produces: `buildPingMessage()`/`buildSetPackMessage(packId)` (reine Helfer, getestet) + Browser-Funktionen `pingExtension()`/`applyPack(packId)`; `main.js` verdrahtet Buttons + Banner.

- [ ] **Step 1: Failing test für die reinen Message-Builder**

Erstelle `test/extension-bridge.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPingMessage, buildSetPackMessage } from '../gallery/extension-bridge.js';

test('ping message shape', () => {
  assert.deepEqual(buildPingMessage(), { type: 'ping' });
});

test('setPack message carries the packId', () => {
  assert.deepEqual(buildSetPackMessage('fire'), { type: 'setPack', packId: 'fire' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/extension-bridge.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `gallery/extension-bridge.js`**

```js
import { EXT_ID } from './config.js';

export function buildPingMessage() {
  return { type: 'ping' };
}

export function buildSetPackMessage(packId) {
  return { type: 'setPack', packId };
}

function sendMessage(message, timeoutMs = 600) {
  return new Promise((resolve) => {
    const runtime = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime : null;
    if (!runtime || !runtime.sendMessage) { resolve(null); return; }
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    try {
      runtime.sendMessage(EXT_ID, message, (response) => {
        if (runtime.lastError) { done(null); return; }
        done(response);
      });
    } catch { done(null); return; }
    setTimeout(() => done(null), timeoutMs);
  });
}

export async function pingExtension() {
  const response = await sendMessage(buildPingMessage());
  return !!(response && response.installed === true);
}

export async function applyPack(packId) {
  const response = await sendMessage(buildSetPackMessage(packId));
  return !!(response && response.ok === true);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/extension-bridge.test.js`
Expected: PASS (2 Tests). (Die Browser-Funktionen `pingExtension`/`applyPack` werden nicht unit-getestet — sie brauchen echtes `chrome`.)

- [ ] **Step 5: `main.js` um Apply + Banner erweitern**

Ersetze den Inhalt von `gallery/main.js` durch:

```js
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
```

- [ ] **Step 6: Build + Verifikation**

Run:
```bash
node --test test/extension-bridge.test.js
npm run build:gallery
node --check dist/gallery/gallery.js
```
Expected: Tests grün; Build ok; `node --check` Exit 0. `npm test` weiter grün (separat).

- [ ] **Step 7: Manueller End-to-End-Test (lokal)**

1. `EXT_ID` in `gallery/config.js` auf die ID der entpackten Extension setzen (aus `chrome://extensions`), dann `npm run build:ext` und in Chrome neu laden.
2. `npm run build:gallery` und `python3 -m http.server 8849 --directory dist/gallery`.
3. `http://localhost:8849/` öffnen → Banner „connected"; ein offener `lichess.org`-Tab mit Capture: „Use this" wechselt die Animation **live**; Auswahl überlebt Reload.

- [ ] **Step 8: Commit**

```bash
git add gallery/extension-bridge.js gallery/main.js test/extension-bridge.test.js
git commit -m "feat: one-click apply + install detection in the gallery"
```

---

## Phase 4 — Deploy

### Task 7: Deploy-Dokumentation + Verdrahtung

**Files:**
- Create: `store/GALLERY-DEPLOY.md`
- Modify: `store/SUBMIT.md` (Hinweis auf neue Manifest-Felder)
- Modify: `CLAUDE.md` (Galerie + Packs dokumentieren)

**Interfaces:**
- Consumes: nichts.
- Produces: Doku, kein Laufzeitcode.

- [ ] **Step 1: Deploy-Anleitung**

Erstelle `store/GALLERY-DEPLOY.md`:

```markdown
# Deploying the Animation Gallery (GitHub Pages)

## Build
```bash
npm run build:gallery   # -> dist/gallery/ (index.html + gallery.js)
```

## Wire the extension ID
1. Load the unpacked extension once (chrome://extensions) and copy its ID.
2. For production, after publishing to the Web Store, take the published ID.
3. Put it into `gallery/config.js` (`EXT_ID`) and rebuild the gallery.

## externally_connectable
`extension/manifest.json` already lists `https://gapsong.github.io/*` and
`http://localhost/*`. If the gallery moves to another origin, add it there and
rebuild the extension.

## Publish on GitHub Pages
1. Push the contents of `dist/gallery/` to the Pages source (e.g. the `gh-pages`
   branch root, or a `/docs` folder on `main`).
2. In the repo settings, enable Pages for that source.
3. The gallery is then live at https://gapsong.github.io/lichess-kill-anim/.

## Update the store listing
Set `STORE_URL` in `gallery/main.js` to the real Web Store listing URL once the
extension is published, then rebuild the gallery.
```

- [ ] **Step 2: SUBMIT.md ergänzen**

In `store/SUBMIT.md` einen Abschnitt anhängen:

```markdown
## Note on permissions (gallery support)
The extension declares `background` (a tiny service worker) and
`externally_connectable` (the gallery origin) so the gallery can set the chosen
animation. It still requests only the `storage` permission and contains no
remote code. Single purpose is unchanged: kill animations on lichess.org.
```

- [ ] **Step 3: CLAUDE.md ergänzen**

In `CLAUDE.md` einen kurzen Abschnitt ergänzen (bei den Modulen/Build-Scripts), der `src/packs.js` (Pack-Registry), den Galerie-Ordner `gallery/`, `npm run build:gallery` und den `externally_connectable`/Service-Worker-Apply-Pfad beschreibt. Konkret als neue Stichpunkte:

```markdown
- `src/packs.js`: Registry aller wählbaren Animationen (signature/single/theme); `resolvePack(id)` → `{mode,routing,fallback}`
- `gallery/`: statische Galerie-Website (Live-Previews via Engine); Build `npm run build:gallery` → `dist/gallery/`
- `src/background-entry.js` + `src/background-message.js`: MV3-Service-Worker; empfängt die Pack-Auswahl der Galerie via `externally_connectable` und schreibt `chrome.storage`
```

- [ ] **Step 4: Konsistenz prüfen**

Run: `npm test && npm run build && node --check lichess-kill-notifier.user.js && npm run build:ext && npm run build:gallery`
Expected: alles grün/erfolgreich (reine Doku-Änderungen, kein Code berührt).

- [ ] **Step 5: Commit**

```bash
git add store/GALLERY-DEPLOY.md store/SUBMIT.md CLAUDE.md
git commit -m "docs: gallery deploy guide and manifest/permission notes"
```

---

## Self-Review

- **Spec coverage:** A (Pack-Registry) → Task 1; B (Engine-Routing) → Task 2; C (settings.packId + Runtime) → Task 3; D (Apply: Worker + externally_connectable + Install-Erkennung) → Tasks 4,6; E (Galerie: Grid, Live-Previews, Apply, Banner) → Tasks 5,6; F (Build & Deploy) → Tasks 5,7 (+ Worker-Bundling Task 4); G (Tests) → Tasks 1,2,3,4,6; H (Phasen) → Phasen-Gliederung. Manuelle Verifikation → Tasks 5,6.
- **Bewusste Vereinfachung:** Genaue GitHub-Pages-Quelle (gh-pages vs. /docs) bleibt eine Deploy-Entscheidung in `store/GALLERY-DEPLOY.md`, kein Code. `STORE_URL`/`EXT_ID` sind dokumentierte Platzhalter, die erst nach Publish final gesetzt werden.
- **Placeholder scan:** Keine TBD/„handle edge cases". `EXT_ID = '__REPLACE_WITH_EXTENSION_ID__'` und `STORE_URL` sind bewusste, dokumentierte Platzhalter (Task 7 + Manuell-Schritte).
- **Type consistency:** `resolvePack(packId) -> {mode,routing,fallback}`, `getPack`, `PACKS`/`EFFECTS`, `settings.packId`, `routing`/`fallback` (Engine), `handleExternalMessage(msg,{getVersion,setPack})`, `buildPingMessage`/`buildSetPackMessage`/`pingExtension`/`applyPack`, `startPreview(canvas,packId)` — über alle Tasks konsistent. `mode` wird in Task 3 vollständig durch `packId` ersetzt (settings + runtime + Tests).
