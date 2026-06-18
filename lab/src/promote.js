#!/usr/bin/env node
// Promote a lab variant back into scripts/animations/<recipe>.mjs.
//
// Usage:  node lab/src/promote.js <piece> <variantId>
// Example: node lab/src/promote.js queen v003

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync
} from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

function fail(msg) {
  console.error(`promote: ${msg}`);
  process.exit(1);
}

const [, , piece, variantId] = process.argv;
if (!piece || !variantId) fail('usage: node lab/src/promote.js <piece> <variantId>');

const variantPath = join(REPO_ROOT, 'lab', 'variants', piece, `${variantId}.mjs`);
const manifestPath = join(REPO_ROOT, 'lab', 'variants', piece, 'manifest.json');

if (!existsSync(variantPath)) fail(`variant not found: ${variantPath}`);
if (!existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const targetRecipe = manifest.recipe;
if (!targetRecipe) fail(`manifest missing "recipe" for piece ${piece}`);

const productionPath = join(REPO_ROOT, 'scripts', 'animations', `${targetRecipe}.mjs`);
if (!existsSync(productionPath)) fail(`production recipe not found: ${productionPath}`);

const backupDir = join(REPO_ROOT, 'scripts', 'animations', '.backup');
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const isoStamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `${targetRecipe}-${isoStamp}.mjs`);
copyFileSync(productionPath, backupPath);
console.log(`promote: backed up ${productionPath} -> ${backupPath}`);

const labSource = readFileSync(variantPath, 'utf8');
const stripped = stripLabHeader(labSource);
writeFileSync(productionPath, stripped);
console.log(`promote: wrote ${variantPath} -> ${productionPath}`);

try {
  console.log('promote: running npm test ...');
  execSync('npm test', { cwd: REPO_ROOT, stdio: 'inherit' });
} catch (err) {
  console.error('promote: tests failed, restoring backup');
  copyFileSync(backupPath, productionPath);
  process.exit(err.status ?? 1);
}

console.log('promote: tests pass.');
console.log('');
console.log('next: re-generate spritesheets and rebuild userscript:');
console.log('  node scripts/generate-spritesheet.mjs');
console.log('  npm run build');
console.log('  node --check lichess-kill-notifier.user.js');

function stripLabHeader(source) {
  // Remove a single leading /** ... */ JSDoc block if it starts the file.
  const match = source.match(/^\s*\/\*\*[\s\S]*?\*\/\s*/);
  if (!match) return source;
  return source.slice(match[0].length).replace(/^\s+/, '');
}
