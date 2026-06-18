# Canvas Sprite Renderer Test Plan

## TDD-Regel

Diese Datei ist ein Test-Inventar, keine Aufforderung alle Tests auf einmal zu schreiben.

Ausfuehrbare Tests werden vertikal erzeugt:

```txt
1 Verhalten aus dieser Liste auswaehlen
RED-Test schreiben
minimal GREEN implementieren
refactoren
naechstes Verhalten
```

So bleibt die Testsuite nah an echter Implementierung und friert keine falschen Interfaces zu frueh ein.

## Public Interfaces

Die Tests sollen sich an diesen oeffentlichen Interfaces orientieren:

```js
createRenderEvent(captureEvent, boardGeometry, snapshotId)
```

Erzeugt ein board-lokales RenderEvent fuer den Canvas-Renderer.

```js
selectTimeline(pack, renderEvent)
```

Waehlt anhand deklarativer Rules eine Timeline aus.

```js
sampleLayer(layer, renderEvent, elapsedMs)
```

Interpoliert den sichtbaren Zustand eines Timeline-Layers zu einem Zeitpunkt.

```js
CanvasOverlay.attach(document)
CanvasOverlay.sync()
```

Erzeugt und synchronisiert das board-lokale Canvas.

```js
CanvasSpriteRenderer.play(renderEvent)
CanvasSpriteRenderer.tick(nowMs)
```

Startet und zeichnet aktive Animationen.

Die Namen sind vorlaeufig. Beim ersten RED-Test duerfen sie angepasst werden, wenn die Implementierung ein klareres Interface zeigt.

## Slice 1: RenderEvent

### Test 1.1: CaptureEvent wird zu board-lokalem RenderEvent

Verhalten:

Aus einem CaptureEvent mit `from: e4`, `to: d5`, `capturedAt: d5` und einem 800px-Board entsteht ein RenderEvent mit:

- `attacker.from.square: e4`
- `attacker.to.square: d5`
- `victim.at.square: d5`
- `board.squareSize: 100`
- `x/y` relativ zum Board, nicht viewport-global
- `direction` aus `from -> to`

Warum zuerst:

Das ist der kleinste vertikale Uebergang von existierender Capture-Logik in die Canvas-Welt.

### Test 1.2: En Passant trennt attacker.to und victim.at

Verhalten:

Bei En Passant zeigt `attacker.to` auf das Zielfeld und `victim.at` auf `capturedAt`.

Risiko:

Canvas-Animationen wuerden sonst auf dem falschen Feld zerfallen.

### Test 1.3: Black orientation bleibt korrekt

Verhalten:

RenderEvent-Koordinaten nutzen dieselbe BoardGeometry wie der alte Renderer und sind bei `orientation-black` gespiegelt.

## Slice 2: CanvasOverlay

### Test 2.1: Overlay erzeugt genau ein Canvas

Verhalten:

Wenn `attach()` mehrfach aufgerufen wird, existiert nur ein `#lichess-kill-overlay`.

### Test 2.2: Canvas ist board-lokal positioniert

Verhalten:

Bei einem BoardRect `left=10`, `top=20`, `width=800` bekommt das Canvas:

- CSS left/top passend zum Board
- CSS width/height `800px`
- `pointer-events: none`

### Test 2.3: DPR scaling ist korrekt

Verhalten:

Bei `devicePixelRatio = 2` und 800px Board hat das Canvas backing size `1600 x 1600`, waehrend Zeichnen weiter in CSS-Pixeln passiert.

### Test 2.4: Fehlendes Board erzeugt keinen Crash

Verhalten:

Wenn kein `cg-board` existiert, bleibt `sync()` harmlos und `play()` rendert nichts.

## Slice 3: Pack Rules

### Test 3.1: Erste passende Rule gewinnt

Verhalten:

Bei Rules:

```js
[
  { when: { attacker: { piece: 'p' } }, timeline: 'pawn' },
  { when: { attacker: { piece: '*' } }, timeline: 'fallback' }
]
```

waehlt ein Pawn-Capture `pawn`.

### Test 3.2: Fallback Rule faengt unbekannte Pieces

Verhalten:

Wenn keine spezifische Rule passt, wird die Wildcard-Rule genutzt.

### Test 3.3: Verschachtelte Bedingungen sind erweiterbar

Verhalten:

Eine Rule mit `attacker`, `victim`, `board`, `move` matched nur, wenn alle gesetzten Felder passen. Fehlende Felder bedeuten egal.

### Test 3.4: Kein Match ist ein valider Fehler

Verhalten:

Wenn ein Pack keine passende Rule hat, gibt `selectTimeline` ein klares Ergebnis zurueck, z.B. `null`, statt zu crashen.

