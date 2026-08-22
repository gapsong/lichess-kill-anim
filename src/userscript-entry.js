import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS } from './settings.js';

// The userscript is a personal, no-UI install, so it opts into the analysis
// helpers by default — the undefended-piece overlay and the goal panel (both
// still fair-play-gated to analysis/puzzles/review — see play-context.js). The
// published extension keeps them OFF by default and exposes popup toggles instead.
createRuntime({
  config: { ...DEFAULT_SETTINGS, showUndefended: true, showGoals: true }
}).start();
