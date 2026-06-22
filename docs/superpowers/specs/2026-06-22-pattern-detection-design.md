# Design: Schach-Muster-Erkennung mit Brett-Highlighting

**Datum:** 2026-06-22
**Branch (Ausgang):** main
**Status:** Genehmigt (Design), wartet auf Implementierungsplan

## Ziel

Statische Schach-Formationen ("Patterns") aus der aktuellen Stellung erkennen und
auf dem Lichess-Brett visuell hervorheben (Linie entlang der Achse + Feld-Glow +
Namens-Label), für **beide** Seiten farblich unterscheidbar. Dazu eine kurze
geschriebene Referenz, welche Formationen als gute/gefährliche Muster gelten.

## Entscheidungen / Defaults

- Muster v1 (7): **Batterie, verbundene/verdoppelte Türme, Pin, Spieß, Fianchetto,
  Außenposten, Freibauer**.
- Beide Seiten markiert; **Farbe nach Brett-Orientierung**: grün = untere Seite
  (Sicht des Betrachters), rot = obere Seite.
- Darstellung: **Linie + Feld-Glow + kleines Text-Label** am Schlüsselfeld.
- Erklärung: **Label am Brett** + **Referenz-Doc** (`docs/PATTERNS.md`), im Popup
  verlinkt.
- Aktiv **überall**, wo das Brett gelesen wird (Partie, Analyse, TV, Puzzle);
  **An/Aus-Toggle im Popup**, Default an.

## Nicht-Ziele (diese Runde)

- Keine dynamischen Taktik-Motive (Gabel, Abzug, Doppelangriff) — nur statische
  Formationen aus der ruhenden Stellung.
- Keine Engine-Bewertung/Stärke-Einschätzung der Muster.
- Keine neuen Permissions.
- Kein Eingriff in die Kill-Effekt-Schicht — Patterns leben auf einer eigenen Ebene.

## A) Stellungsquelle (`src/chess-state.js`)

Neben `deriveEvents` eine reine Funktion:

```js
export function derivePosition(snapshot) {
  // spielt snapshot.sanMoves ab (wie deriveEvents) und gibt die Endstellung
  // -> { board, turn }
  // board: 8x8-Array aus chess.board() ({ type, color, square } | null)
  // turn: 'w' | 'b' (am Zug)
}
```

Bricht bei illegalem SAN ab und liefert die bis dahin gültige Stellung (wie
`deriveEvents`). Geteilte Replay-Logik wird, falls sinnvoll, in einen Helper
extrahiert (kein Verhaltenswechsel für `deriveEvents`).

## B) Detektions-Engine (`src/patterns.js`)

Reine Funktion `detectPatterns(board) → Pattern[]`. Ein Sub-Detektor je Muster.

```js
// Pattern-Form
{ type: 'battery'|'rooks'|'pin'|'skewer'|'fianchetto'|'outpost'|'passed-pawn',
  side: 'w' | 'b',          // welche Seite das Muster "besitzt"/ausführt
  squares: ['d1','d4', …],  // beteiligte Felder (für Glow)
  line: { from:'d1', to:'d8' } | null,  // Achse (für die Linie); null wo keine Achse
  label: 'Batterie' }        // Anzeigename
```

Detektions-Regeln (statisch):
- **Batterie:** gleichfarbige Linienfiguren auf gemeinsamer Linie, dazwischen frei
  bzw. nur die Batterie-Glieder (Q+R/R+R auf Reihe/Linie; Q+B auf Diagonale).
  `side` = Farbe der Figuren. `line` = die Achse.
- **Verbundene/verdoppelte Türme (`rooks`):** zwei Türme gleicher Farbe auf
  derselben Linie (verdoppelt) oder Reihe mit freier Sicht dazwischen.
- **Pin:** gegnerische Linienfigur (B/R/Q) → erste eigene Figur auf der Linie →
  dahinter (gleiche Linie, frei) eine wertvollere eigene Figur oder König.
  `side` = die *pinnende* (gegnerische) Seite; `squares` = Pinner + gepinnte +
  Ziel; `line` = Pinner→Ziel.
- **Spieß (`skewer`):** wie Pin, aber die wertvollere Figur/König steht **vorn**,
  dahinter die geringere.
- **Fianchetto:** Läufer auf b2/g2/b7/g7 mit der typischen Flankenbauern-Struktur
  (eigener Bauer auf der b-/g-Linie ein Feld vorgerückt, Randbauer intakt).
- **Außenposten (`outpost`):** Springer in der gegnerischen Bretthälfte, von einem
  eigenen Bauern gedeckt und nicht von einem gegnerischen Bauern angreifbar
  (keine gegn. Bauern auf den Nachbarlinien, die es verjagen könnten).
- **Freibauer (`passed-pawn`):** Bauer ohne gegnerische Bauern auf seiner Linie
  und den beiden Nachbarlinien in Vorwärtsrichtung.

Wertetabelle für Pin/Spieß: `{ p:1, n:3, b:3, r:5, q:9, k:100 }`.

## C) Persistente Highlight-Schicht (`src/pattern-overlay.js`)

Eigene Klasse, die ein **zweites** board-lokales Canvas verwaltet
(`id="lichess-pattern-overlay"`), analog zu `CanvasOverlay`, aber **persistent**:
es wird **nur bei Stellungswechsel** neu gezeichnet, nicht pro Frame. Liegt unter
dem Kill-Effekt-Canvas (z-index), damit Bursts darüber spielen.

