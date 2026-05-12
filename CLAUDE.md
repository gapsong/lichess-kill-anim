# Lichess Kill Animations

## Projektzweck

Dieses Repo enthaelt ein Lichess-Userscript, das Capture-Zuege mit Kill-Animationen visualisiert. Das aktuelle Installationsziel ist Tampermonkey auf `https://lichess.org/*`.

Langfristig soll daraus ein System entstehen, in dem Nutzer Animation Packs installieren koennen. Der Store ist aber nachgelagert: Zuerst muss der Core robust Captures erkennen und Animationen sauber rendern.

## Aktueller Stand

Der lesbare Quellcode liegt in `src/`. Die installierbare Tampermonkey-Datei ist:

- `lichess-kill-notifier.user.js`

Diese Datei wird generiert. Nicht direkt darin refactoren. Normale Aenderungen gehen in `src/`, danach:

```bash
npm test
npm run build
node --check lichess-kill-notifier.user.js
```

Wenn Animation-Quellen in `scripts/animations/` geaendert wurden, vorher Spritesheets neu generieren:

```bash
node scripts/generate-spritesheet.mjs
npm test
npm run build
```

Der aktuelle Stand ist ein gebundeltes Ein-Datei-Userscript: `chess.js` wird per `esbuild` eingebettet, damit Tampermonkey keine externe Runtime-Abhaengigkeit braucht.

## Wichtige Module

### Core-Pipeline

- `src/chess-state.js`: erzeugt CaptureEvents aus Start-FEN und SAN-Zugliste via `chess.js`
- `src/move-feed.js`: liest Lichess-Zuglisten aus dem DOM
- `src/board-geometry.js`: rechnet Squares in Pixelkoordinaten um
- `src/event-stream.js`: dedupliziert Events ueber MutationObserver-Scans
- `src/render-event.js`: reichert CaptureEvents mit board-lokalen Canvas-Koordinaten an
- `src/canvas-overlay.js`: verwaltet ein board-lokales Canvas ueber `cg-board`
- `src/animation-pack.js`: waehlt deklarative Timeline-Rules per `selectTimeline(pack, renderEvent)`
- `src/timeline.js`: interpoliert Keyframes, unterstuetzt `rotationRef`
- `src/spritesheet.js`: laedt Spritesheets und zeichnet Frames
- `src/canvas-sprite-renderer.js`: spielt parallele Canvas-Sprite-Timelines
- `src/default-animation-pack.js`: alle eingebetteten Spritesheets und Timelines
- `src/userscript-entry.js`: Tampermonkey-Einstieg, Toasts und Canvas-Renderer

### Build-Scripts

- `scripts/build-userscript.mjs`: baut die installierbare Datei via esbuild
- `scripts/generate-spritesheet.mjs`: rendert alle Animation-Recipes zu PNG via Playwright, bettet base64 in `src/default-animation-pack.js` ein

### Animation-Recipes

Jede Animation ist ein separates Modul unter `scripts/animations/`:

- `explosion.mjs`: Feuerkugel fuer allgemeinen Impact (Fallback)
- `dagger.mjs`: Dagger-Slash fuer Springer
- `crosshair.mjs`: Targeting-Reticle, erste Layer in allen Timelines
- `slash.mjs`: Schwert-Slash fuer Laeufer (mit Richtungsrotation)
- `shockwave.mjs`: Void-Ring fuer Dame (lila, Nocturne-Style)
- `pop.mjs`: Kleiner schneller Burst fuer Bauer
- `shared.mjs`: Shared utility code (`rand`, `rg`, `debris`, `spark`, `sparks`, `drawBrackets`)

## Animation-System

### Figur-zu-Timeline-Routing

| Figur | Timeline | Spritesheets |
|-------|----------|--------------|
| Dame (q) | `queen-shockwave` | crosshair + shockwave |
| Turm (r) | `rook-impact` | crosshair + explosion (schwer, langsam) |
| Springer (n) | `dagger-kill` | crosshair + dagger |
| Laeufer (b) | `slash-kill` | crosshair + slash (mit `rotationRef`) |
| Bauer (p) | `pawn-pop` | crosshair + pop |
| Rest / Fallback | `kill-impact` | crosshair + explosion |

