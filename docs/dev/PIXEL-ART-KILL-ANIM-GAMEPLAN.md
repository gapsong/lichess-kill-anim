# Pixel-Art Kill Animations — Gameplan

Ziel: Kill-Animationen im Stil von **Gambonanza** (Stray Fawn / Blukulélé) und
**Gambit** (Jeriko) — chunky Low-Res-Pixel-Art mit harten Paletten, Hit-Flash,
Screen-Shake und Dissolve, statt der bisherigen weichen Gradient-Effekte.

Referenzen:
- https://store.steampowered.com/app/3509230/Gambonanza/
- https://store.steampowered.com/app/3461050/Gambit/ (Trailer: youtube xvCTxyFniPQ)

---

## 1. Wie diese Animationen wirklich funktionieren

### 1.1 Der Flipbook-Anteil (~1/3 des Gefühls)

Pixel-Art-Studios zeichnen Effekte als kurze Spritesheets (6–12 Frames) in
**Aseprite**, typischerweise 32–96 px logische Auflösung. Stilregeln:

- **Niedrige logische Auflösung**, nearest-neighbor hochskaliert. Die
  Klobigkeit IST die Ästhetik.
- **Harte Paletten**: 3–5 Farben pro Effekt als Ramp (weiß → gelb → orange →
  rot → dunkel). Keine weichen Gradients, keine weichen Alphakanten.
- **Hartes Alpha**: Pixel sind da oder nicht. Ausfaden passiert über
  Palettenwechsel zu dunkleren Farben und Auflösen (Pixel entfernen),
  plus globalAlpha auf Sprite-Ebene.
- Die Prinzipien aus `docs/ANIMATION-PRINCIPLES.md` (Color Story, Hit-Flash,
  Timing-Ratio, Smear, Silhouette) gelten unverändert — nur quantisiert.

### 1.2 Der Engine-Anteil (~2/3 des Gefühls)

Was in Gambonanza als "saftiger Kill" gelesen wird, ist ein **Composite**,
das die Engine pro Capture orchestriert:

1. **Hit-Stop** — Spiel friert 50–120 ms beim Impact ein (für uns nicht
   machbar: das Brett gehört Lichess).
2. **Victim White-Flash** — Opfer-Sprite rendert 1–2 Frames als reine weiße
   Silhouette.
3. **Impact-Flipbook** — das handgezeichnete Spritesheet obendrauf.
4. **Partikel** — harte Quadrate/Rechtecke mit Gravitation, zur Laufzeit
   gespawnt (bei uns: in die Frames gebacken via `debris()`).
5. **Screen-Shake** — 2–4 px Kameraversatz, ~150 ms abklingend
   (Vlambeer-Doktrin "The Art of Screenshake").
6. **Victim-Dissolve** — das Opfer verschwindet nicht instantan, sondern
   zerfällt in Pixel / spielt einen Death-Frame.
7. CRT-Filter und Sound vereinheitlichen alles.

### 1.3 Das Studio-Interface (SOTA)

Universelles Muster: **Animationen sind Daten, Code ist ein generischer
Player + Event-Hooks, Juice sind separate Systeme** am selben Event.
Aseprite exportiert Strip-PNG + JSON (Frames, Durations, Tags) — strukturell
identisch zu unserem Pack-Format. AI ist in Studios NICHT SOTA für finale
Frames (Koheränz/Palettendisziplin); handgezeichnet dominiert. Unsere
Pipeline ist AI-first, deshalb brauchen wir Constraints, die die
Handzeichnungs-Disziplin erzwingen.

---

## 2. Architektur-Entscheidung: Zwei Factories, ein Runtime-Contract

Die Engine konsumiert nur: **PNG-Strip + Metadaten (frameWidth, frames,
drawSize, durations) + Timeline-Keyframes.** Wie die Pixel entstehen, ist
austauschbar. AI-Bilder müssen NICHT in Frame-Funktions-Code übersetzt
werden — sie werden nur in den Strip gepackt.

```
Factory A: Prozeduraler Codegen          Factory B: Bild-Import (optional)
  scripts/animations/*.mjs                 PNG-Frames aus beliebiger Quelle
  (LLM schreibt Frame-Code,                (Retro Diffusion / PixelLab API,
   lab-GAN-Loop iteriert)                   Aseprite, Mensch)
        │                                        │
        ▼                                        ▼
  Playwright rendert 128px      →   scripts/import-frames.mjs packt Strip
        │
        ▼
  PIXELATE-PASS (neu): downscale auf 32px-Grid + Paletten-Quantisierung
        │
        ▼
  ──────────────── Runtime-Contract ────────────────
  Strip (base64) + Metadaten in src/default-animation-pack.js
        │
        ▼
  Timeline → CanvasSpriteRenderer → drawImage (imageSmoothing OFF)
```

