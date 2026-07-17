# Design: Lichess Kill Animations als Chrome-Extension

**Datum:** 2026-06-18
**Branch (Ausgang):** canvas-sprite-renderer
**Status:** Genehmigt (Design), wartet auf Implementierungsplan

## Ziel

Das bestehende Kill-Animations-Userscript zusätzlich als echte **Chrome-Extension
(Manifest V3)** ausliefern, damit Endnutzer es ohne Tampermonkey installieren und
sofort Animationen haben. Deckt Edge/Brave mit ab (gleiches Paket). Mit kleinem
Bedien-Popup (An/Aus, Sound, Intensität), Einstellungen via `chrome.storage`.

## Entscheidungen / Defaults

- Store-Name: **Lichess Kill Animations**
- Store-Texte: **Englisch**
- **Tampermonkey-Build bleibt** erhalten (Dev-/Fallback-Pfad), läuft über dieselbe Runtime.
- Zielbrowser: **Chrome** (+ Edge/Brave). Kein Firefox in dieser Runde.
- Liefergrenze: baubare Extension + upload-fertiges `.zip` + Icons + Store-Texte +
  Einreich-Anleitung. **Einreichung selbst macht der Nutzer** (eigener Google-Dev-
  Account, 5 USD, Upload).

## Nicht-Ziele (diese Runde)

- Keine Firefox-Extension, kein Cross-Browser-Manifest.
- Kein Animation-Pack-Store / Multi-Creator-Upload (separates, späteres Projekt).
- Kein Background-Service-Worker (nicht nötig).
- Keine automatische Store-Einreichung durch den Agenten.
- Kein volles Tuning-UI im Popup (nur An/Aus, Sound, Intensität).

## A) Architektur — eine Quelle, zwei Ausgaben

`src/` bleibt Single Source of Truth. Die Renderer-Verdrahtung wird aus
`userscript-entry.js` in ein **Runtime-Modul** extrahiert:

- `src/runtime.js` *(neu)*: kapselt Overlay, `CaptureEventStream`, Scan,
  Frame-Loop, Toast und Renderer-Erzeugung. API:
  - `createRuntime({ config, onImpact }) -> runtime`
  - `runtime.start()` — MutationObserver + erster Scan
  - `runtime.applyConfig(partialConfig)` — aktualisiert laufenden Renderer
    (`intensity`, `soundOn`, `mode`) und das `enabled`-Flag; bei `enabled:false`
    wird nicht gerendert (Frame-Loop spawnt keine neuen Effekte)
  - `runtime.stop()` — Observer trennen (für Tests/Teardown)
- `src/userscript-entry.js`: nutzt die Runtime mit statischen Defaults aus
  `settings.js`. Tampermonkey-Build unverändert in der Funktion.
- `src/extension-entry.js` *(neu)*: Content-Script. Lädt Settings aus
  `chrome.storage.sync` (gemerged mit Defaults), `runtime.start()`, hört auf
  `chrome.storage.onChanged` und ruft `runtime.applyConfig(...)` für Live-Update.

Beide Einstiege teilen dieselbe Runtime → kein Duplikat.

`onImpact` (Board-Shake) bleibt wie aktuell: Shake nur, wenn
`config.shakePieces` die Angreifer-Figur enthält (Default `['q']`).

## B) Settings-Modul (`src/settings.js`)

Zentrale Defaults:

```js
export const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'signature',     // 'signature' | 'random' | feste Effekt-id
  intensity: 7,          // 1..10
  soundOn: true,
  buildupMs: 0,          // 0 = sofort, kein Crosshair
  shakePieces: ['q']     // Angreifer-Figuren, die Board-Shake auslösen
};

export function mergeSettings(stored) { /* defaults + validierte Übernahme */ }
```

`mergeSettings`:
- unbekannte Keys ignorieren
- `intensity` auf 1–10 klemmen, Nicht-Zahl → Default
- `enabled`/`soundOn` zu Boolean zwingen
- `mode` nur akzeptieren, wenn String; sonst Default
- `shakePieces` nur Array aus bekannten Figuren-Buchstaben (`p n b r q k`)

Userscript-Entry und Content-Script und Popup nutzen dieselben Defaults.

## C) Extension-Bestandteile (`extension/` als Quelle, Build nach `dist/extension/`)

- `extension/manifest.json` (MV3):
  - `manifest_version: 3`, `name`, `version` (aus `package.json` gestempelt),
    `description`
  - `content_scripts`: `matches: ["https://lichess.org/*"]`, `js: ["content.js"]`,
    `run_at: "document_idle"`
  - `action`: `default_popup: "popup.html"`, `default_icon`
  - `icons`: 16/48/128
  - `permissions: ["storage"]` — sonst nichts. Keine Host-Permission nötig
    (Content-Script-Match genügt).
- `extension/popup.html` + `extension/popup.js`:
  - Mini-Panel: Toggle An/Aus, Toggle Sound, Slider Intensität (1–10)
  - liest/schreibt `chrome.storage.sync`; spiegelt aktuelle Werte beim Öffnen
  - Stil: dunkel, ein violetter Akzent (passend zum nuke-Void-Look), echte
    Skalen, kein Gradient-/Emoji-Slop, keine Default-Fonts als Hauptschrift
