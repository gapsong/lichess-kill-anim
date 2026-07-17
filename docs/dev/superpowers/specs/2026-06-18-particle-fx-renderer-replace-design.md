# Design: Sprite-Pipeline → Chess-Carnage-Partikel-Engine

**Datum:** 2026-06-18
**Branch (Ausgang):** canvas-sprite-renderer
**Status:** Genehmigt (Design), wartet auf Implementierungsplan

## Ziel

Den bestehenden Spritesheet-basierten Kill-Renderer vollständig durch die
Live-Partikel-Engine „Chess Carnage" (`ParticleFxRenderer`, aktuell in
`../lichess-integration/`) ersetzen. Die Engine ist API-kompatibel zu
`CanvasSpriteRenderer` (`play()`, `tick()`, `activeCount`, `onImpact`) und
zeichnet alles zur Laufzeit board-lokal ins selbe Overlay-Canvas — keine
Spritesheet-Generierung mehr.

Über das bloße Portieren hinaus: deine Signatur-Mechanik (Crosshair-Buildup vor
Impact) zurückbringen und die Effekte/Sound/Shake aufpolieren.

## Nicht-Ziele (diese Runde)

- Kein Umbau von `lab/` oder `scripts/animations/*` — beide werden **eingefroren**
  (kein Production-Bezug mehr; Umbau auf Partikel-Varianten ist ein separater Spec).
- Kein neues Settings-UI im Userscript. Konfiguration nur über Konstanten.
- Keine persistenten Decals (Blutspritzer/Brandflecken am Boden).

## Entscheidungen / Defaults

- `harness.html` wird nach `scripts/debug/` abgelegt.
- Crosshair-Buildup-Default: `buildupMs = 680` (entspricht altem `impactAtMs`).
- Sound/Shake nur über Konstanten justierbar, `soundOn` abschaltbar.

## A) Entfernen

Module:
- `src/canvas-sprite-renderer.js`
- `src/default-animation-pack.js`
- `src/spritesheet.js`
- `src/timeline.js`
- `src/animation-pack.js`

Scripts:
- `scripts/generate-spritesheet.mjs`
- `scripts/animations/*` (inkl. `flash.mjs`, `shared.mjs`, alle Recipes)

Tests:
- `test/canvas-sprite-renderer.test.js`
- `test/spritesheet.test.js`
- `test/animation-pack.test.js`
- etwaige Timeline-Tests

Artefakte:
- `artifacts/spritesheets/`

Effekt: Das gebündelte Userscript schrumpft massiv (keine base64-Spritesheets;
~135 KB → erwartet <40 KB).

**Eingefroren (nicht angefasst):** `lab/`, `scripts/animations/` bleiben im Repo,
verlieren aber den Production-Bezug. `package.json`-Scripts für die
Spritesheet-Generierung werden entfernt; `lab:*`-Scripts bleiben.

## B) Hinzufügen & Verdrahten

- `../lichess-integration/particle-fx-renderer.js` → `src/particle-fx-renderer.js`
- `../lichess-integration/harness.html` → `scripts/debug/harness.html`
- `src/userscript-entry.js`:
  - Import `ParticleFxRenderer` statt `CanvasSpriteRenderer`.
  - `ensureRenderer()` instanziiert `new ParticleFxRenderer({ mode, intensity,
    soundOn, buildupMs, onImpact })`.
  - `frame()` reicht `currentContext, currentSize` an `tick(nowMs, ctx, size)` durch.
  - Zentrale Config-Konstanten oben in der Datei (`mode='signature'`,
    `intensity=7`, `soundOn=true`, `buildupMs=680`).

## C) Crosshair-Buildup (Erweiterung der Engine)

Problem: Die Engine schlägt sofort zu — `play()` macht spawn + `onImpact` + Sound
synchron. Gewünscht ist ein Reticle-Buildup vor dem Impact.

