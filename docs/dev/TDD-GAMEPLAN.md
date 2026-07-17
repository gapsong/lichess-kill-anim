# Lichess Kill Animations TDD Gameplan

## Ziel

Das Userscript soll Captures auf lichess.org robust erkennen und Animationen ueber einem eigenen Overlay rendern. Lichess bleibt Plattform und Datenquelle, aber der sichtbare Board-DOM ist nicht mehr die Single Source of Truth fuer Schachlogik.

Die Single Source of Truth fuer den Spielzustand wird ein eigener Chess-State im Script:

```txt
Lichess DOM -> MoveFeed -> ChessState -> CaptureEvent -> OverlayRenderer
```

Der DOM wird nur noch fuer diese Aufgaben benutzt:

- Move-Liste und Startposition lesen
- Board-Geometrie messen
- Overlay in die Seite einhaengen

Der DOM wird nicht mehr benutzt, um verschwundene Figuren oder `.last-move` als Schachwahrheit zu interpretieren.

## Zielarchitektur

### MoveFeed

Liest aus Lichess die beobachtbaren Spielinformationen:

- aktuelle SAN-Zugliste der Hauptlinie
- optionale Start-FEN, wenn vorhanden
- Kontextwechsel, zum Beispiel neues Spiel oder neue Analyseposition

Public Interface, vorlaeufig:

```js
readSnapshot(): {
  id: string,
  initialFen: string | null,
  sanMoves: string[]
}
```

### ChessState

Rekonstruiert die Partie aus Startposition und SAN-Zuegen. Diese Schicht soll spaeter `chess.js` verwenden, statt SAN und Schachregeln selbst zu implementieren.

Public Interface, vorlaeufig:

```js
deriveEvents(snapshot): CaptureEvent[]
```

CaptureEvent:

```js
{
  kind: 'capture',
  ply: number,
  san: string,
  from: 'e4',
  to: 'd5',
  movingPiece: 'p',
  movingColor: 'w',
  capturedPiece: 'p',
  capturedColor: 'b',
  isEnPassant: boolean
}
```

### BoardGeometry

Rechnet Schachfelder in Pixel-Koordinaten um. Diese Schicht darf `cg-board` und Orientierung lesen, aber keine Schachregeln kennen.

Public Interface, vorlaeufig:

```js
squareCenter(square): { x: number, y: number, size: number } | null
```

### OverlayRenderer

Besitzt das Animations-Overlay und rendert Animationen anhand von Events und Board-Geometrie. Diese Schicht kennt keine Move-Liste.

Public Interface, vorlaeufig:

```js
renderCapture(event): void
```

### AnimationPack

Definiert spaeter installierbare Animationen. Fuer den ersten Refactor bleibt das intern, aber die Grenze wird vorbereitet.

```js
{
  id: 'default-bomb',
  pieces: {
    p: animation,
    n: animation,
    b: animation,
    r: animation,
    q: animation,
    k: animation,
    '*': animation
  }
}
```

## Teststrategie

Tests sollen Verhalten ueber oeffentliche Interfaces pruefen, nicht interne Hilfsfunktionen.

Empfohlener Test-Stack fuer den Refactor:

- `node:test` als Test Runner
- `assert/strict` fuer Assertions
- `jsdom` nur fuer DOM-nahe Tests
- `chess.js` fuer Schachregeln

Fuer den ersten Umbau wird die Logik aus dem Userscript in testbare Module extrahiert. Das Userscript wird danach nur noch Einstiegspunkt und Glue-Code.

## TDD-Slices

### Slice 1: Capture aus normaler SAN-Hauptlinie erkennen

Verhalten:

Wenn ein Snapshot eine Standardpartie mit den Zuegen `e4`, `d5`, `exd5` enthaelt, erzeugt `deriveEvents` genau ein CaptureEvent:

- `from: e4`
- `to: d5`
- `movingPiece: p`
- `capturedPiece: p`
- `isEnPassant: false`

