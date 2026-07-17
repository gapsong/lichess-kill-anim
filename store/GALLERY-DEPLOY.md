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
The Pages source is the `/docs` folder on `main`. To rebuild and deploy:

```bash
npm run build:pages   # build:gallery + copy dist/gallery/* -> docs/
```

Commit the changed `docs/index.html` + `docs/gallery.js` and push. The gallery
is then live at https://gapsong.github.io/lichess-kill-anim/. (`docs/dev/`
holds internal dev docs and is left untouched by the copy.)

## Update the store listing
Set `STORE_URL` in `gallery/main.js` to the real Web Store listing URL once the
extension is published, then rebuild the gallery.