API:
```js
const o = new PatternOverlay();
o.attach();                       // Canvas an cg-board hängen/finden
o.render(patterns, geometry);     // löschen + alle Patterns zeichnen
o.clear();                        // leeren (z.B. bei patternsOn=false)
```
Zeichnen pro Pattern: Feld-Glow auf `squares`, Linie entlang `line`, kleines
Text-Label am Schlüsselfeld. Farbe: grün, wenn `side` der unteren Brettseite
entspricht (aus `geometry.isBlackOrientation` + `side`), sonst rot. Board-lokale
Pixelkoordinaten via `board-geometry`.

## D) Runtime-Integration (`src/runtime.js`)

In `scan()` zusätzlich: wenn `settings.patternsOn`, `derivePosition(snapshot)` →
`detectPatterns(board)` → `patternOverlay.render(patterns, geometry)`. Nur bei
geänderter Stellung neu rendern (Snapshot-Signatur cachen, um Re-Render zu
vermeiden). Bei `patternsOn=false` (oder leerer Stellung) `patternOverlay.clear()`.
Die Kill-Effekt-Pipeline bleibt unverändert. `applyConfig` reagiert auf
`patternsOn`-Wechsel (sofort clear/redraw).

Injektion über die bestehende DI-Struktur (`createRuntime` bekommt optional eine
`patternOverlay`-Factory; Default = echte `PatternOverlay`), damit testbar.

## E) Settings + Popup

- `src/settings.js`: `patternsOn: true` in `DEFAULT_SETTINGS`; `mergeSettings`
  erzwingt Boolean (sonst Default).
- Popup: zusätzlicher Toggle **„Pattern hints"** (schreibt `patternsOn` in
  `chrome.storage.sync`); Content-Script live-Update wie gehabt.
- Galerie-Apply/`packId` unberührt.

## F) Referenz-Doc (`docs/PATTERNS.md`)

Kurze Übersicht der 7 Muster: je 1–2 Sätze (was es ist, warum es gut/gefährlich
ist). Im Popup als Link ("What do these mean?") auf die gehostete Doc/README.

## G) Tests (`node:test`)

- `test/patterns.test.js`: pro Detektor eine **Treffer**-Stellung (FEN→board, via
  `chess.js`) und eine **Beinah-Treffer**-Stellung (Glied fehlt/Linie blockiert),
  plus dass `detectPatterns` mehrere gleichzeitige Muster findet.
- `test/chess-state.test.js` (erweitern): `derivePosition` liefert die korrekte
  Endstellung nach Zügen; bricht bei illegalem SAN sauber ab.
- `test/settings.test.js` (erweitern): `patternsOn` Default + Boolean-Merge.
- `test/runtime.test.js` (erweitern): bei `patternsOn` wird `render` mit erkannten
  Mustern aufgerufen; bei `false` `clear`; kein Re-Render ohne Stellungswechsel
  (mit Fake-PatternOverlay + Fake-`derivePosition`).
- Overlay-DOM/Canvas und echtes `chrome` werden **nicht** unit-getestet (manuell
  „Entpackt laden").
- Bestehende 104 Tests bleiben grün.

## H) Build / Manifest

Keine Manifest-Änderung (kein neuer Permission, keine neue Host). Pattern-Overlay-
Canvas wird wie das Effekt-Canvas injiziert. Beide Builds (Userscript, Extension)
müssen grün bleiben; das Userscript-Bundle wird nach `src/`-Änderungen **mit**
committet.

## Phasen (jede für sich grün & baubar)

1. **Stellungsquelle + Detektion „große 4"** — `derivePosition` + `patterns.js`
   mit Batterie, Türmen, Pin, Spieß + Tests.
2. **Detektion Rest** — Fianchetto, Außenposten, Freibauer + Tests.
3. **Highlight-Schicht** — `pattern-overlay.js` (Linie + Glow + Label, Farbe nach
   Orientierung).
4. **Integration + Settings + Popup** — Runtime-Verdrahtung, `patternsOn`,
   Popup-Toggle; beide Builds grün.
5. **Referenz-Doc + Feinschliff** — `docs/PATTERNS.md`, Popup-Link.

## Manuelle Verifikation (Phasen 3–5)

- Extension „Entpackt laden", auf Lichess-Analyse eine Stellung mit Batterie/Pin
  öffnen → Linie + Glow + Label erscheinen, farblich nach Seite getrennt.
- Toggle im Popup schaltet die Highlights sofort an/aus.
- Stellungswechsel aktualisiert die Muster; Kill-Effekte spielen unverändert
  darüber.

## Risiken / offene Punkte

- **Detektions-Kanten:** Batterie/Pin-Definitionen haben Randfälle (mehrere Figuren
  auf einer Linie, eigene Blocker). Tests mit Beinah-Treffern grenzen ab; v1 bleibt
  bei klaren Definitionen statt vollständiger Engine-Genauigkeit.
- **Re-Render-Häufigkeit:** Snapshot-Signatur-Cache verhindert Neuzeichnen bei
  unveränderter Stellung; Detektion läuft nur bei Zugwechsel (billig).
- **Lesbarkeit:** Glow/Linie dezent halten, damit Figuren lesbar bleiben; Label
  klein und am Rand des Schlüsselfeldes.
- **Orientierung in Analyse:** „untere Seite" kommt aus `isBlackOrientation`; in
  Studien ohne klare Spieler-Seite ist grün=untere Seite weiterhin konsistent.
