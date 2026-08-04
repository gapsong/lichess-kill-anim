# Submitting to the Chrome Web Store — v1.0.0

**Status:** the package is built and verified. `npm run package:ext` produces
`dist/lichess-kill-animations-v1.0.0.zip`, confirmed to load as a valid MV3
extension and to fire the kill animation on a real capture at lichess.org
(see `scripts/debug/verify-extension-lichess.mjs`). Everything below that needs a
human is your Google account and one screenshot.

---

## ⚠️ Decide BEFORE you set the listing Public

The extension currently shows **tactical pattern hints** (pins, forks, hanging
pieces, hotspots…) on **every** page, including ranked/live games. Those count as
**outside assistance** under Lichess and chess.com fair-play rules. The **kill
animations themselves are cosmetic and always fine.**

Two options:
1. **Publish _Unlisted_ now** (share by link only) — fine for testing among people
   who understand it. Do this to try the whole flow without the fair-play risk.
2. **Gate the pattern hints off for ranked/live play _before_ going Public**
   (analysis/puzzles/review only). Wiring point + TODO: `src/runtime.js`
   (`renderPatterns`). This is a code change, out of scope for this release-prep PR.

Not blocking the upload — just don't flip it to Public with hints on.

---

## What only you can do (needs your Google account)

1. **Developer account** — go to https://chrome.google.com/webstore/devconsole,
   sign in with the publishing account, pay the **one-time USD 5** fee.
2. **Upload** `dist/lichess-kill-animations-v1.0.0.zip` (build it with
   `npm run package:ext`) via **New item**.
3. **Paste the listing** from `store/listing.md` (name, summary, description,
   category, disclaimer).
4. **Privacy** — declare *"Does not collect user data"*, paste the permission
   justification from `store/listing.md`, and paste `store/privacy.md` as the
   privacy policy. **Add your support email** to `store/privacy.md` first (it ships
   with a `<add your contact email>` placeholder — the store requires a real one).
5. **Add ONE screenshot** (1280×800 or 640×400) — see below.
6. **Submit for review** (pick Public or Unlisted per the gate decision above).
   Review typically takes a few business days.

## The screenshot (the one visual asset)

You need at least one 1280×800 PNG showing the effect. A **ready-made one** is
already generated — the fastest path is to reuse it:

```bash
npm run build:ext
xvfb-run -a node scripts/debug/verify-extension-lichess.mjs
# -> dist/store-screenshot-1280x800.png   (a real queen "nuke" capture on lichess)
```

(That same script is the extension's end-to-end verification; it also prints a
`pass: true` line.) It was also sent to you on Telegram, so you can just download
and upload it.

Prefer to shoot your own? ~30 seconds:
1. Install the extension unpacked (`chrome://extensions` → Developer mode → *Load
   unpacked* → `dist/extension`), or from the store draft.
2. Open https://lichess.org/analysis and play **1.e4 e5 2.Qh5 a6 3.Qxe5** — the
   last move is a queen capture and triggers the big violet "nuke" effect.
3. Screenshot the moment of impact; crop/scale to 1280×800.

## Updates (future versions)

Bump `version` in `package.json` (single source of truth — the build stamps
`manifest.json` from it), run `npm run package:ext`, upload the new `.zip` to the
same item, and submit again.

## What's in the package / permissions

The zip contains `manifest.json`, the bundled `content.js` (runtime + chess.js,
no remote code), `background.js`, `popup.html` + `popup.js`, and the 16/48/128
icons. It requests only the **`storage`** permission (local preferences). It also
declares a tiny `background` service worker and `externally_connectable` for the
gallery origin `https://gapsong.github.io/*` (plus `http://localhost/*` for local
dev) so the gallery can set the chosen animation. No host permissions beyond the
`https://lichess.org/*` content-script match. Single purpose: kill animations on
lichess.org.
