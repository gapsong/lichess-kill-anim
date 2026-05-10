# Lichess Kill Animations

## Projektzweck

Dieses Repo enthaelt ein Lichess-Userscript, das Capture-Zuege mit Kill-Animationen visualisiert. Das aktuelle Installationsziel ist Tampermonkey auf `https://lichess.org/*`.

Langfristig soll daraus ein System entstehen, in dem Nutzer Animation Packs installieren koennen. Der Store ist aber nachgelagert: Zuerst muss der Core robust Captures erkennen und Animationen sauber rendern.

## Aktueller Stand

Der lesbare Quellcode liegt in `src/`. Die installierbare Tampermonkey-Datei ist:

- `lichess-kill-notifier.user.js`

Diese Datei wird generiert. Nicht direkt darin refactoren, ausser es geht um einen schnellen manuellen Gegencheck. Normale Aenderungen gehen in `src/`, danach:

```bash
npm test
npm run build
```

Der aktuelle Stand ist ein gebundeltes Ein-Datei-Userscript: `chess.js` wird per `esbuild` in `lichess-kill-notifier.user.js` eingebettet, damit Tampermonkey keine externe Runtime-Abhaengigkeit braucht.

Wichtige Module:

- `src/chess-state.js`: erzeugt CaptureEvents aus Start-FEN und SAN-Zugliste via `chess.js`
- `src/move-feed.js`: liest Lichess-Zuglisten aus dem DOM
- `src/board-geometry.js`: rechnet Squares in Pixelkoordinaten um
- `src/event-stream.js`: dedupliziert Events ueber MutationObserver-Scans
- `src/render-event.js`: reichert CaptureEvents mit board-lokalen Canvas-Koordinaten an
- `src/canvas-overlay.js`: verwaltet ein board-lokales Canvas ueber `cg-board`
- `src/animation-pack.js`: waehlt deklarative Timeline-Rules
- `src/timeline.js`: interpoliert Keyframes
- `src/spritesheet.js`: laedt Spritesheets und zeichnet Frames
- `src/canvas-sprite-renderer.js`: spielt parallele Canvas-Sprite-Timelines
- `src/default-animation-pack.js`: eingebettetes Debug-Spritesheet und Default-Timeline
- `src/userscript-entry.js`: Tampermonkey-Einstieg, Toasts und Canvas-Renderer
- `scripts/build-userscript.mjs`: baut die installierbare Datei

Das alte Problem `square.last-move` ist entfernt. Turm-Richtung kommt jetzt aus `event.from -> event.to`.
Die alten CSS/DOM-Animationen mit `.ka` sind im Canvas-Branch ersetzt. Animationen laufen ueber `#lichess-kill-overlay`.

## Lichess-DOM-Wissen

Normale Partie/Analyse kann SAN-Zuege als `move san` oder `.analyse__moves san` enthalten.

Lichess TV verwendet aktuell andere custom Tags:

```txt
rm6 > l4x > kwdb
```

Die sichtbaren SAN-Zuege stehen dort direkt in `kwdb`. Deshalb muss `MoveFeed` diese Selektoren unterstuetzen:

Puzzle-Seiten (`/training`) verwenden wieder eine andere Struktur:

```txt
main.puzzle move
```

Die sichtbaren SAN-Zuege stehen dort direkt im `move`-Text, oft mit Klasse `hist`.
Nach geloesten oder angezeigten Puzzle-Zuegen haengt Lichess Feedback-Zeichen direkt an den SAN-Text, zum Beispiel `Bxf7+✓` oder `Nd5#✓`. `MoveFeed` muss diese Marker entfernen, bevor `chess.js` die SAN verarbeitet.

Auf `/training` kann der Pfad gleich bleiben, waehrend ein neues Puzzle geladen wird. `MoveFeed` nutzt deshalb die sichtbare Puzzle-ID, zum Beispiel `#BS3bW`, als Teil von `snapshot.id`, damit `CaptureEventStream` seine Dedupe-Daten pro Puzzle zuruecksetzt.

- `move san`
- `.analyse__moves san`
- `.tview2 move san`
- `main.puzzle move`
- `rm6 l4x kwdb`
- `l4x kwdb`

