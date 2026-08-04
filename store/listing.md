# Chrome Web Store Listing — Lichess Kill Animations

**Name:** Lichess Kill Animations

**Summary (short):**
Turn every capture on lichess.org into a punchy kill animation.

**Description (long):**
Lichess Kill Animations draws a board-local particle effect on every capture you
make or watch on lichess.org. Each attacking piece gets its own signature hit —
the queen triggers a violet void shockwave, the rook a heavy smash, the knight a
blade slash, the bishop a lightning zap, the pawn an 8-bit pop. Optional synth
sound effects and a subtle board shake on queen captures add extra impact.

Works in normal games, analysis main line, Lichess TV, and puzzle history.
Click the toolbar icon to toggle effects on/off, mute sound, or set intensity.

**Disclaimer (include verbatim in the listing):**
This is an unofficial, independent add-on. It is not affiliated with, endorsed by,
sponsored by, or connected to Lichess or lichess.org in any way. It only overlays
visual effects on the site and does not change gameplay. "Lichess" is a trademark
of its respective owners; it is used here only to describe what the add-on works with.

**Category:** Entertainment (alt: Sports)

**Single purpose:**
Render kill animations for chess captures on lichess.org. The extension runs only
on https://lichess.org/* and does nothing on other sites.

**Permission justification:**
- `storage`: persist the user's local preferences (enabled, sound, patterns,
  intensity) via `chrome.storage.sync`. No data leaves the browser.

The manifest declares only the `storage` permission and **no host permissions**;
the extension reaches lichess pages solely through a content script scoped to
`https://lichess.org/*`. It also uses two non-permission manifest keys:
- `background` (a minimal service worker): receives the animation choice from the
  gallery and writes it to `chrome.storage.sync`.
- `externally_connectable` (`https://gapsong.github.io/*`, plus `http://localhost/*`
  for local dev): lets the companion gallery page one-way send the selected
  animation to the extension. No user data is sent back out.

No remote code: all logic, including the bundled chess.js, ships inside the
package (Manifest V3 requirement).
