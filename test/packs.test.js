import assert from 'node:assert/strict';
import test from 'node:test';

import { EFFECTS, PACKS, getPack, resolvePack } from '../src/packs.js';

test('signature pack resolves to default routing', () => {
  assert.deepEqual(resolvePack('signature'), { mode: 'signature', routing: null, fallback: 'splatter' });
});

test('single pack resolves mode to its effect', () => {
  assert.deepEqual(resolvePack('inferno'), { mode: 'inferno', routing: null, fallback: 'splatter' });
});

test('theme pack resolves to signature mode with its routing + fallback', () => {
  const r = resolvePack('fire');
  assert.equal(r.mode, 'signature');
  assert.equal(r.fallback, 'inferno');
  assert.equal(r.routing.q, 'inferno');
  assert.equal(r.routing.k, 'ascension');
});

test('unknown packId falls back to signature', () => {
  assert.deepEqual(resolvePack('does-not-exist'), resolvePack('signature'));
});

test('getPack returns the pack or null', () => {
  assert.equal(getPack('void').kind, 'theme');
  assert.equal(getPack('nope'), null);
});

test('every theme routing references only known effects', () => {
  for (const pack of PACKS.filter((p) => p.kind === 'theme')) {
    for (const effect of Object.values(pack.routing)) {
      assert.ok(EFFECTS.includes(effect), `${pack.id} routes to unknown effect ${effect}`);
    }
    assert.ok(EFFECTS.includes(pack.fallback), `${pack.id} fallback ${pack.fallback} unknown`);
  }
});

test('every single pack references a known effect', () => {
  for (const pack of PACKS.filter((p) => p.kind === 'single')) {
    assert.ok(EFFECTS.includes(pack.effect));
  }
});