### RenderEvent-Struktur

```js
{
  id: '...',
  board: { size, squareSize, orientation },
  attacker: {
    piece: 'b',           // Figur des Angreifers (lowercase)
    color: 'w',
    from: { square: 'c1', x, y },
    to:   { square: 'h6', x, y }
  },
  victim: {
    piece: 'p',
    color: 'b',
    at: { square: 'h6', x, y }
  },
  move: { san, ply, isEnPassant },
  direction: {
    dx,          // Math.sign des Zugdelta
    dy,
    angleRad     // Math.atan2(to.y - from.y, to.x - from.x)
  }
}
```

`direction.angleRad` enthaelt den Winkel des Zuges in Bogenmas. Wird fuer `rotationRef: 'attacker.angle'` in Keyframes benutzt.

### Timeline-Keyframe-Format

```js
{
  t: 680,               // Zeitpunkt in ms
  ref: 'victim.at',     // Positionsreferenz: 'victim.at' | 'attacker.from' | 'attacker.to'
  scale: 1.4,
  alpha: 1,
  rotation: 0,          // optionaler Basis-Rotationsoffset in Rad
  rotationRef: 'attacker.angle',  // optional: addiert direction.angleRad zur Rotation
  dx: 0,                // optionaler Offset in Square-Einheiten (x)
  dy: 0                 // optionaler Offset in Square-Einheiten (y)
}
```

`rotationRef: 'attacker.angle'` macht eine Animation richtungsabhaengig. Der Laeufer-Slash dreht sich damit automatisch entlang der Diagonalen des Zuges.

### Neue Animation schreiben

1. `scripts/animations/myname.mjs` anlegen mit diesem Export:

```js
export const recipe = {
  name: 'myname',
  frameCount: 8,
  frameSize: 128,     // Canvas-Kachelgroesse in px
  drawSize: 84,       // Darstellungsgroesse im Spiel in px
  frameDurations: [40, 55, 30, 65, 85, 95, 110, 130],  // ms pro Frame
  frames: [frame0, frame1, ...]
};
```

2. Frame-Funktionen: `function frame0(ctx, cx, cy) { ... }`

   Wichtig: **Nur `var` verwenden**, kein `let`/`const`. Funktionen werden via `.toString()` serialisiert und in `page.evaluate()` injiziert.

3. `scripts/generate-spritesheet.mjs`: Recipe importieren und zu `RECIPES` hinzufuegen.

4. `src/default-animation-pack.js`: Spritesheet-Entry, Timeline und Regel ergaenzen.

5. Generator laufen lassen: `node scripts/generate-spritesheet.mjs`

### Glow-Technik (fuer professionelle Hit-Effekte)

Additive Farbmischung macht Animationen gluehend:

```js
ctx.save();
ctx.globalCompositeOperation = 'lighter';
// Alles hier addiert Licht statt zu uebermalen
ctx.restore();
```

Formel fuer Ring+Ray-Effekte (wie professionelle Hit-Packs):
1. Breiter niedriger Glow-Blob (Radial-Gradient, sehr niedrige Alpha)
2. Expandierender Ring-Strich
3. 4–8 lange radiale Rays
4. Kuerze Rays dazwischen
5. Heller weisser Mittelpunkt (kuerzester Frame = Impact)

### Verfuegbare Utility-Funktionen (in `shared.mjs`)

```js
rand(frame, i)                        // deterministischer Zufall [0,1), kein Math.random()
rg(ctx, cx, cy, r0, r1, stops)        // Radial-Gradient, gibt gradient zurueck
debris(ctx, cx, cy, frame, count, minDist, maxDist, colorFn, gravity?)
spark(ctx, cx, cy, angle, dist, len, color, lineWidth?)
sparks(ctx, cx, cy, frame, count, minDist, maxDist, color, lenMin, lenMax)
drawBrackets(ctx, cx, cy, dist, size, lineWidth, color)
```

`rand()` statt `Math.random()` benutzen, damit Frames deterministisch und reproduzierbar sind.

## Lichess-DOM-Wissen

