import { build } from 'esbuild';

const GIST_RAW_URL =
  'https://gist.githubusercontent.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4/raw/lichess-kill-notifier.user.js';

const banner = `// ==UserScript==
// @name         Lichess Kill Notifier
// @namespace    dismo/lichess-kill
// @version      4.4.0
// @description  Killing-Animationen bei Schlagzuegen mit eigenem Chess-State statt fragilem Board-DOM.
// @author       Dismo
// @match        https://lichess.org/*
// @grant        none
// @run-at       document-idle
// @downloadURL  ${GIST_RAW_URL}
// @updateURL    ${GIST_RAW_URL}
// ==/UserScript==`;

await build({
  entryPoints: ['src/userscript-entry.js'],
  outfile: 'lichess-kill-notifier.user.js',
  bundle: true,
  format: 'iife',
  banner: { js: banner },
  legalComments: 'none'
});
