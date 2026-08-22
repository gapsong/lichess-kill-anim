import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS } from './settings.js';

// The userscript is a personal, no-UI install, so it opts into the
// undefended-piece overlay by default (still fair-play-gated to
// analysis/puzzles/review — see play-context.js). The published extension keeps
// it OFF by default and exposes a popup toggle instead.
createRuntime({ config: { ...DEFAULT_SETTINGS, showUndefended: true } }).start();
