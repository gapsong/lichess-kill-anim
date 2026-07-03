# Lichess Kill Animations

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

## Wichtige Module

### Core-Pipeline

- `src/chess-state.js`: erzeugt CaptureEvents aus Start-FEN und SAN-Zugliste via `chess.js`
- `src/move-feed.js`: liest Lichess-Zuglisten aus dem DOM
- `src/board-geometry.js`: rechnet Squares in Pixelkoordinaten um
- `src/event-stream.js`: dedupliziert Events ueber MutationObserver-Scans
- `src/render-event.js`: reichert CaptureEvents mit board-lokalen Canvas-Koordinaten an
- `src/canvas-overlay.js`: verwaltet ein board-lokales Canvas ueber `cg-board`
- `src/particle-fx-renderer.js`: Live-Partikel-Engine; zeichnet alle Effekte direkt per Canvas-API (kein Spritesheet); unterstuetzt `buildupMs`-Crosshair vor Impact
- `src/board-shake.js`: abklingender Screen-Shake auf `cg-board` (Vlambeer-Style), getriggert via `onImpact`
- `src/userscript-entry.js`: Tampermonkey-Einstieg, Toasts und Canvas-Renderer
- `src/patterns.js`: erkennt statische Formationen (`detectPatterns(board)` → battery/rooks/pin/skewer/fianchetto/outpost/passed-pawn)
- `src/pattern-overlay.js`: persistente zweite Canvas-Schicht, zeichnet erkannte Muster (Linie + Glow + Label); Toggle `patternsOn`
- `src/chess-state.js`: zusätzlich `derivePosition(snapshot)` → Endstellung (`chess.board()`) für die Muster-Erkennung

### Build-Scripts

- `scripts/build-userscript.mjs`: baut die installierbare Datei via esbuild

### Extension + Gallery (Pack-System)

- `src/packs.js`: Registry aller wählbaren Animationen (signature/single/theme); `resolvePack(id)` → `{mode,routing,fallback}`
- `gallery/`: statische Galerie-Website (Live-Previews via Engine); Build `npm run build:gallery` → `dist/gallery/`
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
- 104 Tests insgesamt

Abgedeckt:
- Routing aller Figuren zu korrekten Partikel-Effekten (SIG-Tabelle)
- `buildupMs`-Buildup-Timing: Pending-Queue und `fireAt`-Logik
- Board-Shake via `onImpact`-Callback
- Regressionstests fuer Lichess TV, Puzzle-ID-Reset, Feedback-Marker, En Passant

## Animation Lab (`lab/`) — eingefroren

`lab/` und `scripts/animations/` sind eingefroren: Sie haben keinen Production-Bezug mehr, da die Partikel-Engine keine Spritesheets benoetigt. Die Verzeichnisse existieren weiterhin auf Disk. Ein Umbau auf Partikel-Varianten ist in einer separaten Spec geplant und nicht Teil des aktuellen Stands.

Pure Logik liegt in `lab/src/tournament.js` und wird via `node --test`
mit `test/tournament.test.js` abgedeckt.

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
