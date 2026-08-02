# Lichess Kill Animations

> ⚠️ **BEFORE PUBLIC RELEASE — fair-play gate (TODO, NOT yet implemented).**
> The tactical **pattern hints** (pins, forks, hanging pieces, hotspots, "material under
> pressure", batteries, etc.) count as **outside assistance** during live play. chess.com's
> Fair Play policy (strictly enforced) and Lichess's fair-play rules both prohibit that in
> **ranked / rated live games**. The **kill animations are cosmetic and always fine.**
>
> **Plan (do before shipping publicly / to chess.com):** gate the pattern hints so they run
> only on **analysis boards, puzzles and game review**, and are **OFF in ranked/live games**.
> Add a visible user note that the hints are a study aid, off during ranked play.
>
> **For now (dev phase): intentionally kept ON everywhere** — a known, deliberate temporary
> state. Remove it before release. Wiring point + TODO: `src/runtime.js` (`renderPatterns`).

## Projektzweck

Dieses Repo enthaelt ein Lichess-Userscript, das Capture-Zuege mit Kill-Animationen visualisiert. Das aktuelle Installationsziel ist Tampermonkey auf `https://lichess.org/*`.

Langfristig soll daraus ein System entstehen, in dem Nutzer Animation Packs installieren koennen. Der Store ist aber nachgelagert: Zuerst muss der Core robust Captures erkennen und Animationen sauber rendern.

## Aktueller Stand

Der lesbare Quellcode liegt in `src/`. Die installierbare Tampermonkey-Datei ist:

- `lichess-kill-notifier.user.js`

Diese Datei wird generiert. Nicht direkt darin refactoren. Normale Aenderungen gehen in `src/`, danach:

```bash
npm test && npm run build && node --check lichess-kill-notifier.user.js
```

Der aktuelle Stand ist ein gebundeltes Ein-Datei-Userscript: `chess.js` wird per `esbuild` eingebettet, damit Tampermonkey keine externe Runtime-Abhaengigkeit braucht.

## One-Click Install ueber public Gist

Das Repo ist privat, daher hat Tampermonkey keine oeffentliche `.user.js`-URL im Repo selbst zum Fetchen. Deshalb wird der gebaute Userscript-Output zusaetzlich als PUBLIC GitHub Gist gehostet:

- Gist: https://gist.github.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4
- Install-URL (hashlose "latest" Raw-URL, liefert immer die neueste Revision):
  `https://gist.githubusercontent.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4/raw/lichess-kill-notifier.user.js`

Der Banner in `scripts/build-userscript.mjs` setzt `@downloadURL` und `@updateURL` auf genau diese Install-URL. Tampermonkey vergleicht periodisch das `@version`-Feld gegen die Gist-Version und laedt bei Aenderung automatisch neu. Der Gist enthaelt ausschliesslich die gebaute `.user.js`-Datei, niemals den Quellcode oder Secrets.

**Release-Ablauf fuer eine neue Version:**

1. Aenderungen in `src/` machen, `@version` in `scripts/build-userscript.mjs` erhoehen (SemVer).
2. `npm test && npm run build && node --check lichess-kill-notifier.user.js`
3. Gist aktualisieren: `gh gist edit 8b78fdf058b436e5b439b86ef2a816b4 lichess-kill-notifier.user.js`
4. `lichess-kill-notifier.user.js` und die `src/`-Aenderungen zusammen committen: gebautes Artefakt und Quelle duerfen nie auseinanderlaufen.

Ohne Schritt 1 (Version-Bump) erkennt Tampermonkey kein Update, selbst wenn der Gist-Inhalt sich geaendert hat.

## GitHub Pages = Live-Gallery (`docs/`)

Die oeffentliche Pages-Site (`/docs` auf `main`) ist die GEBAUTE Gallery — Live-Canvas-
Animationen in voller Qualitaet plus Install-Sektion, kein separates Landing-Page-Artefakt.
`docs/index.html` + `docs/gallery.js` + `docs/webp/` sind Build-Output; nicht von Hand
editieren, sondern Aenderungen in `gallery/` machen und neu deployen. Die Animations-Tiles
sind vorgebackene animierte WebP (kein Live-Canvas — Performance-Entscheidung, der Captain
fand das Live-Rendering zu langsam); nach Effekt-/Beispiel-Aenderungen erst
`node scripts/debug/bake-gallery-webp/bake.mjs` laufen lassen, dann:

```bash
npm run build:pages   # build:gallery + kopiert dist/gallery/* -> docs/
```

**WICHTIG — WebP-Tiles muessen All-Keyframe sein:** WebKit/iOS Safari rendert animierte
WebP mit Delta-Frames (Subrechtecke, der Encoder-Default) falsch — auf dem iPhone
erscheinen die Tiles gezoomt/verschoben mit Geister-Resten (Blink/Chromium rendert
dieselben Dateien korrekt, deshalb faellt es am Desktop nicht auf). Deshalb encodiert
`bake.mjs` via `img2webp -kmax 1` (Paket `webp`, nicht mehr ffmpeg): jeder Frame ist ein
volles Canvas-Keyframe. Kostet ~2x Dateigroesse; kompensiert durch halbierte Output-fps
per Frame-Decimation (`PACK_KEEP_EVERY` in `bake.mjs` — die Engine muss weiter mit 24fps
steppen, weil der Partikel-Ausklang pro Tick statt pro Zeit ablaeuft). Nie auf einen
Delta-Frame-Encoder zurueckwechseln, sonst reisst der iPhone-Bug wieder auf.

Der Install-Link in der Gallery zeigt auf die kanonische Gist-Raw-URL oben — NICHT auf die
Repo-Raw-URL, denn nur der Gist traegt den `@downloadURL`/`@updateURL`-Banner-Vertrag fuer
Auto-Updates. `docs/` wird von Pages KOMPLETT oeffentlich serviert — interne Prozess-Docs
(Gameplans, TDD-Plaene, superpowers-Specs) haben dort nichts verloren; der fruehere
`docs/dev/`-Baum wurde deshalb entfernt (Historie behaelt ihn).

## Wichtige Module

### Core-Pipeline

- `src/chess-state.js`: erzeugt CaptureEvents aus Start-FEN und SAN-Zugliste via `chess.js`
- `src/move-feed.js`: liest Lichess-Zuglisten aus dem DOM
- `src/board-geometry.js`: rechnet Squares in Pixelkoordinaten um
- `src/event-stream.js`: dedupliziert Events ueber MutationObserver-Scans. **Silent-Baseline beim Kontext-Eintritt:** Der erste Scan eines neuen Kontexts (`snapshot.id` gewechselt, `primed`-Flag zurueckgesetzt) darf keine Animation feuern — sonst spielen beim Betreten einer laufenden Partie (TV, Refresh, Analyse mit vorhandenen Zuegen) *alle* bereits gespielten Captures auf einmal ab. Deshalb seedet der erste Scan alle bereits auf dem Brett liegenden Captures still in `seen` (Limit `activePly ?? Infinity`, damit auf dem Analyse-Brett nur bis zum betrachteten Ply gebaselinet wird und Vorwaertsblaettern auf einen spaeteren Capture weiterhin feuert) und liefert `[]`. Erst Captures, die in einem *spaeteren* Scan neu auftauchen, feuern.
- `src/render-event.js`: reichert CaptureEvents mit board-lokalen Canvas-Koordinaten an
- `src/canvas-overlay.js`: verwaltet ein board-lokales Canvas ueber `cg-board`
- `src/particle-fx-renderer.js`: Live-Partikel-Engine; zeichnet alle Effekte direkt per Canvas-API (kein Spritesheet); unterstuetzt `buildupMs`-Crosshair vor Impact
- `src/board-shake.js`: abklingender Screen-Shake auf `cg-board` (Vlambeer-Style), getriggert via `onImpact`
- `src/userscript-entry.js`: Tampermonkey-Einstieg, Toasts und Canvas-Renderer
- `src/patterns.js`: erkennt statische Formationen (`detectPatterns(board)` → battery/rooks/pin/skewer/fianchetto/outpost/passed-pawn)
- `src/pattern-overlay.js`: persistente zweite Canvas-Schicht, zeichnet erkannte Muster (Linie + Glow + Label); Toggle `patternsOn`; trackt pro Pattern (`type|side|squares`) den ersten Sichtungs-Zeitpunkt fuer die Intro/Faint-Lifecycle (`fadeFor`)
- `src/chess-state.js`: zusätzlich `derivePosition(snapshot)` → Brett an `snapshot.activePly` (auf dem Analyse-Brett der gerade betrachtete Zug, nicht zwingend das Zugende) via `chess.board()`, fuer die Muster-Erkennung

**Wichtig — `activePly` durchgaengig respektieren:** Auf dem Analyse-Brett sind alle Zuege bereits im DOM; `snapshot.activePly` (aus `move.active`) ist der Ply, den der Nutzer gerade ansieht, und kann kleiner sein als `sanMoves.length`. `CaptureEventStream` beruecksichtigt das schon lange. `derivePosition` und `patternSig` (in `src/runtime.js`) muessen das ebenfalls tun — sonst bleiben Pattern-Hints (z. B. eine 4-Felder-Festung) beim Zurueckblaettern auf dem Brett haengen, weil `snapshot.id`/`sanMoves.length` gleich bleiben und die Neuberechnung uebersprungen wird, obwohl die angezeigte Position eine andere ist. Neue Stellen, die Muster oder Captures aus einem `snapshot` ableiten, muessen `activePly` respektieren, sonst reisst dieselbe Bug-Klasse wieder auf.

**Wichtig — Pattern-Hints nur wenn materiell nuetzlich (SEE):** Taktische Hints in `src/patterns.js` sollen nur feuern, wenn sie wirklich etwas gewinnen, nicht bei jeder geometrischen Konstellation. Dafuer gibt es eine wiederverwendbare SEE-Maschinerie (`staticExchange`/`seeGain`, gespeist aus `attackersOf`): der `hotspot` (Brennpunkt) feuert nur bei SEE > 0, und der `skewer` (Spieß) ist ebenso gegated — er feuert nur, wenn die hintere Figur mindestens eine Leichtfigur ist (`VALUE[back] >= 3`, Konstante `SKEWER_MIN_BACK`) UND die SEE auf dem hinteren Feld — nach Entfernen der vorderen Figur aus der `at`-Kopie, damit der Slider durchsieht — fuer die angreifende Seite > 0 ist. Ein Spieß ueber einen (verteidigten) Bauern oder ueber eine verteidigte Figur, bei der der Rueckschlag Material verliert, wird nicht mehr angezeigt. Der `pin`-Zweig (`v2 > v1`) bleibt rein geometrisch. Neue taktische Hints diese SEE-Hebel weiterverwenden statt eigene Heuristiken zu erfinden.

### Build-Scripts

- `scripts/build-userscript.mjs`: baut die installierbare Datei via esbuild

### Extension + Gallery (Pack-System)

- `src/packs.js`: Registry aller wählbaren Animationen (signature/single/theme); `resolvePack(id)` → `{mode,routing,fallback}`
- `gallery/`: statische Galerie-Website; Tiles sind vorgebackene animierte WebP (`gallery/webp/`, erzeugt via `scripts/debug/bake-gallery-webp/bake.mjs` aus der echten Engine — kein Live-Rendering im Browser); Build `npm run build:gallery` → `dist/gallery/`
- `src/background-entry.js` + `src/background-message.js`: MV3-Service-Worker; empfängt die Pack-Auswahl der Galerie via `externally_connectable` und schreibt `chrome.storage`

## Animation-System

### Partikel-Engine (`ParticleFxRenderer`)

Konfiguration lebt zentral in `src/settings.js` (`DEFAULT_SETTINGS`); beide Einstiege (`userscript-entry.js`, `extension-entry.js`) starten die Runtime damit:

```js
DEFAULT_SETTINGS = {
  enabled: true,
  packId: 'signature',   // gewaehlte Animation (Registry: src/packs.js)
  intensity: 7,          // 1..10
  soundOn: true,         // WebAudio-Synth-SFX
  buildupMs: 0,          // Targeting-Buildup vor Impact (0 = sofort)
  shakePieces: ['q']     // Board-Shake nur bei diesen Angreifer-Figuren
};
```

Oeffentliches API von `ParticleFxRenderer`:

```js
const r = new ParticleFxRenderer({ mode, intensity, soundOn, buildupMs, routing, fallback, onImpact });
r.play(renderEvent, nowMs?);  // Effekt starten (gibt false zurueck wenn kein victim.at)
r.tick(nowMs, ctx, size);     // Partikel weiterrechnen + zeichnen (board-lokale px)
r.activeCount;                // > 0 => rAF-Loop weiter laufen lassen
r.onImpact;                   // Callback(renderEvent, { amplitude, durationMs })
```

### Figur-zu-Effekt-Routing (SIG)

| Figur des Angreifers | Effekt-ID |
|----------------------|-----------|
| Dame (q) | `nuke` |
| Turm (r) | `smash` |
| Springer (n) | `slash` |
| Laeufer (b) | `zap` |
| Bauer (p) | `pixel` |
| Koenig (k) als Opfer | `ascension` |
| Fallback | `splatter` |

Zusaetzliche Effekte im Pool (erreichbar ueber `mode: 'random'` oder fixe id): `inferno`, `vortex`, `shatter`.

### Material-Skalierung nach geschlagener Figur (`victimDrama`)

Unabhaengig vom Angreifer-Routing (SIG-Tabelle oben) skaliert `ParticleFxRenderer.victimDrama(victim.type)` jeden Effekt zusaetzlich nach dem Materialwert der GESCHLAGENEN Figur: Bauer/Minorfigur bleiben nahe Baseline, ein Turm ist spuerbar groesser, eine Dame ist der Hoehepunkt (bis 1.6x). Der Faktor fliesst in `spawn()` in die Partikelanzahl (`cs`, volle Staerke) und in eine gedaempfte `sizeBoost`-Variante von `S` (Glyph/Flash/Ring/Beam-Groessen, halbe Staerke), sowie in `fireImpact()` in Shake-Amplitude und -Dauer. Koenig bleibt bei Baseline (kein echter Capture, `ascension` ist ohnehin schon das dramatischste Preset). Neue Effekte sollten diesen Hebel weiterverwenden statt eine eigene Skalierung zu erfinden.

### Visuelle Zentrierung der Effekte (Centroid-Invariante, seit v4.4.1)

**Die Anker-Geometrie ist korrekt und mehrfach vermessen — bei "Animation sitzt zu hoch/
tief"-Reports NICHT zuerst die Koordinaten verdaechtigen.** Auf echtem lichess.org wurde der
Draw-Anker (drawImage-Transform vs. Chessground-Piece-Translate) mit exakt 0.0px Abweichung
gemessen: /analysis, /training (Loesung abspielen), /tv, beide Orientierungen, dpr 1/1.25/2,
Resize. Was frueher als "leicht nach oben verschoben" wahrgenommen wurde, war die
**Komposition**: steigende Texte (`+1`, `POW!`, `BOOM`) spawnten ueber dem Zentrum, Partikel
bekamen Aufwaerts-Kicks, der zap-Blitz kommt von oben — der visuelle Schwerpunkt lag dadurch
bis zu ~40% eines Feldes ueber dem Feldzentrum (pixel/Bauern-Capture am schlimmsten, und
Bauern-Captures sind die haeufigsten).

Invariante (Kommentar an `spawn()` in `src/particle-fx-renderer.js`): der alpha-gewichtete
visuelle Schwerpunkt jedes Effekts ueber die GESAMTE Lebensdauer bleibt innerhalb ~10% eines
Feldes um `(cx, cy)`. Float-Texte starten deshalb UNTER dem Zentrum und steigen durch es
hindurch; Kick/Gravity von Debris sind ausbalanciert. Einzige Ausnahme: `ascension` (Koenig
steigt auf — das Aufsteigen IST der Effekt). Messen statt schaetzen: Offscreen-Canvas,
Effekt per virtueller Uhr ticken, pro Frame alpha-gewichtete Pixel-Zentroide akkumulieren
(Referenz-Harness: PR #18). `splatter` hat hohe Varianz (wenige grosse Blobs dominieren die
Masse), im Mittel aber zentriert. Neue Effekte gegen diese Invariante messen.

### Intro/Faint-Lifecycle fuer ALLE Pattern-Hints

**Universell (seit v4.3.1):** *Jeder* Pattern-Hint — nicht mehr nur battery/rooks/outpost — spielt beim ersten Erscheinen einen einmaligen starken Intro-Pulse (900ms, `INTRO_MS` in `src/pattern-overlay.js`), danach faellt die Deckkraft auf einen niedrigen Dauerzustand (`STEADY_FADE = 0.16`), solange das Pattern bestehen bleibt ("Pop, dann dezent ausfaden"). `PatternOverlay` trackt dafuer pro Pattern-Key (`type|side|squares`) den ersten Sichtungs-Zeitpunkt (`firstSeen`-Map) und berechnet den Fade-Faktor ueber `fadeFor(pattern, now)` (gilt jetzt fuer alle Typen, kein `FADE_LIFECYCLE_TYPES`-Gate mehr).

**Wie der Fade angewandt wird:** Statt `fade` durch jede einzelne Zeichenfunktion und ihre Helfer zu faedeln (fehleranfaellig — manche Elemente zeichnen auf dem ambienten `globalAlpha`), setzt `_frame` in `src/pattern-overlay.js` pro Pattern die Basis-`globalAlpha` auf den Fade-Wert und wickelt den Context in `scaleAlpha(ctx, fade)` — einen `Proxy`, der *jede* explizite `globalAlpha = x`-Zuweisung zu `x * fade` skaliert und alle anderen Draw-Calls/Methoden unveraendert durchreicht (Canvas-`globalAlpha` ist ein absoluter Wert, nicht additiv). So dimmt der ganze Hint gleichmaessig an genau EINER Stelle; `drawPatternFx` in `src/pattern-art.js` zeichnet immer volle Staerke und muss den Lifecycle nicht kennen (der `fade`-Param dort bleibt fuer Legacy/Direktaufrufer, wird vom Overlay auf 1 gelassen). Verschwindet ein Pattern (nicht mehr in der `render()`-Liste), wird sein `firstSeen`-Eintrag geloescht — erscheint es spaeter erneut, gibt es einen frischen Intro-Pulse.

Bei `routing === null` (Default) wird der Angreifer via `SIG`-Konstante geroutet; Opfer `k` hat Vorrang und liefert immer `ascension`. Die waehlbare Animation steuert `packId` (Registry `src/packs.js`, aufgeloest via `resolvePack`): `single` setzt `mode` auf einen festen Effekt, `theme` setzt `routing`/`fallback`.
Bei `buildupMs > 0` erscheint zuerst ein Targeting-Reticle auf dem Opfer-Feld; nach Ablauf der Buildup-Zeit wird `fireImpact` aufgerufen und `onImpact` gefeuert (Board-Shake). Default `buildupMs` ist 0.

### Tester

`scripts/debug/harness.html` — lokales HTML-Testbed fuer `ParticleFxRenderer` ohne Lichess.

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

`direction.angleRad` enthaelt den Winkel des Zuges in Bogenmas.

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

**Wichtig — `cg-board` ist KEIN stabiler DOM-Knoten:** Lichess erzeugt das `cg-board`-Element bei Board-Flip, Resize und SPA-Navigation neu. Ein gecachter, inzwischen detachter Knoten liefert `getBoundingClientRect()` = 0x0 bei (0,0) — ein Overlay, das darauf synct, kollabiert still auf Groesse 0 und alle Animationen verschwinden bzw. landen falsch. Deshalb pruefen beide Overlays (`CanvasOverlay`, `PatternOverlay`) in `_ensureBoard()` `board.isConnected` und re-queryen + re-observen bei Bedarf. Neue Stellen, die `cg-board` referenzieren, muessen dasselbe tun.

**Wichtig — Overlays leben IM Board-Container, nicht auf `body`:** Die Overlay-Canvases werden als Geschwister von `cg-board` in dessen Parent (`cg-container`, `position:absolute`, deckungsgleich mit dem Brett) gemountet, mit `position:absolute; left/top = offsetLeft/offsetTop`. So folgen sie dem Brett automatisch durch Scroll, Zoom und Layout-Aenderungen. `position:fixed` auf `body` (der fruehere Ansatz) driftet, weil nur der ResizeObserver — nicht Scroll/Relayout — einen Re-Sync ausloest. Alle Overlay-Elemente (auch der Toast `#k-toast`) brauchen `pointer-events: none`, sonst blockieren sie Zuege.

**Wichtig — aktives Piece-Set auslesen (`src/piece-sprites.js`):** Lichess setzt die Figurengrafiken rein per CSS (`piece.white.knight { background-image: url(...) }`, URL haengt vom gewaehlten Set ab, oft gehasht wie `bN.28c70309.svg`). Um das aktive Set ohne Hardcoding zu lesen: verstecktes Probe-Element `<piece class="white knight">` IN das lebende `cg-board` haengen (damit alle scoped Selektoren greifen), `getComputedStyle(...).backgroundImage` lesen, Probe sofort entfernen. Funktioniert auch fuer Figurentypen, die gerade nicht auf dem Brett stehen. `ParticleFxRenderer` bekommt die Bilder via `getPieceImage(color, type)` und faellt auf den Unicode-Glyph zurueck, solange ein Bild fehlt.

## Architektur

```
MoveFeed          → liest Lichess-Snapshot aus DOM
ChessState        → rekonstruiert Spielzustand (chess.js)
CaptureEventStream → dedupliziert CaptureEvents
RenderEvent       → mappt CaptureEvent auf Canvas-Koordinaten + direction.angleRad
ParticleFxRenderer → rendert Live-Partikel-Effekte direkt per Canvas-API
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
- 130 Tests insgesamt

Abgedeckt:
- Routing aller Figuren zu korrekten Partikel-Effekten (SIG-Tabelle)
- `buildupMs`-Buildup-Timing: Pending-Queue und `fireAt`-Logik
- Board-Shake via `onImpact`-Callback
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

## Debug-Hilfen

Temporare Browser-Inspektoren:

- `scripts/debug/inspect-lichess-tv.mjs`
- `scripts/debug/check-userscript-tv.mjs`

Diese Scripts brauchen einen echten Browser. Sie sind Diagnosewerkzeuge, nicht Teil des normalen Builds.

**Userscript in Playwright auf echtem lichess.org testen:** lichess setzt eine strikte CSP
(`script-src` ohne `unsafe-inline`), die `page.addScriptTag({ content })` blockiert. Loesung:
Browser-Context mit `bypassCSP: true` erzeugen (entspricht dem, was Tampermonkey effektiv
tut), dann das gebaute `.user.js` als Inline-Script injizieren — es braucht keine GM-APIs
(`@grant none`). Zuege lassen sich per Klick-Klick auf Feldzentren spielen (Koordinaten aus
`cg-board.getBoundingClientRect()`); die echten Feld-Anker liefert Chessground selbst ueber
die `translate(x, y)`-Styles der `piece`-Elemente (Feld-Topleft in Board-Pixeln).