Warum zuerst:

Das ist der kleinste vertikale Beweis, dass Move-Liste -> eigener Chess-State -> CaptureEvent funktioniert.

### Slice 2: Nur neue Events rendern

Verhalten:

Wenn derselbe Snapshot mehrfach beobachtet wird, wird dieselbe Capture-Animation nicht mehrfach gerendert.

Warum:

Der aktuelle MutationObserver kann sehr oft feuern. Idempotenz ist wichtiger als Animationseffekt.

### Slice 3: Rook-Richtung aus echtem Move statt `.last-move`

Verhalten:

Bei `Rxe5` enthaelt das CaptureEvent `from` und `to`, sodass die Turm-Animation ihre Richtung aus dem echten Zug berechnet.

Warum:

Das ersetzt den aktuellen fragilen DOM-Abgriff von `square.last-move`.

### Slice 4: BoardGeometry funktioniert fuer White- und Black-Orientation

Verhalten:

Bei einem 800px-Board liegt `a8` aus White-Sicht links oben und aus Black-Sicht rechts unten. `e4` wird konsistent ins richtige Feldzentrum umgerechnet.

Warum:

Rendering darf DOM-Geometrie lesen, aber diese Verantwortung muss isoliert testbar sein.

### Slice 5: En Passant erzeugt Capture auf dem geschlagenen Bauernfeld

Verhalten:

Bei En Passant wird `isEnPassant: true` gesetzt und das Event enthaelt sowohl `to` als auch das Feld der entfernten Figur.

Offene Designentscheidung:

Das Event braucht vermutlich zusaetzlich `capturedAt`, weil bei En Passant `to` nicht das Feld der geschlagenen Figur ist.

Empfohlene Event-Erweiterung:

```js
capturedAt: 'd5'
```

### Slice 6: Neues Spiel setzt State zurueck

Verhalten:

Wenn `snapshot.id` oder `initialFen` wechselt, werden alte Ply-Marker verworfen und neue Captures koennen wieder gerendert werden.

Warum:

Sonst entstehen Bugs beim Wechsel zwischen Partie, Analyse und neuer Partie.

### Slice 7: Nicht-Captures erzeugen keine Animation

Verhalten:

Normale Zuege, Rochade, Schach und Matt ohne Capture erzeugen kein CaptureEvent.

Warum:

Das schuetzt gegen false positives aus SAN-Syntax wie `+`, `#`, `O-O`.

## Reihenfolge der Umsetzung

1. Test-Setup einfuehren: `package.json`, Test Runner, minimale Modulstruktur.
2. `ChessState` als erstes tiefes Modul bauen.
3. Bestehende SAN-Parsing-Logik durch `chess.js` ersetzen.
4. Event-Deduplizierung einfuehren.
5. `BoardGeometry` aus `ANIMATIONS._sqCenter` extrahieren.
6. Overlay/AnimationEngine vom Capture-Detection-Code trennen.
7. Das bestehende Userscript als Shell behalten und intern auf die neuen Module verdrahten.
8. Danach erst AnimationPacks und Store-Installationsmodell entwerfen.

## Nicht-Ziele fuer den ersten Refactor

- kein Animation-Store
- keine Puzzle-/Studien-/Varianten-Unterstuetzung
- kein Chess960
- keine Browser-Extension-Struktur
- keine perfekte Lichess-Abdeckung aller Seiten

## Akzeptanzkriterien fuer den ersten Refactor

- Captures werden aus eigenem Chess-State erkannt, nicht aus verschwundenen DOM-Figuren.
- Turm-Richtung kommt aus `from -> to`, nicht aus `.last-move`.
- Board-Geometrie ist separat getestet.
- MutationObserver kann mehrfach feuern, ohne doppelte Animationen fuer denselben Ply zu erzeugen.
- Das Userscript bleibt installierbar.
- Die alte visuelle Animation bleibt mindestens funktional gleichwertig.
