// play-context.js
// Fair-play gate for assistance-style overlays (the undefended-piece markers).
//
// Highlighting which pieces are undefended is position ANALYSIS. Under Lichess
// (and chess.com) fair-play rules that counts as *outside assistance* when it is
// shown during a game you are playing — the exact reason the tactical pattern
// hints were removed in v1.0.0. So this overlay is only ever drawn in contexts
// where no live game of yours can be affected:
//
//   /analysis   analysis board
//   /training   puzzles
//   /study      studies / shared analysis
//   /tv         spectating someone else's game (you are not a player)
//
// This is an ALLOWLIST: anything not listed — most importantly a live game page
// like /<gameId> — is denied. Being conservative here is deliberate; a false
// "safe" reading is a fair-play risk, a false "unsafe" reading only omits a
// decoration. (The kill animations themselves are pure reaction to moves already
// made and stay enabled everywhere; only this analysis overlay is gated.)
const ASSIST_SAFE_PATH = /^\/(analysis|training|study|tv)(\/|$)/;

export function isAssistSafeContext(location) {
  const pathname = location?.pathname;
  if (typeof pathname !== 'string') return false;
  return ASSIST_SAFE_PATH.test(pathname);
}
