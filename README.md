# Lichess Kill Animations

Overlay/Userscript für Lichess, das Schlagzüge (Captures) mit einer Bomben-Animation
visualisiert. Statt dass Figuren einfach verschwinden, erscheint eine 💣-Explosion
auf dem Feld der geschlagenen Figur.

## Installation

1. **Tampermonkey installieren:**
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)

2. **Script installieren:**
   - Tampermonkey-Icon → "Create new script"
   - Inhalt von `lichess-kill-notifier.user.js` reinpasten
   - Ctrl+S speichern

3. **Loslegen:**
   - https://lichess.org öffnen
   - Spiel starten oder Analyse-Brett
   - Figur schlagen → 💥 Bombe + Toast!

## Features

- 💣 Bomben-Animation auf dem Feld der geschlagenen Figur
- 📝 Toast-Benachrichtigung ("Weißer Springer schlägt Schwarzen Bauer!")
- 🔄 Board-Flip-Unterstützung (Schwarz-Perspektive)
- ⚡ Instant-Detection via MutationObserver
- 🎯 En-Passant-Erkennung

## Development

```bash
npm install
npm test
npm run build
```

Der lesbare Code liegt in `src/`. `npm run build` erzeugt die installierbare
Ein-Datei-Version `lichess-kill-notifier.user.js` fuer Tampermonkey.

## License

MIT
