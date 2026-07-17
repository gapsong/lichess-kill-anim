# Canvas Sprite Renderer Plan

## Ziel

Der naechste Renderer soll ausschliesslich ueber ein eigenes Canvas-Overlay arbeiten. Er manipuliert keine Lichess-Figuren, keine Lichess-Piece-DOM-Knoten und keinen Board-State. Lichess bleibt sichtbar; unsere Animationen werden darueber gemalt.

## Ausgangspunkt

Der aktuelle funktionierende Stand ist auf `main` committed:

```txt
aa5ed49 Baseline working userscript
```

Die Canvas-Arbeit passiert auf:

```txt
canvas-sprite-renderer
```

## Render-Prinzip

Es gibt genau ein Canvas-Element ueber dem aktuellen `cg-board`.

```html
<canvas id="lichess-kill-overlay"></canvas>
```

Das Canvas ist board-lokal:

- CSS-positioniert ueber dem Board
- gleiche sichtbare Breite/Hoehe wie das Board
- `pointer-events: none`
- Zeichnung in Board-lokalen CSS-Pixeln
- DPR-scharf ueber `devicePixelRatio`

Sizing:

- `ResizeObserver` beobachtet das Board
- `overlay.sync()` laeuft vor jedem `play()`
- Canvas backing resolution wird mit DPR skaliert

## Source of Truth

Schachlogik bleibt unveraendert:

```txt
MoveFeed -> ChessState/chess.js -> CaptureEvent -> RenderEvent -> CanvasSpriteRenderer
```

`chess.js` bleibt die Source of Truth fuer:

- `from`
- `to`
- `capturedAt`
- `movingPiece`
- `movingColor`
- `capturedPiece`
- `capturedColor`
- En Passant

Der Board-DOM wird nur fuer Geometrie gelesen.

## RenderEvent

Der Canvas-Renderer bekommt ein angereichertes Event. Koordinaten sind relativ zum Canvas/Board, nicht viewport-global.

```js
{
  id: 'snapshot|ply|san|from|to',
  board: {
    size: 752,
    squareSize: 94,
    orientation: 'white'
  },
  attacker: {
    piece: 'p',
    color: 'w',
    from: { square: 'e4', x: 423, y: 517 },
    to: { square: 'd5', x: 329, y: 423 }
  },
  victim: {
    piece: 'p',
    color: 'b',
    at: { square: 'd5', x: 329, y: 423 }
  },
  move: {
    san: 'exd5',
    ply: 3,
    isEnPassant: false
  },
  direction: {
    dx: -1,
    dy: -1,
    angleRad: -2.356
  }
}
```

Bei En Passant:

- `attacker.to.square` ist das Zielfeld
- `victim.at.square` ist `capturedAt`, also das Feld der geschlagenen Figur

## Animation Pack Format

Animation Packs sollen deklarativ sein. Packs duerfen kein eigenes JavaScript ausfuehren.

Grundform:

```js
{
  id: 'debug-default-pack',
  version: 1,
  spritesheets: {
    debug: {
      image: 'data:image/png;base64,...',
      frameWidth: 128,
      frameHeight: 128,
      frames: 6
    }
  },
  rules: [
    {
      when: { attacker: { piece: '*' } },
      timeline: 'default-capture'
    }
  ],
  timelines: {
    'default-capture': {
      maxDurationMs: 1000,
      layers: []
    }
  }
}
```

Packs werden spaeter als JSON + Spritesheets gedacht. Fuer Tampermonkey kann das erste Pack als eingebettetes Base64-PNG im Bundle liegen.

## Rule Engine

Rules sind bewusst erweiterbar.

```js
{
  when: {
    attacker: { piece: 'p', color: 'w' },
    victim: { piece: 'q', color: 'b' },
    board: { orientation: 'black' },
    move: { isEnPassant: false }
  },
  timeline: 'white-pawn-kills-queen'
}
```

Regeln:

- fehlendes Feld bedeutet egal
- `'*'` bedeutet wildcard
- Regeln werden von oben nach unten geprueft
- erste passende Regel gewinnt
- Pack braucht eine Fallback-Regel

Erste Version:

```js
rules: [
  { when: { attacker: { piece: '*' } }, timeline: 'default-capture' }
]
```

## Timeline Modell

Es gibt ein Canvas im DOM, aber mehrere deklarative Timeline-Layer innerhalb des Canvas.

