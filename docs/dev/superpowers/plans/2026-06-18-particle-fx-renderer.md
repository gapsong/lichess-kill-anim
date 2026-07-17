# Partikel-FX-Renderer (Chess Carnage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Spritesheet-Pipeline vollständig durch die Live-Partikel-Engine „Chess Carnage" (`ParticleFxRenderer`) ersetzen, den Crosshair-Buildup als Engine-Feature zurückbringen und die Effekte/Sound/Shake polierbar machen.

**Architecture:** `ParticleFxRenderer` ist API-kompatibel zu `CanvasSpriteRenderer` (`play`, `tick`, `activeCount`, `onImpact`) und zeichnet board-lokal zur Laufzeit — keine Spritesheet-Generierung. Der Crosshair-Buildup wird als optionale `buildupMs`-Erweiterung mit einer Pending-Queue in `tick()` implementiert, ohne die `spawn()`-Effektlogik anzufassen.

**Tech Stack:** Vanilla JS ES-Module, `node:test` + `node:assert/strict`, esbuild (IIFE-Bundle), WebAudio (synth SFX), Canvas 2D.

## Global Constraints

- Quelle der Engine: `/Users/tonthat/lichess-integration/particle-fx-renderer.js` (kopieren, nicht neu erfinden).
- Build-Pflicht nach jeder `src/`-Änderung: `npm test && npm run build && node --check lichess-kill-notifier.user.js` — alle drei müssen erfolgreich sein.
- Tests prüfen nur deterministische, öffentliche Flächen (Routing, Lebenszyklus, Buildup-Timing). Keine Pixel-Asserts (Effekte nutzen `Math.random`).
- `lab/` und `scripts/animations/` bleiben **unangetastet** (eingefroren, separater Spec später).
- Bestehende Tests (MoveFeed, ChessState, RenderEvent, Board-Geometry, Canvas-Overlay, Event-Stream, En Passant, Lichess-TV/Puzzle-Regression, Tournament, GAN-Harness) bleiben grün.
- `package.json` wird NICHT geändert (kein Script referenziert die Sprite-Pipeline).
- Commits nur lokal; kein Push ohne ausdrückliche Ansage des Nutzers.

---

## Phase 1 — Port + Replace

### Task 1: Engine nach `src/` + Routing-/Lebenszyklus-Tests

**Files:**
- Create: `src/particle-fx-renderer.js` (Kopie von `/Users/tonthat/lichess-integration/particle-fx-renderer.js`)
- Test: `test/particle-fx-renderer.test.js`

**Interfaces:**
- Consumes: nichts (Engine ist self-contained, keine Imports).
- Produces: `class ParticleFxRenderer` mit `new ParticleFxRenderer({ onImpact, mode, intensity, soundOn })`, Methoden `play(renderEvent, nowMs?) -> boolean`, `tick(nowMs, ctx, size)`, `effectFor(renderEvent) -> string`, Getter `activeCount -> number`. Default export ebenfalls vorhanden.

- [ ] **Step 1: Engine-Datei kopieren**

```bash
cp /Users/tonthat/lichess-integration/particle-fx-renderer.js src/particle-fx-renderer.js
```

- [ ] **Step 2: Syntax prüfen**

Run: `node --check src/particle-fx-renderer.js`
Expected: kein Output, Exit 0.

- [ ] **Step 3: Failing test schreiben**

Erstelle `test/particle-fx-renderer.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { ParticleFxRenderer } from '../src/particle-fx-renderer.js';

function reFor(attackerPiece, victimPiece) {
  return {
    board: { squareSize: 80 },
    attacker: { piece: attackerPiece },
    victim: { piece: victimPiece, color: 'b', at: { x: 100, y: 100 } }
  };
}

test('signature routing maps each attacker piece to its effect', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('q', 'p')), 'nuke');
  assert.equal(r.effectFor(reFor('n', 'p')), 'slash');
  assert.equal(r.effectFor(reFor('b', 'p')), 'zap');
  assert.equal(r.effectFor(reFor('r', 'p')), 'smash');
  assert.equal(r.effectFor(reFor('p', 'p')), 'pixel');
});

test('captured king routes to ascension regardless of attacker', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('q', 'k')), 'ascension');
});

test('unknown attacker piece falls back to splatter', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('x', 'p')), 'splatter');
});

test('play without victim.at returns false and does not throw', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.play({ board: { squareSize: 80 }, victim: {} }), false);
});

test('play spawns particles so activeCount grows then play fires onImpact once (instant mode)', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, onImpact: () => { impacts++; } });
  assert.equal(r.activeCount, 0);
  assert.equal(r.play(reFor('q', 'p')), true);
  assert.ok(r.activeCount > 0);
  assert.equal(impacts, 1);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/particle-fx-renderer.test.js`