- `extension/icons/icon-16.png`, `icon-48.png`, `icon-128.png`:
  - Motiv: violetter Schockwellen-Ring auf dunklem Grund (Markenzeichen,
    konsistent zum nuke). Generiert via Playwright-Canvas-Recipe (Projekt nutzt
    Playwright bereits). Kein handgemaltes SVG.

## D) Build & Packaging (`scripts/build-extension.mjs`)

- esbuild: `src/extension-entry.js` → `dist/extension/content.js`
  (`format: 'iife'`, `bundle: true`, **kein** Userscript-Banner; `chess.js`
  eingebettet)
- kopiert `manifest.json` (mit eingestempelter Version), `popup.html`,
  `popup.js`, `icons/*` nach `dist/extension/`
- erzeugt `dist/lichess-kill-animations-v<version>.zip` aus `dist/extension/`
  (upload-fertig)
- `package.json` Scripts ergänzen: `build:ext` (Build), `package:ext`
  (Build + Zip). Bestehende `build`/`test`/`lab:*` bleiben.
- `dist/` wird in `.gitignore` aufgenommen (Build-Artefakt).
- Versionsquelle: `package.json#version`. `manifest.json` im Quellordner hat
  einen Platzhalter, der beim Build ersetzt wird.

## E) Store-Assets & Anleitung (`store/`)

- `store/listing.md`: englische Kurz- + Langbeschreibung, Kategorie-Vorschlag,
  Single-Purpose-Satz (Chrome-Review verlangt klaren Einzweck)
- `store/privacy.md`: Datenschutz — speichert nur lokale Einstellungen
  (`chrome.storage`), kein Tracking, kein Remote-Code (MV3-konform, alles
  gebündelt), keine Datenübertragung
- `store/screenshots/`: Kandidaten 1280×800 aus dem Harness via Playwright
  (Board + Effekte). Nutzer kann echte Lichess-Captures ersetzen.
- `store/SUBMIT.md`: Schritt-für-Schritt — Google-Dev-Account anlegen, 5 USD,
  Paket hochladen, Pflichtfelder (Beschreibung, Icon, Screenshots,
  Permission-Begründung „storage"), Review-Erwartung/Dauer.

## F) Tests (`node:test`)

Deterministische, öffentliche Flächen:
- `test/settings.test.js`: `mergeSettings` — leeres Storage → Defaults;
  Teil-Storage überschreibt nur genannte Keys; `intensity` 0/15/'x' →
  geklemmt/Default; unbekannte Keys ignoriert; `shakePieces` filtert
  ungültige Einträge.
- `test/runtime.test.js`: `applyConfig` setzt `renderer.intensity/soundOn/mode`
  durch; `enabled:false` unterdrückt das Spawnen neuer Effekte; `start`/`stop`
  registrieren/trennen den Observer (mit jsdom + Fake-Renderer/Overlay-Doubles).
- Bestehende 72 Tests bleiben grün.
- **Nicht** unit-getestet: Popup-DOM, Content-Script-Injektion, `chrome.*`-APIs
  → manuell „Entpackt laden" in Chrome.

## G) Phasen (jede für sich grün & baubar)

1. **Refactor + Settings** — `src/settings.js` + `src/runtime.js` extrahieren;
   `userscript-entry.js` auf Runtime + Defaults umstellen; `settings`/`runtime`
   Tests; `npm test && npm run build && node --check lichess-kill-notifier.user.js`
   grün.
2. **Extension-Core** — `src/extension-entry.js`, `extension/manifest.json`,
   `scripts/build-extension.mjs`; `npm run build:ext` erzeugt `dist/extension/`;
   in Chrome „Entpackt laden" rendert Animationen auf Lichess.
3. **Popup + Icons** — `popup.html`/`popup.js` mit Live-Update über
   `chrome.storage`; Icon-Generator + 3 PNGs.
4. **Packaging + Store-Assets** — `package:ext` (Zip), `store/listing.md`,
   `store/privacy.md`, Screenshots, `store/SUBMIT.md`.

## Manuelle Verifikation (Phasen 2–4)

- Chrome → `chrome://extensions` → Entwicklermodus → „Entpackt laden" →
  `dist/extension/`
- `https://lichess.org` Partie/TV/Puzzle mit Captures: Animationen erscheinen
- Popup: Toggles/Slider ändern → Effekt live (An/Aus sofort, Intensität/Sound
  beim nächsten Capture)
- `dist/lichess-kill-animations-v<version>.zip` lässt sich als Paket im
  Store-Dashboard hochladen

## Risiken / offene Punkte

- **Chrome-Review:** Single-Purpose klar (Kill-Animationen auf Lichess);
  `storage` begründet; kein Remote-Code (MV3-Pflicht erfüllt, alles gebündelt).
  Review-Dauer variabel.
- **chess.js-Lizenz** im Bundle: bereits im Userscript so; für den Store im
  Listing/Quelle erwähnen, falls nötig.
- **Versions-Drift** Userscript-Banner (`@version`) vs. `package.json` vs.
  Manifest: Build stempelt Manifest aus `package.json`; Userscript-Banner-Sync
  ist optional und nicht Teil dieser Runde.
