# Deploying the Animation Gallery (GitHub Pages)

## Build
```bash
npm run build:gallery   # -> dist/gallery/ (index.html + gallery.js)
```

## Wire the extension ID
1. Load the unpacked extension once (chrome://extensions) and copy its ID.
2. For production, after publishing to the Web Store, take the published ID.
3. Put it into `gallery/config.js` (`EXT_ID`) and rebuild the gallery.

## externally_connectable
`extension/manifest.json` already lists `https://gapsong.github.io/*` and
`http://localhost/*`. If the gallery moves to another origin, add it there and
rebuild the extension.

## Publish on GitHub Pages
1. Push the contents of `dist/gallery/` to the Pages source (e.g. the `gh-pages`
   branch root, or a `/docs` folder on `main`).
2. In the repo settings, enable Pages for that source.
3. The gallery is then live at https://gapsong.github.io/lichess-kill-anim/.

## Update the store listing
Set `STORE_URL` in `gallery/main.js` to the real Web Store listing URL once the
extension is published, then rebuild the gallery.
