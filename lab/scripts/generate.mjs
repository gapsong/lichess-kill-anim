#!/usr/bin/env node
// Phase 2 Generator orchestrator.
//
// Two modes:
//   npm run lab:generate -- <piece> <championId>                 → print prompt
//   npm run lab:generate -- <piece> <championId> --apply <resp>  → write variants

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync
} from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = resolve(HERE, '..');

// ---------- Pure helpers (exported for tests) ----------

export function computeNextIds(manifest, count) {
  const nums = manifest.variants
    .map((v) => v.id)
    .filter((id) => /^v\d+$/.test(id))
    .map((id) => parseInt(id.slice(1), 10));
  const highest = nums.length ? Math.max(...nums) : 0;
  const ids = [];
  for (let i = 1; i <= count; i++) {
    ids.push('v' + String(highest + i).padStart(3, '0'));
  }
  return ids;
}

export function formatLineage(manifest) {
  const header = '| id | parent | hypothesis | generatedBy |';
  const sep = '|---|---|---|---|';
  const rows = manifest.variants.map((v) =>
    `| ${v.id} | ${v.parent} | ${escapePipe(v.hypothesis)} | ${v.generatedBy} |`
  );
  return [header, sep, ...rows].join('\n');
}

function escapePipe(s) {
  return String(s).replace(/\|/g, '\\|');
}

export function buildPrompt({
  template, spec, rubric, championId, championSource, manifest, nextIds, timestamp
}) {
  return template
    .replace(/\{\{SPEC\}\}/g, spec)
    .replace(/\{\{RUBRIC\}\}/g, rubric)
    .replace(/\{\{CHAMPION_ID\}\}/g, championId)
    .replace(/\{\{CHAMPION_SOURCE\}\}/g, championSource)
    .replace(/\{\{LINEAGE\}\}/g, formatLineage(manifest))
    .replace(/\{\{NEXT_IDS\}\}/g, nextIds.join(','))
    .replace(/\{\{COUNT\}\}/g, String(nextIds.length))
    .replace(/\{\{TIMESTAMP\}\}/g, timestamp);
}

export function parseResponse(responseText, expectedIds) {
  const blocks = [];
  const fenceRe = /=== VARIANT: (v\d+) ===\s*([\s\S]*?)\s*=== END VARIANT ===/g;
  let match;
  while ((match = fenceRe.exec(responseText)) !== null) {
    blocks.push({ id: match[1], source: match[2].trim() + '\n' });
  }
  if (blocks.length !== expectedIds.length) {
    throw new Error(
      `parser: expected ${expectedIds.length} variant blocks, found ${blocks.length}`
    );
  }
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id !== expectedIds[i]) {
      throw new Error(
        `parser: block ${i} has id ${blocks[i].id}, expected ${expectedIds[i]}`
      );
    }
  }
  return blocks;
}

export function appendManifest(manifest, entries) {
  const seen = new Set(manifest.variants.map((v) => v.id));
  for (const e of entries) {
    if (seen.has(e.id)) {
      throw new Error(`manifest: duplicate id ${e.id}`);
    }
    if (!e.id || !e.parent || !e.hypothesis || !e.generatedBy || !e.generatedAt) {
      throw new Error(`manifest: entry missing required fields: ${JSON.stringify(e)}`);
    }
    seen.add(e.id);
  }
  return { ...manifest, variants: [...manifest.variants, ...entries] };
}

