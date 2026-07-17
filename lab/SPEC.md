# lab/ — Animation Tournament Lab

## Goal

Lokales Tournament-Tool in `lab/`, in dem 4 Varianten derselben Kill-Szene parallel
loopen. User klickt Favoriten, Verlierer wandern ins `lab/archive/`, Sieger seedet die
nächste Runde. Sieger kann zurück in `scripts/animations/` promoted werden.

Das Lab ist eine eigenständige Webseite auf `localhost:5173`, separat vom
Tampermonkey-Userscript. Production-Build (`lichess-kill-notifier.user.js`) bleibt
unverändert.

## User Flow

1. `npm run lab` → Vite startet `http://localhost:5173`
2. UI lädt 4 Varianten aus `lab/variants/queen/` in ein 2×2 Canvas-Grid
3. Alle 4 Canvas loopen synchron (gemeinsame `startTime`)
4. Hover zeigt Hypothese-Header der Variant
5. Klick auf Variant → andere 3 wandern nach `lab/archive/queen/<roundN>/`
6. Modal: "Nächste Runde?"
   - **Refine** → User tippt in Claude Code `/lab-generate queen --seed v003 --count 3`
   - **From Pool** → 3 ungenutzte Varianten aus `variants/queen/`
   - **Done** → Sieger wird in `results/` festgehalten, Promote-Button erscheint
7. Promote → `node lab/src/promote.js queen v003` → Backup + Replace + `npm test` + `npm run build`

## Architektur

```
lab/
├── package.json           # devDeps: vite. Scripts: lab, mutate, promote
├── vite.config.js
├── index.html             # einzige Page
├── src/
│   ├── main.js            # Entrypoint
│   ├── tournament.js      # State-Machine: { piece, round, candidates[], winner? }
│   ├── playground.js      # 4-Canvas-Grid, synced loop
│   ├── variant-loader.js  # dynamic import variants/<piece>/<id>.mjs
│   ├── results-store.js   # localStorage + JSON files
│   └── promote.js         # CLI: replace scripts/animations/<file> + backup
├── variants/
│   └── queen/
│       ├── _baseline.mjs  # Kopie der aktuellen Production-Recipe
│       ├── v001.mjs
│       └── manifest.json
├── archive/
│   └── queen/             # verlorene Varianten
└── results/
    └── 2026-05-28-queen-v047.json
```

Re-use Production-Code: `playground.js` importiert per relativem Pfad
`../../src/timeline.js`, `../../src/canvas-sprite-renderer.js`,
`../../src/render-event.js`. Keine Code-Duplikation.

## Variant-Format

Jede Variant ist ein ES-Modul, gleicher Shape wie `scripts/animations/*.mjs`, plus
Metadata-Header:

```js
/**
 * @lab-variant queen/v003
 * @parent _baseline
 * @hypothesis Längere Anticipation (frame0: 40→120ms), Bounce-Easing auf scale
 * @generatedBy hand     // hand | mutate.mjs | claude-skill
 * @generatedAt 2026-05-28T14:32:00Z
 */
export const recipe = { /* frameCount, frameSize, drawSize, frameDurations, frames */ };
export const timeline = { /* optional override für Keyframes */ };
```

## Storage

- `variants/<piece>/manifest.json` — append-only, gepflegt vom Generator
- `results/<date>-<piece>-<winner>.json` — Sieger + Round-Trail, geschrieben beim "Done"
- `archive/<piece>/round-N/` — Verlierer pro Runde
- `localStorage` — aktive Session überlebt Tab-Reload

## Phasen

### Phase 1 (Fokus jetzt): Manuelles Lab
- `lab/` Setup mit Vite
- 4 hand-codierte Varianten für Dame als Start-Pool
- Tournament-UI mit 2×2 Grid, sync loop, click-to-pick, archive
- Promote-Script
- LocalStorage-Persistenz
- Existierende `npm test` (45 Tests) bleiben grün

### Phase 2 (später): Procedural Mutation
- `lab/scripts/mutate.mjs` perturbiert Baseline-Recipe (frame durations ±20%,
  spike count ±2, hue ±15°, easing wechseln)
- Generiert N Varianten in einem Rutsch

### Phase 3 (done): Generator-Skill
- `.claude/commands/lab-generate.md` als Custom Slash-Command
- Liest `docs/dev/ANIMATION-PRINCIPLES.md` + letztes Round-Log unter
  `lab/gan-harness/rounds/`
- Orchestriert Phase 2 (`npm run lab:generate -- <piece> <champion>` →
  Antwort in Tempfile → `--apply <tmp>`); kein neues File-I/O
- Resultierend: neue `vXXX.mjs` + Manifest-Eintraege mit
  `generatedBy: 'claude-skill'` + Round-Log
- Aufruf: `/lab-generate <piece> <championId> [--count N]`

## Non-Goals (Phase 1)

- Kein Audio
- Keine Generator-Agent-Loop (nur hand-codierte Variants in Phase 1)
- Keine GitHub-PR-Erstellung
- Kein Multi-User
- Kein Diff-Viewer zwischen Varianten

## Acceptance Criteria (Phase 1)

- [ ] `npm run lab` startet Vite ohne Fehler
- [ ] 4 Canvas zeigen jeweils eine Variant, loop-synchron (alle frame 0 zur gleichen Zeit)
- [ ] Klick promotet eine, archiviert drei
- [ ] `localStorage` überlebt Tab-Reload
- [ ] Promote-Script ersetzt Production-Recipe mit Backup + Tests laufen grün
- [ ] Existierende 45 Tests bleiben grün
- [ ] Production-Workflow (`npm run build`, Tampermonkey) unverändert