Lösung (isoliert, ohne `spawn()`-Logik umzuschreiben):
- Neue Option `buildupMs` (Default 680).
- `play(renderEvent, nowMs)`:
  - spawnt **sofort** nur die Crosshair-/Reticle-Partikel auf `victim.at`,
  - legt den Haupt-Effekt in eine **Pending-Queue**:
    `{ id, x, y, S, victim, renderEvent, fireAt: nowMs + buildupMs }`.
  - Bei `buildupMs <= 0`: altes Sofort-Verhalten (Pending sofort fällig).
- `tick(nowMs, ctx, size)`:
  - vor dem Partikel-Update Pending-Queue prüfen; für jeden Eintrag mit
    `nowMs >= fireAt`: Haupt-`spawn()` + `onImpact()` + `playSound()` **einmalig**,
    dann aus Queue entfernen.
- `activeCount` zählt Partikel **und** Pending-Einträge, damit die rAF-Loop
  während des Buildups weiterläuft.
- Crosshair-Partikel-Effekt wird aus dem alten `crosshair`-Look nachgebaut
  (Targeting-Reticle, das auf `victim.at` einrastet).

## D) Politur + Sound/Shake (iterativ)

- Effekt-Tuning (Farben, Timing, Glow, „Juice") nach
  `docs/ANIMATION-PRINCIPLES.md`, getestet in `scripts/debug/harness.html`
  bevor gebaut wird.
- Sound/Shake über Config justierbar; `soundOn=false` schaltet WebAudio ab.
- Abnahme dieser Phase ist subjektiv durch den Nutzer.

## E) Tests

Partikel nutzen `Math.random` → nur deterministische, öffentliche Flächen testen:
- Signature-Routing: `q→nuke`, `n→slash`, `b→zap`, `r→smash`, `p→pixel`,
  Opfer-`k→ascension`, Fallback `splatter`.
- `play()` ohne `victim.at` → `false`, kein Crash.
- `activeCount`-Lebenszyklus: `>0` während Buildup, `→0` nach Ablauf aller Effekte.
- Buildup: `onImpact` feuert **nach** `buildupMs`, nicht davor; genau **einmal**
  pro `play()`.
- Bestehende Tests (MoveFeed, ChessState, RenderEvent, En Passant,
  Lichess-TV/Puzzle-Regression) bleiben **unverändert grün**.

Tests, die `onImpact`/Buildup prüfen, treiben `tick()` mit kontrollierten
`nowMs`-Werten (keine echte Zeit, kein `Math.random`-abhängiges Assert).

## F) Dokumentation

- `CLAUDE.md`: Sprite-Pipeline-Abschnitte entfernen (Module, Pixelate-Pass,
  Recipe-Format, Routing-Tabelle), Partikel-Engine dokumentieren (Effekte,
  `SIG`-Routing, `buildupMs`, Build ohne `generate-spritesheet`). Testanzahl
  und Build-Anweisungen anpassen.
- `README.md`: analog aktualisieren.

## G) Phasen (jede für sich grün & baubar)

1. **Port + Replace** — Engine nach `src/`, Sprite-Module/Scripts/Tests/Artefakte
   raus, `userscript-entry.js` verdrahten (`tick`-Signatur), `package.json`
   bereinigen. `npm test` grün, `npm run build`, `node --check
   lichess-kill-notifier.user.js`.
2. **Crosshair-Buildup** — Pending-Queue + `buildupMs` + Crosshair-Partikel +
   Tests.
3. **Politur + Sound/Shake** — harness-getrieben, subjektive Abnahme.

Build-Pflicht nach `src/`-Änderungen (CLAUDE.md): `npm test && npm run build &&
node --check lichess-kill-notifier.user.js`.

## Risiken / offene Punkte

- WebAudio-`AudioContext` braucht User-Gesture; Lichess-Klicks zählen i. d. R.
  als Geste. Falls SFX stumm bleibt: Context-Resume beim ersten `play()` prüfen.
- Opfer-Glyph wird neu auf Canvas gemalt (Unicode-Schachfigur), nicht aus dem
  DOM geklont — Lichess entfernt das geschlagene Stück sofort selbst.
- Effekt-Politur ist subjektiv; harness als schnelle Feedback-Schleife.
