# Lichess Kill Animations

Tampermonkey userscript for lichess.org that visualizes captures with canvas-based kill animations. When a piece is taken, a live particle effect plays over the board via a dedicated overlay canvas — no DOM manipulation of Lichess pieces.

## Installation

1. **Install Tampermonkey:**
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)

2. **Install the script:**
   - Tampermonkey icon → "Create new script"
   - Paste the contents of `lichess-kill-notifier.user.js`
   - Ctrl+S to save

3. **Play:**
   - Open https://lichess.org
   - Play a game, watch TV, or use the analysis board
   - A piece gets captured → animation plays on the board overlay

## Supported pages

| Page | Status |
|------|--------|
| Live games | ✅ |
| Analysis board (`/analysis`) | ✅ |
| Lichess TV | ✅ |
| Puzzles (`/training`) | ✅ |
| Studies | ⚠️ out of scope |

## How it works

```
Lichess DOM → MoveFeed → chess.js → CaptureEvent → RenderEvent → ParticleFxRenderer
```

- **MoveFeed** reads the move list from the Lichess DOM
- **chess.js** is the single source of truth for chess logic — captures, en passant, piece types
- **CaptureEventStream** deduplicates events; on the analysis board it tracks the active ply so animations fire on navigation, not all at once at page load
- **ParticleFxRenderer** plays a live particle effect on a `<canvas>` overlay positioned above `cg-board`; each piece type has a signature effect (`nuke`, `smash`, `slash`, `zap`, `pixel`, `ascension`); a targeting reticle appears first (configurable buildup before impact)

The board DOM is only used for geometry (pixel coordinates) and move lists. No Lichess piece elements are modified.

## Development

```bash
npm install
npm test
npm run build
node --check lichess-kill-notifier.user.js
```

Source lives in `src/`. `npm run build` bundles everything including `chess.js` into the single-file `lichess-kill-notifier.user.js` for Tampermonkey.

### Project structure

| File | Purpose |
|------|---------|
| `src/move-feed.js` | Reads SAN move list and active ply from Lichess DOM |
| `src/chess-state.js` | Derives CaptureEvents from a snapshot via chess.js |
| `src/event-stream.js` | Deduplicates events; handles analysis board active-ply tracking |
| `src/board-geometry.js` | Converts squares to pixel coordinates |
| `src/canvas-overlay.js` | Manages the `#lichess-kill-overlay` canvas |
| `src/particle-fx-renderer.js` | Live particle engine; routes piece types to signature effects; WebAudio synth SFX |
| `src/board-shake.js` | Vlambeer-style screen shake on `cg-board`, triggered via `onImpact` |
| `src/userscript-entry.js` | Tampermonkey entry point |

### Debug scripts

```bash
node scripts/debug/inspect-lichess-tv.mjs       # inspect TV DOM structure
node scripts/debug/inspect-lichess-analysis.mjs  # inspect analysis board DOM
```

Requires Playwright (`npx playwright install chromium`).

## License

MIT