Expected: alle 5 Tests PASS (die Engine ist bereits korrekt; dieser Test pinnt das Verhalten fest, bevor wir verdrahten).

- [ ] **Step 5: Commit**

```bash
git add src/particle-fx-renderer.js test/particle-fx-renderer.test.js
git commit -m "feat: add ParticleFxRenderer engine with routing/lifecycle tests"
```

---

### Task 2: `userscript-entry.js` auf Partikel-Engine verdrahten

**Files:**
- Modify: `src/userscript-entry.js`

**Interfaces:**
- Consumes: `ParticleFxRenderer` (Task 1), `shakeElement` aus `./board-shake.js`, `createRenderEvent` aus `./render-event.js`.
- Produces: keine neuen Exports (Einstiegsdatei).

- [ ] **Step 1: Imports umstellen**

Ersetze die Zeilen 1–8 in `src/userscript-entry.js`:

```js
import { shakeElement } from './board-shake.js';
import { CanvasOverlay } from './canvas-overlay.js';
import { CaptureEventStream } from './event-stream.js';
import { createRenderEvent } from './render-event.js';
import { ParticleFxRenderer } from './particle-fx-renderer.js';
import { readSnapshot } from './move-feed.js';
```

(Entfernt: `CanvasSpriteRenderer`, `defaultAnimationPack`, `createCanvasSpriteDrawer`.)

- [ ] **Step 2: Config-Konstanten ergänzen**

Direkt nach den Imports (vor `const PIECE_NAMES`) einfügen:

```js
// Renderer-Konfiguration (zur Laufzeit über renderer.* überschreibbar)
const RENDER_MODE = 'signature'; // 'signature' | 'random' | feste id wie 'nuke'
const INTENSITY = 7;             // 1..10
const SOUND_ON = true;           // WebAudio-Synth-SFX
```

- [ ] **Step 3: `ensureRenderer()` auf Partikel-Engine umstellen**

Ersetze den `if (!renderer) { ... }`-Block (aktuell Zeilen 61–74):

```js
  if (!renderer) {
    renderer = new ParticleFxRenderer({
      mode: RENDER_MODE,
      intensity: INTENSITY,
      soundOn: SOUND_ON,
      onImpact: (renderEvent, opts) => {
        if (overlay.board) {
          shakeElement(overlay.board, {
            amplitude: opts?.amplitude ?? 3,
            durationMs: opts?.durationMs ?? 160
          });
        }
      }
    });
  }
```

- [ ] **Step 4: `frame()` reicht Context + Size an `tick` durch**

Ersetze in `frame()` die Zeile `renderer?.tick(nowMs);` (aktuell Zeile 113):

```js
  renderer?.tick(nowMs, currentContext, currentSize);
```

- [ ] **Step 5: Syntax prüfen**