Wichtig: SAN-Zuege duerfen nicht mit `Set` dedupliziert werden. Dieselbe SAN kann in einer Partie mehrfach legal vorkommen, zum Beispiel `Nf3`.

Wenn keine Zugliste gefunden wird, soll `readSnapshot()` `null` liefern und das Userscript still bleiben, statt zu crashen.

## Architektur

Die aktuelle Architektur ist:

- `MoveFeed`: liest Lichess-Snapshot aus DOM
- `ChessState`: rekonstruiert Spielzustand aus Start-FEN und SAN-Zuegen
- `BoardGeometry`: rechnet Squares in Pixelkoordinaten um
- `CaptureEventStream`: dedupliziert CaptureEvents
- `RenderEvent`: mappt CaptureEvent auf board-lokale Canvas-Daten
- `CanvasSpriteRenderer`: rendert deklarative Sprite-Timelines auf ein Canvas
- `userscript-entry`: rendert Toasts und startet Canvas-Animationen

Single Source of Truth fuer Schachlogik ist der eigene Chess-State mit `chess.js`. Der sichtbare Board-DOM ist nur Input fuer Move-Liste und Pixel-Geometrie.

CaptureEvent-Form:

```js
{
  kind: 'capture',
  ply: 3,
  san: 'exd5',
  from: 'e4',
  to: 'd5',
  movingPiece: 'p',
  movingColor: 'w',
  capturedPiece: 'p',
  capturedColor: 'b',
  capturedAt: 'd5',
  isEnPassant: false
}
```

Bei En Passant ist `capturedAt` nicht gleich `to`; Animationen sollen auf `capturedAt` gerendert werden.

## TDD-Plan

Der Refactor soll testgetrieben erfolgen. Siehe:

- `docs/TDD-GAMEPLAN.md`

Wichtige TDD-Regel: keine grosse Horizontal-Umstellung. Ein Verhalten testen, minimal implementieren, dann naechstes Verhalten.

Aktueller Teststand:

- `node:test` als Test Runner
- `jsdom` fuer DOM-nahe MoveFeed-Tests
- `chess.js` fuer Schachlogik
- Regressionstests fuer Lichess TV custom DOM und wiederholte SAN-Zuege
- Regressionstests fuer Puzzle-Historie, Puzzle-Feedback-Marker und Puzzle-ID-Reset

Verifikation vor Abschluss:

```bash
npm test
npm run build
node --check lichess-kill-notifier.user.js
```

## Scope fuer den ersten stabilen Refactor

In Scope:

- normale Partien
- Analyse-Hauptlinie
- Lichess TV Hauptlinie
- Puzzle-Historie auf `/training`
- Standard-Schach
- robuste Capture-Erkennung
- En Passant als expliziter Edge Case
- deduplizierte Animationen trotz mehrfacher DOM-Mutations

Out of Scope:

- Animation Store
- Browser Extension Packaging
- Studienvarianten
- Puzzle-Varianten jenseits der Haupt-Historie
- Chess960
- eigene Schachregel-Implementierung

## Entwicklungsprinzipien

- DOM nicht als Wahrheit ueber Schachzustand behandeln.
- Schachregeln nicht selbst parsen, wenn `chess.js` verfuegbar ist.
- Animationen sollen Events konsumieren, nicht DOM-Zustand interpretieren.
- Board-Geometrie darf Lichess-DOM kennen, aber keine Schachlogik.
- Tests sollen Verhalten ueber oeffentliche Interfaces beschreiben.
- `lichess-kill-notifier.user.js` nach Aenderungen in `src/` immer neu bauen.
- Bei Lichess-DOM-Aenderungen zuerst mit Playwright oder einem DOM-Fixture reproduzieren, dann Regressionstest ergaenzen.

## Debug-Hilfen

Temporare Browser-Inspektoren liegen unter:

- `scripts/debug/inspect-lichess-tv.mjs`
- `scripts/debug/check-userscript-tv.mjs`

Diese Scripts brauchen einen echten Browser und koennen ausserhalb der Sandbox laufen muessen. Sie sind Diagnosewerkzeuge, nicht Teil des normalen Builds.