Normale Partie/Analyse kann SAN-Zuege als `move san` oder `.analyse__moves san` enthalten.

Lichess TV verwendet aktuell andere custom Tags:

```txt
rm6 > l4x > kwdb
```

Puzzle-Seiten (`/training`):

```txt
main.puzzle move
```

Nach geloesten oder angezeigten Puzzle-Zuegen haengt Lichess Feedback-Zeichen direkt an den SAN-Text, zum Beispiel `Bxf7+✓` oder `Nd5#✓`. `MoveFeed` muss diese Marker entfernen, bevor `chess.js` die SAN verarbeitet.

Auf `/training` kann der Pfad gleich bleiben, waehrend ein neues Puzzle geladen wird. `MoveFeed` nutzt deshalb die sichtbare Puzzle-ID als Teil von `snapshot.id`, damit `CaptureEventStream` seine Dedupe-Daten pro Puzzle zuruecksetzt.

Unterstuetzte Selektoren:
- `move san`
- `.analyse__moves san`
- `.tview2 move san`
- `main.puzzle move`
- `rm6 l4x kwdb`
- `l4x kwdb`

Wichtig: SAN-Zuege duerfen nicht mit `Set` dedupliziert werden. Dieselbe SAN kann in einer Partie mehrfach legal vorkommen.

Wenn keine Zugliste gefunden wird, soll `readSnapshot()` `null` liefern und das Userscript still bleiben.

## Architektur

```
MoveFeed          → liest Lichess-Snapshot aus DOM
ChessState        → rekonstruiert Spielzustand (chess.js)
CaptureEventStream → dedupliziert CaptureEvents
RenderEvent       → mappt CaptureEvent auf Canvas-Koordinaten + direction.angleRad
CanvasSpriteRenderer → rendert deklarative Sprite-Timelines
```

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

## Tests

- `node:test` als Test Runner
- `jsdom` fuer DOM-nahe MoveFeed-Tests
- 45 Tests insgesamt

Abgedeckt:
- Routing aller Figuren zu korrekten Timelines
- `rotationRef` addiert `direction.angleRad` korrekt
- Keyframe-Interpolation incl. `dx`/`dy` Square-Offsets
- Frame-Sampling mit `frameDurations` und `frameDurationMs`
- `layerStart`-Korrektur (Frames zaehlen ab erstem Keyframe, nicht ab t=0)
- Regressionstests fuer Lichess TV, Puzzle-ID-Reset, Feedback-Marker, En Passant

## Scope

In Scope:
- normale Partien, Analyse-Hauptlinie, Lichess TV Hauptlinie
- Puzzle-Historie auf `/training`
- Standard-Schach
- robuste Capture-Erkennung, En Passant
- deduplizierte Animationen trotz mehrfacher DOM-Mutations
- figur-spezifische Animationen mit Richtungsrotation

Out of Scope:
- Animation Store / Pack-Verwaltung
- Browser Extension Packaging
- Studienvarianten, Puzzle-Varianten, Chess960
- eigene Schachregel-Implementierung

## Entwicklungsprinzipien

- DOM nicht als Wahrheit ueber Schachzustand behandeln.
- Schachregeln nicht selbst parsen, wenn `chess.js` verfuegbar ist.
- Animationen sollen Events konsumieren, nicht DOM-Zustand interpretieren.
- Board-Geometrie darf Lichess-DOM kennen, aber keine Schachlogik.
- Tests sollen Verhalten ueber oeffentliche Interfaces beschreiben.
- `lichess-kill-notifier.user.js` nach Aenderungen in `src/` immer neu bauen.
- Nach Aenderungen an `scripts/animations/*.mjs` immer `generate-spritesheet.mjs` laufen lassen.
- `var` statt `let`/`const` in Frame-Funktionen (Serialisierungs-Constraint).

## Debug-Hilfen

Temporare Browser-Inspektoren:

- `scripts/debug/inspect-lichess-tv.mjs`
- `scripts/debug/check-userscript-tv.mjs`

Diese Scripts brauchen einen echten Browser. Sie sind Diagnosewerkzeuge, nicht Teil des normalen Builds.