Factory A bleibt der Hauptweg, weil der lab-Loop auf Code-Mutation beruht
(Lineage, Diffs, Hypothesen). Factory B macht uns Authoring-agnostisch,
degradiert aber Iteration zu Prompt-Roulette — gut für "einmal generieren,
Sieger einfrieren".

---

## 3. Phasen

### Phase 1 — Pixel-Pipeline (diese Session)

1. **Pixelate-Pass im Generator** (`scripts/generate-spritesheet.mjs`):
   - Frame wird wie bisher auf 128 px gerendert (alle Recipes, shared.mjs
     etc. bleiben unverändert).
   - Downscale auf `recipe.pixelGrid` (default 32) in zwei Stufen.
   - Quantisierung: Alpha hart (`< alphaCutoff` → 0, sonst 255),
     Farben auf `recipe.palette` (nearest color) oder Posterize auf
     4 Levels pro Kanal.
   - Strip wird **in niedriger Auflösung gespeichert** (frameWidth = 32) —
     base64-Payload schrumpft ~16×.
   - Debug-Strips nach `artifacts/spritesheets/` (1× und 4× nearest).
2. **Nearest-Neighbor beim Zeichnen**: `imageSmoothingEnabled = false` in
   `createCanvasSpriteDrawer` — der Upscale von 32 auf drawSize (72–96 px)
   erzeugt die sichtbaren Chunks.
3. **Hit-Flash-Layer**: neues Recipe `scripts/animations/flash.mjs`
   (2–3 Frames weiße Impact-Silhouette), als Layer bei t≈650–790 in allen
   sechs Timelines (Impact-Moment ist überall t≈680).
4. **Board-Shake**: `src/board-shake.js` (abklingender Transform auf
   `cg-board`), getriggert über neuen Renderer-Hook
   `onImpact` + `timeline.impactAtMs`. Das Overlay-Canvas hängt am body
   (position: fixed) und wackelt bewusst nicht mit — das Brett ruckt unter
   dem Effekt.

### Phase 2 — Bild-Factory + Lab-Parität

- `scripts/import-frames.mjs`: Verzeichnis mit Frame-PNGs → Strip +
  Pack-Block (gleicher Pixelate-Pass optional anwendbar).
- AI-Bildquellen: **Retro Diffusion API** (Animation-Endpoint, native
  Pixel-Modelle) oder **PixelLab API** — Frames generieren, Palette
  aufräumen, importieren. Erwartung: authentischer Look, aber
  Frame-Kohärenz prüfen; Ausschuss einplanen.
- Lab: Pixelate-Preview im lab-Renderer (gleiche Quantisierung als
  Canvas-Pass), damit Tournament-Urteile den Production-Look bewerten.

### Phase 3 — Victim-Dissolve (größter Feel-Sprung danach)

Aktuell blinkt die geschlagene Figur einfach weg (Lichess-DOM). Plan:
- Beim Capture die Opfer-Figur als Pixel-Silhouette auf dem Overlay
  weiterzeichnen: 1 Frame weiß geflasht, dann 4–6 Frames Dissolve
  (Pixel fallen heraus, Gravitation).
- Braucht Piece-Sprites: entweder die Lichess-SVGs rastern + pixelieren
  (zur Laufzeit in ein Offscreen-Canvas) oder ein eigenes 16×16-Piece-Set
  generieren (Factory A oder B).
- Neuer Timeline-Ref `victim.sprite` oder separater Layer-Typ.

### Phase 4 — Pixel-DSL für besseren Codegen (optional)

Wenn Posterize-Output nicht "handgezeichnet" genug wirkt: kleine
Pixel-Grid-API in `shared.mjs` (`pxGrid(32).palette([...])`, `blob()`,
`ring()`, `dissolve(p)`, `scatter()`), gegen die der lab-Loop generiert.
Erzwingt Palettendisziplin und harte Kanten by construction statt durch
Post-Processing.

---

## 4. Stil-Leitplanken (für Codegen-Prompts und Reviews)

- 32×32 logisches Grid (48 nur für filigrane Effekte wie Crosshair).
- Max. 4–5 Farben pro Effekt, definierte Ramp, weiß nur am Impact-Frame.
- Kein weiches Alpha im Sheet; Fading über Timeline-`alpha` und
  Palettenverdunkelung.
- Impact-Frame = kürzeste Duration (30–50 ms), Aftermath bekommt die Zeit.
- Partikel = einzelne harte Pixel/2×2-Blöcke, mit Gravitations-Bias.
- Rotation (`rotationRef`) ist erlaubt — auch Pixel-Art-Spiele rotieren
  Sprites — aber kontinuierliches Scaling sparsam einsetzen; besser
  Größenänderung in Frames backen.

## 5. Verifikation

```bash
node scripts/generate-spritesheet.mjs   # erzeugt auch artifacts/spritesheets/*.png
npm test
npm run build && node --check lichess-kill-notifier.user.js
```

Visuelle Abnahme: Debug-Strips in `artifacts/spritesheets/` ansehen;
danach Userscript auf lichess.org/tv beobachten.
