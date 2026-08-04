# Lichess Kill Animations

Visual enhancements for chess on **lichess.org**: punchy particle **kill animations** on every
capture. Ships as a **Chrome extension** and as a **Tampermonkey userscript** — both render on
a dedicated overlay canvas above `cg-board`, without ever touching Lichess's own piece elements.

> **Unofficial.** This is an independent add-on. It is **not affiliated with, endorsed by, or
> connected to Lichess** in any way — it only overlays visual effects on top of the site and does
> not change gameplay. "Lichess" is a trademark of its respective owners.

## What it does

- **Kill animations** — each attacking piece gets a signature effect: queen → `nuke` (violet void
  shockwave), rook → `smash`, knight → `slash`, bishop → `zap`, pawn → `pixel`, a captured king →
  `ascension`. Optional WebAudio SFX and a subtle board shake on queen captures. The effect scales
  with the *captured* piece's material value too, independent of the attacker: taking a queen spawns
  noticeably more/bigger particles and a harder, longer board shake than taking a pawn or minor
  piece, so a queen kill reads as the clear crescendo of the game.

## Install

### Chrome extension (recommended)

```bash
npm install
npm run build:ext      # -> dist/extension/
```

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `dist/extension/`.
3. Open https://lichess.org and play. Click the toolbar icon to toggle effects, sound, and
   intensity. (Also works in Edge/Brave.)

A hosted Web Store build is not published yet — see `store/SUBMIT.md`.

### Tampermonkey userscript

**One-click install (recommended):** with Tampermonkey installed, open
[this raw Gist URL](https://gist.githubusercontent.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4/raw/lichess-kill-notifier.user.js)
and click **Install**.
Tampermonkey checks the Gist's `@version` periodically and auto-updates when a new build is
published there, so you only install once.

**Copy-paste (fallback):**

```bash
npm run build          # -> lichess-kill-notifier.user.js
```

Tampermonkey → **Create new script** → paste the contents of `lichess-kill-notifier.user.js` → save.
The userscript runs the same engine with default settings (no popup). With this method you must
repeat the copy-paste manually for future updates.

## Animation gallery

A static showcase site previews every animation as pre-baked animated WebP
tiles — rendered once from the real engine (`scripts/debug/bake-gallery-webp/`), so the page
itself does zero per-frame JavaScript.

```bash
npm run build:pages    # -> docs/  (the GitHub Pages site, see store/GALLERY-DEPLOY.md)
node scripts/debug/bake-gallery-webp/bake.mjs   # rebake gallery/webp/ after effect changes
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
Lichess DOM ─ MoveFeed ─ chess.js ─ CaptureEvent ─ RenderEvent ─ ParticleFxRenderer  (kill animations)
```

- **chess.js** is the single source of truth for chess logic (captures, en passant, the full board).
- **ParticleFxRenderer** draws the live particle effects, board-local and orientation-aware.
- The board DOM is used only for geometry and the move list. No Lichess piece elements are modified.

## Development

```bash
npm test                                   # node:test, 88 tests
npm run build && node --check lichess-kill-notifier.user.js
npm run build:ext
npm run build:gallery
```

Source lives in `src/`; the three builds bundle it (including `chess.js`) via esbuild.

| File | Purpose |
|------|---------|
| `src/move-feed.js` | Reads the SAN move list + active ply from the Lichess DOM |
| `src/chess-state.js` | `deriveEvents` (captures) via chess.js |
| `src/event-stream.js` | Deduplicates capture events; tracks the active ply on analysis |
| `src/board-geometry.js` | Converts squares to board-local pixel coordinates |
| `src/canvas-overlay.js` | Manages the `#lichess-kill-overlay` (effect) canvas |
| `src/particle-fx-renderer.js` | Live particle engine; signature routing; WebAudio SFX; crosshair buildup; scales count/size/shake by the captured piece's material value (`victimDrama`) |
| `src/board-shake.js` | Vlambeer-style screen shake, triggered via `onImpact` |
| `src/packs.js` | Registry of selectable animations (signature / single / theme) |
| `src/settings.js` | Default settings + validation (`enabled`, `packId`, `intensity`, `soundOn`, …) |
| `src/runtime.js` | Wires move feed → renderer; shared by both entries |
| `src/userscript-entry.js` | Tampermonkey entry point |
| `src/extension-entry.js`, `src/popup-entry.js`, `src/background-*.js` | Chrome extension content script, popup, and service worker |
| `gallery/` | Static animation showcase site |

## License

MIT
