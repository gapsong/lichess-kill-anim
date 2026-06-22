import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'dist', 'extension');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// copy static extension assets (manifest, popup.html, icons/) if present
const srcExt = path.join(root, 'extension');
if (existsSync(srcExt)) cpSync(srcExt, outDir, { recursive: true });

// stamp manifest version from package.json
const manifestPath = path.join(outDir, 'manifest.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

// bundle content script
await build({
  entryPoints: [path.join(root, 'src', 'extension-entry.js')],
  outfile: path.join(outDir, 'content.js'),
  bundle: true,
  format: 'iife',
  legalComments: 'none'
});

// bundle popup if a source entry exists (Task 4 adds it)
const popupEntry = path.join(root, 'src', 'popup-entry.js');
if (existsSync(popupEntry)) {
  await build({
    entryPoints: [popupEntry],
    outfile: path.join(outDir, 'popup.js'),
    bundle: true,
    format: 'iife',
    legalComments: 'none'
  });
}

const bgEntry = path.join(root, 'src', 'background-entry.js');
if (existsSync(bgEntry)) {
  await build({
    entryPoints: [bgEntry],
    outfile: path.join(outDir, 'background.js'),
    bundle: true,
    format: 'iife',
    legalComments: 'none'
  });
}

console.log('built extension ->', outDir);

// package into an upload-ready zip when --zip is passed (Task 6 documents package:ext)
if (process.argv.includes('--zip')) {
  const zipPath = path.join(root, 'dist', `lichess-kill-animations-v${pkg.version}.zip`);
  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: outDir });
  console.log('packaged ->', zipPath);
}
