# Privacy — Lichess Kill Animations

This extension does not collect, transmit, or sell any personal data.

- It runs only on https://lichess.org/*.
- It stores a small set of preferences (enabled, sound, intensity)
  via `chrome.storage.sync`. These are kept in your browser and, if you have
  Chrome Sync enabled, synced to your own Google account. They are never sent
  to us or any third party.
- It exposes a one-way messaging channel (`externally_connectable`) to the
  companion gallery page so that page can set your chosen animation. Only the
  animation choice comes in; no personal data is sent out.
- It contains no remote code: all logic (including the bundled chess.js library)
  ships inside the extension package, as required by Manifest V3.
- It makes no network requests of its own and uses no analytics or tracking.

Contact: <add your contact email before submission>.
