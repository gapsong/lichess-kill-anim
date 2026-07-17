import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'gallery');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(path.join(root, 'gallery', 'index.html'), path.join(outDir, 'index.html'));
cpSync(path.join(root, 'gallery', 'webp'), path.join(outDir, 'webp'), { recursive: true });

await build({
  entryPoints: [path.join(root, 'gallery', 'main.js')],
  outfile: path.join(outDir, 'gallery.js'),
  bundle: true,
  format: 'iife',
  legalComments: 'none'
});

console.log('built gallery ->', outDir);
