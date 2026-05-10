import { build } from 'esbuild';

const banner = `// ==UserScript==
// @name         Lichess Kill Notifier
// @namespace    dismo/lichess-kill
// @version      4.0.0
// @description  Killing-Animationen bei Schlagzuegen mit eigenem Chess-State statt fragilem Board-DOM.
// @author       Dismo
// @match        https://lichess.org/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==`;

await build({
  entryPoints: ['src/userscript-entry.js'],
  outfile: 'lichess-kill-notifier.user.js',
  bundle: true,
  format: 'iife',
  banner: { js: banner },
  legalComments: 'none'
});