Run: `node --check src/userscript-entry.js`
Expected: kein Output, Exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/userscript-entry.js
git commit -m "feat: wire userscript entry to ParticleFxRenderer"
```

---

### Task 3: Sprite-Pipeline entfernen + Build verifizieren

**Files:**
- Delete: `src/canvas-sprite-renderer.js`, `src/default-animation-pack.js`, `src/spritesheet.js`, `src/timeline.js`, `src/animation-pack.js`
- Delete: `scripts/generate-spritesheet.mjs`
- Delete: `test/canvas-sprite-renderer.test.js`, `test/spritesheet.test.js`, `test/animation-pack.test.js`, `test/timeline.test.js`
- Delete: `artifacts/spritesheets/` (falls vorhanden)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts. (Reines Entfernen; Task 2 hat alle Referenzen bereits gelöst.)

- [ ] **Step 1: Sicherstellen, dass keine `src/`-Datei mehr auf die zu löschenden Module verweist**

Run:
```bash
grep -rn "canvas-sprite-renderer\|default-animation-pack\|'./spritesheet\|\"./spritesheet\|/timeline.js\|animation-pack.js" src/
```
Expected: kein Treffer (leer). Falls Treffer: zuerst dort entfernen, bevor gelöscht wird.

- [ ] **Step 2: Module + Script + Tests + Artefakte löschen**

```bash
git rm src/canvas-sprite-renderer.js src/default-animation-pack.js src/spritesheet.js src/timeline.js src/animation-pack.js
git rm scripts/generate-spritesheet.mjs
git rm test/canvas-sprite-renderer.test.js test/spritesheet.test.js test/animation-pack.test.js test/timeline.test.js
git rm -r --ignore-unmatch artifacts/spritesheets
```

- [ ] **Step 3: Tests laufen lassen**

Run: `npm test`
Expected: PASS, ohne die gelöschten Suites; keine „Cannot find module"-Fehler. (`scripts/animations/*` und `lab/` bleiben unberührt und werden von `node --test` nur ausgeführt, wenn sie Tests enthalten — `test/gan-harness.test.js` und `test/tournament.test.js` laufen weiter grün.)

- [ ] **Step 4: Userscript bauen + prüfen**

Run:
```bash
npm run build
node --check lichess-kill-notifier.user.js
```
Expected: Build ohne Fehler; `lichess-kill-notifier.user.js` deutlich kleiner als vorher (~135 KB → erwartet <40 KB, da keine base64-Spritesheets mehr eingebettet sind); `node --check` Exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove sprite pipeline in favor of particle renderer"
```

---

### Task 4: Effekt-Harness ins Repo (lokaler Tester)

**Files:**
- Create: `scripts/debug/harness.html` (Kopie von `/Users/tonthat/lichess-integration/harness.html`, Import-Pfad angepasst)

**Interfaces:**
- Consumes: `src/particle-fx-renderer.js` über relativen Pfad.
- Produces: nichts (Debug-Tool, nicht Teil des Builds).

- [ ] **Step 1: Harness kopieren**

```bash
cp /Users/tonthat/lichess-integration/harness.html scripts/debug/harness.html
```

- [ ] **Step 2: Import-Pfad auf `src/` umbiegen**

In `scripts/debug/harness.html` die Zeile
```js
import { ParticleFxRenderer } from './particle-fx-renderer.js';
```
ersetzen durch
```js
import { ParticleFxRenderer } from '../../src/particle-fx-renderer.js';
```

- [ ] **Step 3: Manuell verifizieren (optional, lokal)**

Harness im Browser öffnen (z. B. über einen lokalen Static-Server aus dem Repo-Root) und prüfen, dass die Effekt-Buttons board-lokal rendern. Kein automatischer Test.

- [ ] **Step 4: Commit**

```bash
git add scripts/debug/harness.html
git commit -m "chore: add particle effect harness for local tuning"
```

---

## Phase 2 — Crosshair-Buildup

### Task 5: `buildupMs` + Pending-Queue + Reticle in der Engine

**Files:**
- Modify: `src/particle-fx-renderer.js`
- Test: `test/particle-fx-renderer.test.js`

**Interfaces:**
- Consumes: bestehende Engine-Methoden `spawn()`, `addP()`, `playSound()`, Property `SHAKE`, `onImpact`.
- Produces: erweiterte API: `new ParticleFxRenderer({ ..., buildupMs })` (Default `0` = sofortiger Impact), neue Methoden `fireImpact(id, cx, cy, S, victim, renderEvent)`, `spawnCrosshair(cx, cy, S)`, `drawReticle(p, ctx, t)`; `activeCount` zählt jetzt `particles.length + pending.length`. Partikel-Kind `'reticle'`.

- [ ] **Step 1: Failing tests für Buildup schreiben**

An `test/particle-fx-renderer.test.js` anhängen:

```js
test('buildup delays impact: onImpact fires only after buildupMs', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, buildupMs: 680, onImpact: () => { impacts++; } });
  assert.equal(r.play(reFor('q', 'p'), 1000), true);
  // crosshair spawned + main effect pending, but no impact yet
  assert.equal(impacts, 0);
  assert.ok(r.activeCount > 0);
  // tick before fireAt (1000 + 680 = 1680) -> still no impact
  r.tick(1500, null);
  assert.equal(impacts, 0);
  // tick at/after fireAt -> impact fires
  r.tick(1700, null);
  assert.equal(impacts, 1);
});

test('buildup impact fires exactly once across multiple ticks', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, buildupMs: 680, onImpact: () => { impacts++; } });
  r.play(reFor('q', 'p'), 1000);
  r.tick(1700, null);
  r.tick(1800, null);
  r.tick(1900, null);
  assert.equal(impacts, 1);
});

test('buildupMs default is 0 so impact stays instant', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, onImpact: () => { impacts++; } });
  r.play(reFor('q', 'p'));
  assert.equal(impacts, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/particle-fx-renderer.test.js`
Expected: die 2 neuen Buildup-Tests FAIL (`onImpact` feuert sofort, da `buildupMs` noch nicht existiert); `buildupMs default 0` PASS.

- [ ] **Step 3: Konstruktor + Pending-State**

In `src/particle-fx-renderer.js`, Konstruktor-Signatur erweitern und Felder ergänzen.

Signatur (Zeilen 24–29) ändern zu:
```js
  constructor({
    onImpact = null,
    mode = 'signature', // 'signature' | 'random' | a fixed effect id
    intensity = 7,      // 1..10
    soundOn = true,
    buildupMs = 0       // 0 = instant impact; >0 = crosshair buildup before impact
  } = {}) {
```

Im Konstruktor-Body nach `this.soundOn = soundOn;` ergänzen:
```js
    this.buildupMs = buildupMs;
    this.pending = [];
```

- [ ] **Step 4: `activeCount` zählt Pending mit**

Getter (Zeilen 42–44) ersetzen:
```js
  get activeCount() {
    return this.particles.length + this.pending.length;
  }
```

- [ ] **Step 5: `play()` auf Buildup/Instant aufteilen + `fireImpact` extrahieren**

`play()` (Zeilen 47–69) ersetzen durch:
```js
  play(renderEvent, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    const at = renderEvent?.victim?.at;
    const S = renderEvent?.board?.squareSize || REF_SQUARE;
    if (!at) return false;

    this._S = S;
    this._k = S / REF_SQUARE;

    const id = this.effectFor(renderEvent);
    const victim = {
      type: renderEvent.victim.piece || 'p',
      color: renderEvent.victim.color || 'b'
    };

    if (this.buildupMs > 0) {
      // targeting buildup: reticle now, main effect + impact after buildupMs
      this.spawnCrosshair(at.x, at.y, S);
      this.pending.push({
        id, cx: at.x, cy: at.y, S, victim, renderEvent,
        fireAt: nowMs + this.buildupMs
      });
    } else {
      this.fireImpact(id, at.x, at.y, S, victim, renderEvent);
    }
    return true;
  }

  fireImpact(id, cx, cy, S, victim, renderEvent) {
    this.spawn(id, cx, cy, S, victim);
    const sh = this.intensity / 6;
    const amp = (this.SHAKE[id] || 6) * sh;
    this.onImpact?.(renderEvent, { amplitude: Math.max(2, amp), durationMs: 320 });
    if (this.soundOn) this.playSound(id);
  }
```

- [ ] **Step 6: `tick()` verarbeitet Pending-Queue vor dem Zeichnen**

`tick()` (Zeilen 71–82) ersetzen durch:
```js
  tick(nowMs, ctx, size) {
    // fire any pending impacts whose buildup has elapsed (runs even without ctx)
    if (this.pending.length) {
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const q = this.pending[i];
        if (nowMs >= q.fireAt) {
          this.fireImpact(q.id, q.cx, q.cy, q.S, q.victim, q.renderEvent);
          this.pending.splice(i, 1);
        }
      }
    }
    if (!ctx) return;
    const ps = this.particles;
    // update + cull
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      this.updateP(p);
      if (p.dead) ps.splice(i, 1);
    }
    // draw in spawn order so backgrounds (flash) sit under glyph under sparks under text
    for (let i = 0; i < ps.length; i++) this.drawP(ps[i], ctx);
  }
```

- [ ] **Step 7: Reticle-Partikel: spawn, update-Bypass, draw**

a) `spawnCrosshair` als neue Methode direkt nach `fireImpact` einfügen:
```js
  spawnCrosshair(cx, cy, S) {
    const frames = Math.max(8, Math.round(this.buildupMs / 16));
    this.addP({ kind: 'reticle', x: cx, y: cy, S, color: '#ff5a5a', max: frames });
  }
```

b) In `updateP` die physikfreie Kind-Liste (aktuell `if (p.kind === 'bolt' || p.kind === 'flash' || p.kind === 'beam' || p.kind === 'streak') return;`) um `reticle` erweitern:
```js
    if (p.kind === 'bolt' || p.kind === 'flash' || p.kind === 'beam' || p.kind === 'streak' || p.kind === 'reticle') return;
```

c) In `drawP`, vor der `// ---- particle shapes ----`-Zeile, einen Reticle-Branch ergänzen:
```js
    if (p.kind === 'reticle') { this.drawReticle(p, ctx, t); return; }
```

d) `drawReticle` als neue Methode nach `drawGlyphHalf` einfügen:
```js
  drawReticle(p, ctx, t) {
    const S = p.S;
    const ease = 1 - Math.pow(1 - t, 2);
    const gap = S * (0.95 - 0.45 * ease);   // brackets close in over time
    const len = S * 0.26;
    const rot = t * Math.PI * 0.5;          // slow quarter rotation
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 6));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.min(1, t * 4) * pulse; // quick fade-in, then pulse
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1.5, S * 0.04);
    ctx.lineCap = 'round';
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    for (let q = 0; q < 4; q++) {
      const sx = q < 2 ? -1 : 1;
      const sy = (q % 2 === 0) ? -1 : 1;
      const x = sx * gap, y = sy * gap;
      ctx.beginPath();
      ctx.moveTo(x, y - sy * len); ctx.lineTo(x, y); ctx.lineTo(x - sx * len, y);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1, S * 0.03), 0, 6.2832);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --test test/particle-fx-renderer.test.js`
Expected: alle Tests PASS (inkl. der 2 neuen Buildup-Tests).

- [ ] **Step 9: Commit**

```bash
git add src/particle-fx-renderer.js test/particle-fx-renderer.test.js
git commit -m "feat: add crosshair buildup (buildupMs + pending queue + reticle)"
```

---

### Task 6: Buildup im Userscript aktivieren

**Files:**
- Modify: `src/userscript-entry.js`

**Interfaces:**
- Consumes: `buildupMs`-Option der Engine (Task 5).
- Produces: nichts.

- [ ] **Step 1: Buildup-Konstante ergänzen**

Bei den Config-Konstanten (Task 2, Step 2) ergänzen:
```js
const BUILDUP_MS = 680;          // Targeting-Buildup vor Impact (0 = sofort)
```

- [ ] **Step 2: An die Engine durchreichen**

Im `new ParticleFxRenderer({ ... })`-Aufruf in `ensureRenderer()` ergänzen (nach `soundOn: SOUND_ON,`):
```js
      buildupMs: BUILDUP_MS,
```

- [ ] **Step 3: Build + Check**

Run:
```bash
node --check src/userscript-entry.js
npm test
npm run build
node --check lichess-kill-notifier.user.js
```
Expected: alle erfolgreich.

- [ ] **Step 4: Commit**

```bash
git add src/userscript-entry.js
git commit -m "feat: enable 680ms crosshair buildup in userscript"
```

---

## Phase 3 — Politur + Dokumentation

### Task 7: Dokumentation aktualisieren

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: `CLAUDE.md` umschreiben**

Folgende Abschnitte entfernen/ersetzen:
- „Wenn Animation-Quellen in `scripts/animations/` geaendert wurden …" + „Pixelate-Pass" + „Animation-Recipes" + „Neue Animation schreiben" + „Glow-Technik" + „Verfuegbare Utility-Funktionen" → entfernen (Pipeline existiert nicht mehr).
- Modul-Liste: `canvas-sprite-renderer.js`, `spritesheet.js`, `timeline.js`, `animation-pack.js`, `default-animation-pack.js` entfernen; neu: `src/particle-fx-renderer.js` (Live-Partikel-Engine, board-lokal, `buildupMs`-Crosshair).
- Build-Scripts: `generate-spritesheet.mjs` entfernen.
- Routing-Tabelle ersetzen durch die Partikel-`SIG`-Zuordnung: `q→nuke, r→smash, n→slash, b→zap, p→pixel, k(Opfer)→ascension, Fallback→splatter`. Hinweis: Impact nach `buildupMs` (Default 680).
- Build-Anweisung vereinfachen: nur noch `npm test && npm run build && node --check lichess-kill-notifier.user.js` (kein `generate-spritesheet` mehr).
- Test-Abschnitt: alte Gesamtzahl entfernen; mit `npm test` ermittelte aktuelle Zahl eintragen und die Stichpunkte auf Partikel-Routing/Buildup-Timing umstellen.
- Hinweis ergänzen: `lab/` und `scripts/animations/` sind eingefroren (kein Production-Bezug; Umbau auf Partikel-Varianten ist separater Spec). Tester: `scripts/debug/harness.html`.

- [ ] **Step 2: `README.md` analog aktualisieren**

Sprite-/Spritesheet-Erwähnungen durch die Partikel-Engine ersetzen; Build-Schritte angleichen.

- [ ] **Step 3: Konsistenz prüfen**

Run:
```bash
grep -n "spritesheet\|Spritesheet\|generate-spritesheet\|CanvasSpriteRenderer\|Pixelate\|drawSize\|frameDurations" CLAUDE.md README.md
```
Expected: keine veralteten Referenzen mehr in Beschreibungen des aktuellen Stands. (Treffer im eingefrorenen-`lab`/`scripts/animations`-Kontext sind ok, falls explizit als „eingefroren" markiert.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: document particle renderer, drop sprite pipeline"
```

---

### Task 8: Effekt-Politur (harness-getrieben, subjektive Abnahme)

**Files:**
- Modify: `src/particle-fx-renderer.js` (Effekt-Tuning in `spawn()`, `drawReticle`, Farben/Timings)

**Interfaces:**
- Consumes: bestehende Effekt-Primitive (`addP`, `glyph`, `flashBlob`, `bolt`, `bigText`, `drawReticle`).
- Produces: keine API-Änderung — nur visuelles Tuning. Bestehende Tests müssen grün bleiben.

- [ ] **Step 1: Harness öffnen und Ist-Zustand sichten**

`scripts/debug/harness.html` im Browser öffnen, jeden Effekt durchklicken, gegen `docs/ANIMATION-PRINCIPLES.md` bewerten (Anticipation/Impact/Follow-through, Farb-Kohärenz, „Juice").

- [ ] **Step 2: Gezielte Tuning-Runden**

Pro Effekt höchstens kleine, begründete Anpassungen (Partikelanzahl-Faktor `cs`, Lebensdauern `max`, Farbpaletten, Glow, `SHAKE`-Werte, Reticle-`gap`/`pulse`). Nach jeder Runde im Harness gegenprüfen. Keine neuen Effekt-`id`s in dieser Runde (YAGNI).

- [ ] **Step 3: Tests + Build nach Tuning**

Run:
```bash
npm test
npm run build
node --check lichess-kill-notifier.user.js
```
Expected: alle grün (Tuning ändert keine getesteten Flächen).

- [ ] **Step 4: Abnahme durch Nutzer**

Diese Phase ist subjektiv. Nutzer bestätigt den Look (im Userscript live oder via Harness), bevor committet wird.

- [ ] **Step 5: Commit**

```bash
git add src/particle-fx-renderer.js
git commit -m "polish: tune particle effects and reticle per animation principles"
```

---

## Self-Review

- **Spec coverage:** A (entfernen) → Task 3; B (hinzufügen/verdrahten) → Tasks 1,2,4; C (Crosshair-Buildup) → Tasks 5,6; D (Politur + Sound/Shake) → Task 8 (+ `SOUND_ON`/`onImpact`-Wiring in Task 2); E (Tests) → Tasks 1,5; F (Docs) → Task 7; G (Phasen) → Phasen-Gliederung. Lab/scripts/animations eingefroren → Global Constraints + Task 7 Step 1. Alle Spec-Abschnitte abgedeckt.
- **Placeholder scan:** Keine TBD/„handle edge cases"/„similar to"; jeder Code-Step enthält vollständigen Code oder exakte Befehle.
- **Type consistency:** `buildupMs`, `pending`, `fireImpact(id, cx, cy, S, victim, renderEvent)`, `spawnCrosshair(cx, cy, S)`, `drawReticle(p, ctx, t)`, Kind `'reticle'`, `tick(nowMs, ctx, size)` über alle Tasks identisch benannt.