Jeder Layer beschreibt ein sichtbares Sprite:

```js
{
  id: 'attacker',
  sheet: 'debug',
  frame: 0,
  keyframes: [
    { t: 0, ref: 'attacker.from', dx: 0, dy: 0, scale: 0.8, alpha: 1 },
    { t: 250, ref: 'attacker.to', dx: 0, dy: 0, scale: 1.1, alpha: 0 }
  ]
}
```

Keyframes arbeiten mit Referenzen und Offsets:

- `ref`: `attacker.from`, `attacker.to`, `victim.at`
- `dx`/`dy`: Square-Units, nicht Pixel
- `scale`
- `alpha`
- `rotation`

Berechnung:

```txt
x = ref.x + dx * board.squareSize
y = ref.y + dy * board.squareSize
```

Interpolation:

- linear fuer `x`, `y`, `scale`, `alpha`, `rotation`
- vor erstem Keyframe nicht zeichnen
- nach letztem Keyframe nicht zeichnen

## Default Debug Spritesheet

Die erste Version nutzt ein echtes eingebettetes PNG-Spritesheet, aber nur als generisches Debug-Sheet.

Frames:

```txt
0 attacker
1 victim
2 slash A
3 slash B
4 break A
5 break B
```

Alle Figuren nutzen zunaechst dieselbe Default-Timeline. Piece-spezifische Animationen kommen spaeter als Content-Erweiterung.

## Default Timeline

Die erste sichtbare Animation:

```txt
0-250ms:
  attacker sprite fliegt von attacker.from zu attacker.to

180-420ms:
  slash sprite erscheint auf victim.at, rotiert leicht, faded out

260-700ms:
  victim-break sprite auf victim.at, skaliert hoch, faded out
```

Deklarativ:

```js
layers: [
  {
    id: 'attacker',
    sheet: 'debug',
    frame: 0,
    keyframes: [
      { t: 0, ref: 'attacker.from', scale: 0.8, alpha: 1 },
      { t: 250, ref: 'attacker.to', scale: 1.1, alpha: 0 }
    ]
  },
  {
    id: 'slash',
    sheet: 'debug',
    frame: 2,
    keyframes: [
      { t: 180, ref: 'victim.at', rotation: -0.5, scale: 0.6, alpha: 0 },
      { t: 260, ref: 'victim.at', rotation: 0.3, scale: 1.4, alpha: 1 },
      { t: 420, ref: 'victim.at', rotation: 0.8, scale: 1.8, alpha: 0 }
    ]
  },
  {
    id: 'victim-break',
    sheet: 'debug',
    frame: 4,
    keyframes: [
      { t: 260, ref: 'victim.at', scale: 0.7, alpha: 0 },
      { t: 450, ref: 'victim.at', scale: 1.2, alpha: 1 },
      { t: 700, ref: 'victim.at', scale: 1.6, alpha: 0 }
    ]
  }
]
```

## Parallelitaet

Mehrere Captures duerfen parallel laufen.

Renderer-Modell:

```txt
activeAnimations = [
  { startedAt, durationMs, timeline, renderEvent },
  ...
]
```

Frame loop:

```txt
requestAnimationFrame
  clear canvas
  draw all active animations
  remove finished
  stop loop when none active
```

Es gibt einen Max-Dauer-Schutz, zunaechst:

```txt
maxDurationMs: 3000
```

Ein kaputtes Pack darf nicht endlos rendern.

## Nicht-Ziele der ersten Canvas-Version

- keine Lichess-Piece-DOM-Manipulation
- kein Verstecken echter Figuren
- keine pro-Figur echten Art Assets
- keine Store-Installation
- kein fremdes JavaScript in Packs
- keine Partikel-Engine, ausser wenn spaeter als eigener deklarativer Layer definiert

## Implementierungsreihenfolge

1. `RenderEvent` aus `CaptureEvent` + `BoardGeometry` ableiten und testen.
2. Board-lokales `CanvasOverlay` bauen und testen.
3. Pack-Schema als Default-Pack definieren.
4. Spritesheet-Lader fuer eingebettete Base64-PNGs bauen.
5. Keyframe-Interpolation testen.
6. `CanvasSpriteRenderer` mit parallelen Timelines bauen.
7. `userscript-entry` von DOM/CSS-Animationen auf Canvas-Renderer umstellen.
8. `npm test`, `npm run build`, Browser-Check auf TV/Puzzle/Analyse.