## Slice 4: Timeline Sampling

### Test 4.1: Keyframes interpolieren Position in Square-Units

Verhalten:

Ein Layer mit Keyframes von `attacker.from` zu `attacker.to` liefert bei halber Zeit die Mitte zwischen beiden Punkten.

### Test 4.2: dx/dy werden mit squareSize skaliert

Verhalten:

`dx: 0.5` verschiebt um ein halbes Feld, nicht um 0.5 Pixel.

### Test 4.3: Alpha, Scale und Rotation interpolieren linear

Verhalten:

Zwischen `scale: 1` und `scale: 2` ist bei halber Zeit `scale: 1.5`.

### Test 4.4: Vor erstem und nach letztem Keyframe wird nicht gezeichnet

Verhalten:

`sampleLayer()` liefert `null`, wenn der Layer zu diesem Zeitpunkt unsichtbar ist.

### Test 4.5: Fehlende optionale Werte haben Defaults

Verhalten:

Ohne `alpha`, `scale`, `rotation`, `dx`, `dy` entstehen sinnvolle Defaults:

- `alpha: 1`
- `scale: 1`
- `rotation: 0`
- `dx/dy: 0`

## Slice 5: Spritesheet Loading

### Test 5.1: Eingebettetes Base64-Spritesheet wird geladen

Verhalten:

Ein Pack mit `data:image/png;base64,...` erzeugt ein nutzbares Image/Bitmap fuer den Renderer.

### Test 5.2: FrameRect wird aus frameWidth/frameHeight berechnet

Verhalten:

Frame `4` in einem horizontalen Sheet mit `frameWidth=128` startet bei `sx=512`.

### Test 5.3: Ungueltige Sheet-Definition liefert klaren Fehler

Verhalten:

Fehlende `image`, `frameWidth` oder `frameHeight` fuehren zu einem validierbaren Pack-Fehler.

## Slice 6: CanvasSpriteRenderer

### Test 6.1: play() startet eine aktive Animation

Verhalten:

Nach `play(renderEvent)` enthaelt der Renderer eine aktive Timeline und der Frame Loop ist aktiv.

### Test 6.2: tick() zeichnet alle sichtbaren Layer

Verhalten:

Zu einem Zeitpunkt, an dem drei Layer sichtbar sind, ruft der Renderer drei Draw-Operationen auf.

### Test 6.3: Fertige Animationen werden entfernt

Verhalten:

Nach Ablauf der Timeline-Dauer bleibt keine aktive Animation uebrig.

### Test 6.4: Mehrere Captures laufen parallel

Verhalten:

Zwei `play()`-Aufrufe erzeugen zwei aktive Animationen, die im selben `tick()` gezeichnet werden.

### Test 6.5: Max-Dauer-Schutz begrenzt kaputte Packs

Verhalten:

Eine Timeline mit extrem spaetem Keyframe wird bei `3000ms` begrenzt.

## Slice 7: Userscript Integration

### Test 7.1: CaptureEvent startet Canvas-Renderer statt CSS-DOM-Animation

Verhalten:

`userscript-entry` ruft bei neuem Capture `renderer.play(renderEvent)` auf und erzeugt keine alten `.ka`-Elemente mehr.

### Test 7.2: MutationObserver-Dedupe bleibt erhalten

Verhalten:

Mehrere DOM-Mutations mit gleichem Snapshot erzeugen nur einen `play()`-Aufruf.

### Test 7.3: Kein Board bedeutet kein Crash

Verhalten:

Wenn MoveFeed ein Capture findet, aber `cg-board` fehlt, wird nicht gerendert und das Userscript bleibt stabil.

### Test 7.4: Build erzeugt weiterhin ein installierbares Userscript

Verhalten:

`npm run build` erzeugt `lichess-kill-notifier.user.js` mit Userscript-Header und ohne ESM-Imports.

## Browser Checks

Diese Checks bleiben nicht alle zwingend als Unit-Test erhalten, sollten aber vor Abschluss der Canvas-Version manuell oder per Playwright laufen:

- Lichess TV: Capture erzeugt Canvas-Animation.
- Puzzle: geloeste Moves mit `✓` blockieren keine spaeteren Animationen.
- Analyse/Hauptlinie: normaler Capture erzeugt Canvas-Animation.
- Board Flip: Animation liegt auf dem richtigen Square.
- Resize: Canvas bleibt ueber dem Board.

## Erste RED-Empfehlung

Der erste ausfuehrbare Test sollte Slice 1.1 sein:

```txt
CaptureEvent wird zu board-lokalem RenderEvent
```

Er beweist den neuen Datenvertrag, ohne schon Canvas, Spritesheets oder Pack-Loading bauen zu muessen.
