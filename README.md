# Lichess Kill Animations

Visual enhancements for chess on **lichess.org**: punchy particle **kill animations** on every
capture, plus animated **pattern hints** that highlight tactical and positional formations on
the board. Ships as a **Chrome extension** and as a **Tampermonkey userscript** — both render on
a dedicated overlay canvas above `cg-board`, without ever touching Lichess's own piece elements.

> **Unofficial.** This is an independent add-on. It is **not affiliated with, endorsed by, or
> connected to Lichess** in any way — it only overlays visual effects on top of the site and does
> not change gameplay. "Lichess" is a trademark of its respective owners.

## What it does

- **Kill animations** — each attacking piece gets a signature effect: queen → `nuke` (violet void
  shockwave), rook → `smash`, knight → `slash`, bishop → `zap`, pawn → `pixel`, a captured king →
  `ascension`. Optional WebAudio SFX and a subtle board shake on queen captures.
- **Pattern hints** — the position is analysed live and matching formations are highlighted with
  an animated effect (green = your side, red = the opponent):

  | | | |
  |---|---|---|
  | Battery | Connected/doubled rooks | Pin |
  | Skewer | Fianchetto | Outpost |
  | Passed pawn | Pawn chain | Hotspot (square under heavy fire) |
  | Open file | King fortress | Fork |

## Install

### Chrome extension (recommended)

```bash
npm install
npm run build:ext      # -> dist/extension/
```

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `dist/extension/`.
3. Open https://lichess.org and play. Click the toolbar icon to toggle effects, sound, intensity,
   and pattern hints. (Also works in Edge/Brave.)

A hosted Web Store build is not published yet — see `store/SUBMIT.md`.

### Tampermonkey userscript

```bash
npm run build          # -> lichess-kill-notifier.user.js
```

Tampermonkey → **Create new script** → paste the contents of `lichess-kill-notifier.user.js` → save.
The userscript runs the same engine with default settings (no popup).

## Animation gallery

A static showcase site lets you preview every animation and pattern effect, switch colour themes
(Classic / Fire / Void / Ice / Gold), and — with the extension installed — apply an animation to
your board with one click.

```bash
npm run build:gallery  # -> dist/gallery/  (deploy to GitHub Pages, see store/GALLERY-DEPLOY.md)
```

## Supported pages

| Page | Status |
|------|--------|
| Live games | ✅ |
| Analysis board (`/analysis`) | ✅ |
| Lichess TV | ✅ |
| Puzzles (`/training`) | ✅ |
| Studies / variants / Chess960 | ⚠️ out of scope |

## How it works

```
Lichess DOM ─ MoveFeed ─ chess.js ─┬─ CaptureEvent ─ RenderEvent ─ ParticleFxRenderer  (kill animations)
                                   └─ derivePosition ─ detectPatterns ─ PatternOverlay  (pattern hints)
```

- **chess.js** is the single source of truth for chess logic (captures, en passant, the full board).
- **`detectPatterns(board)`** is a set of pure functions over the position — no engine, just static
  formation rules — so the same code runs in the live overlay and the gallery.
- **ParticleFxRenderer** draws live particle effects; **PatternOverlay** runs a second persistent
  canvas that animates the detected patterns. Both are board-local and orientation-aware.
- The board DOM is used only for geometry and the move list. No Lichess piece elements are modified.

## Development

```bash
npm test                                   # node:test, 128 tests
npm run build && node --check lichess-kill-notifier.user.js
npm run build:ext
npm run build:gallery
```

Source lives in `src/`; the three builds bundle it (including `chess.js`) via esbuild.

| File | Purpose |
|------|---------|
| `src/move-feed.js` | Reads the SAN move list + active ply from the Lichess DOM |
| `src/chess-state.js` | `deriveEvents` (captures) and `derivePosition` (final board) via chess.js |
| `src/event-stream.js` | Deduplicates capture events; tracks the active ply on analysis |
| `src/board-geometry.js` | Converts squares to board-local pixel coordinates |
| `src/canvas-overlay.js` | Manages the `#lichess-kill-overlay` (effect) canvas |
| `src/particle-fx-renderer.js` | Live particle engine; signature routing; WebAudio SFX; crosshair buildup |
| `src/board-shake.js` | Vlambeer-style screen shake, triggered via `onImpact` |
| `src/patterns.js` | `detectPatterns(board)` → the 12 static formations |
| `src/pattern-art.js` | Shared animated highlight drawing (per-pattern bespoke FX + themes) |
| `src/pattern-overlay.js` | Persistent `#lichess-pattern-overlay` canvas that animates patterns |
| `src/packs.js` | Registry of selectable animations (signature / single / theme) |
| `src/settings.js` | Default settings + validation (`enabled`, `packId`, `intensity`, `soundOn`, `patternsOn`, …) |
| `src/runtime.js` | Wires move feed → renderer + pattern overlay; shared by both entries |
| `src/userscript-entry.js` | Tampermonkey entry point |
| `src/extension-entry.js`, `src/popup-entry.js`, `src/background-*.js` | Chrome extension content script, popup, and service worker |
| `gallery/` | Static animation/pattern showcase site |

## License

MIT