export function extractHypothesis(variantSource) {
  const m = variantSource.match(/@hypothesis([\s\S]*?)(?=\n\s*\*\s*@|\n\s*\*\/)/);
  if (!m) return '';
  return m[1]
    .replace(/\n\s*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- I/O helpers ----------

function loadManifestSync(piece) {
  return JSON.parse(readFileSync(join(LAB_ROOT, 'variants', piece, 'manifest.json'), 'utf8'));
}

function saveManifestSync(piece, manifest) {
  const p = join(LAB_ROOT, 'variants', piece, 'manifest.json');
  const tmp = p + '.tmp';
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
  renameSync(tmp, p);
}

function loadVariantSourceSync(piece, id) {
  return readFileSync(join(LAB_ROOT, 'variants', piece, `${id}.mjs`), 'utf8');
}

function writeVariantSourceSync(piece, id, source) {
  writeFileSync(join(LAB_ROOT, 'variants', piece, `${id}.mjs`), source);
}

function readGanHarnessFile(name) {
  return readFileSync(join(LAB_ROOT, 'gan-harness', name), 'utf8');
}

function writeRoundLog(payload) {
  const dir = join(LAB_ROOT, 'gan-harness', 'rounds');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `round-${stamp}-${payload.champion}.json`;
  writeFileSync(join(dir, name), JSON.stringify(payload, null, 2) + '\n');
  return name;
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = {
    mode: 'prompt', piece: null, champion: null, count: 3, responsePath: null,
    llmUrl: 'http://localhost:1234/v1/chat/completions',
    llmModel: 'local-model',
    temperature: 0.9,
    maxTokens: 8000
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') { args.count = parseInt(argv[++i], 10); continue; }
    if (a === '--apply') { args.mode = 'apply'; args.responsePath = argv[++i]; continue; }
    if (a === '--print-prompt') { args.mode = 'prompt'; continue; }
    if (a === '--llm') { args.mode = 'llm'; continue; }
    if (a === '--llm-url') { args.llmUrl = argv[++i]; continue; }
    if (a === '--llm-model') { args.llmModel = argv[++i]; continue; }
    if (a === '--temperature') { args.temperature = parseFloat(argv[++i]); continue; }
    if (a === '--max-tokens') { args.maxTokens = parseInt(argv[++i], 10); continue; }
    positional.push(a);
  }
  args.piece = positional[0];
  args.champion = positional[1];
  return args;
}

function fail(msg) {
  console.error(`generate: ${msg}`);
  process.exit(1);
}

function cmdPrompt({ piece, champion, count }) {
  if (!piece || !champion) {
    fail('usage: lab:generate <piece> <championId> [--count N] [--apply <response.md>]');
  }
  const manifest = loadManifestSync(piece);
  if (!manifest.variants.some((v) => v.id === champion)) {
    fail(`champion not in manifest: ${champion}`);
  }
  const championSource = loadVariantSourceSync(piece, champion);
  const nextIds = computeNextIds(manifest, count);
  const prompt = buildPrompt({
    template: readGanHarnessFile('generator-prompt.md'),
    spec: readGanHarnessFile('spec.md'),
    rubric: readGanHarnessFile('eval-rubric.md'),
    championId: champion,
    championSource,
    manifest,
    nextIds,
    timestamp: new Date().toISOString()
  });
  process.stdout.write(prompt);
  console.error(`\n--- generate: prompt ready for ${nextIds.join(', ')} (seed=${champion})`);
  console.error('--- next: feed the prompt to a Generator agent, then re-run with');
  console.error(`---   npm run lab:generate -- ${piece} ${champion} --apply <response.md>`);
}

function cmdApply({ piece, champion, count, responsePath }) {
  if (!piece || !champion) fail('usage: ... <piece> <championId> --apply <response.md>');
  if (!responsePath || !existsSync(responsePath)) {
    fail(`--apply requires an existing response file: ${responsePath}`);
  }
  const manifest = loadManifestSync(piece);
  const nextIds = computeNextIds(manifest, count);
  const response = readFileSync(responsePath, 'utf8');
  const blocks = parseResponse(response, nextIds);
  const timestamp = new Date().toISOString();

  for (const b of blocks) {
    if (!b.source.includes('@lab-variant')) {
      fail(`block ${b.id}: missing @lab-variant JSDoc header`);
    }
    if (!b.source.includes('export const recipe')) {
      fail(`block ${b.id}: missing 'export const recipe'`);
    }
  }

  const entries = blocks.map((b) => ({
    id: b.id,
    parent: champion,
    hypothesis: extractHypothesis(b.source),
    generatedBy: 'claude-skill',
    generatedAt: timestamp
  }));
  const nextManifest = appendManifest(manifest, entries);

  for (const b of blocks) writeVariantSourceSync(piece, b.id, b.source);
  saveManifestSync(piece, nextManifest);

  const hash = createHash('sha256').update(response).digest('hex').slice(0, 12);
  const logName = writeRoundLog({
    ranAt: timestamp,
    piece,
    champion,
    count: nextIds.length,
    ids: nextIds,
    responseSha256: hash,
    responseExcerpt: response.slice(0, 400)
  });

  console.log(`generate: wrote ${nextIds.length} variants: ${nextIds.join(', ')}`);
  console.log(`generate: appended manifest entries`);
  console.log(`generate: round log -> lab/gan-harness/rounds/${logName}`);
}

async function callLmStudio({ url, model, prompt, temperature, maxTokens }) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
    stream: false
  };
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    fail(`LM Studio request failed: ${err.message} (is the server running on ${url}?)`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    fail(`LM Studio returned ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) fail(`LM Studio response had no message content: ${JSON.stringify(json).slice(0, 400)}`);
  return content;
}

async function cmdLlm(args) {
  const { piece, champion, count } = args;
  if (!piece || !champion) {
    fail('usage: lab:generate <piece> <championId> --llm [--llm-url URL] [--llm-model NAME]');
  }
  const manifest = loadManifestSync(piece);
  if (!manifest.variants.some((v) => v.id === champion)) {
    fail(`champion not in manifest: ${champion}`);
  }
  const championSource = loadVariantSourceSync(piece, champion);
  const nextIds = computeNextIds(manifest, count);
  const timestamp = new Date().toISOString();
  const prompt = buildPrompt({
    template: readGanHarnessFile('generator-prompt.md'),
    spec: readGanHarnessFile('spec.md'),
    rubric: readGanHarnessFile('eval-rubric.md'),
    championId: champion,
    championSource,
    manifest,
    nextIds,
    timestamp
  });

  console.error(`generate: calling ${args.llmUrl} (model=${args.llmModel}, temp=${args.temperature})`);
  const response = await callLmStudio({
    url: args.llmUrl, model: args.llmModel, prompt,
    temperature: args.temperature, maxTokens: args.maxTokens
  });

  // Persist the raw response before any parsing, so a malformed reply is still recoverable.
  const dir = join(LAB_ROOT, 'gan-harness', 'rounds');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const rawStamp = timestamp.replace(/[:.]/g, '-');
  const rawPath = join(dir, `round-${rawStamp}-${champion}-raw.txt`);
  writeFileSync(rawPath, response);
  console.error(`generate: raw response saved -> ${rawPath}`);

  const blocks = parseResponse(response, nextIds);
  for (const b of blocks) {
    if (!b.source.includes('@lab-variant')) fail(`block ${b.id}: missing @lab-variant header`);
    if (!b.source.includes('export const recipe')) fail(`block ${b.id}: missing 'export const recipe'`);
  }

  const entries = blocks.map((b) => ({
    id: b.id,
    parent: champion,
    hypothesis: extractHypothesis(b.source),
    generatedBy: `lm-studio:${args.llmModel}`,
    generatedAt: timestamp
  }));
  const nextManifest = appendManifest(manifest, entries);
  for (const b of blocks) writeVariantSourceSync(piece, b.id, b.source);
  saveManifestSync(piece, nextManifest);

  const hash = createHash('sha256').update(response).digest('hex').slice(0, 12);
  const logName = writeRoundLog({
    ranAt: timestamp,
    piece, champion,
    count: nextIds.length,
    ids: nextIds,
    llmUrl: args.llmUrl,
    llmModel: args.llmModel,
    responseSha256: hash,
    responseExcerpt: response.slice(0, 400)
  });

  console.log(`generate: wrote ${nextIds.length} variants: ${nextIds.join(', ')}`);
  console.log(`generate: appended manifest entries (generatedBy=lm-studio:${args.llmModel})`);
  console.log(`generate: round log -> lab/gan-harness/rounds/${logName}`);
}

const RUN_AS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (RUN_AS_CLI) {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'prompt') cmdPrompt(args);
  else if (args.mode === 'apply') cmdApply(args);
  else if (args.mode === 'llm') await cmdLlm(args);
  else fail(`unknown mode: ${args.mode}`);
}
