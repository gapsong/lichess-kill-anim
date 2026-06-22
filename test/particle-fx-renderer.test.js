import assert from 'node:assert/strict';
import test from 'node:test';

import { ParticleFxRenderer } from '../src/particle-fx-renderer.js';

function reFor(attackerPiece, victimPiece) {
  return {
    board: { squareSize: 80 },
    attacker: { piece: attackerPiece },
    victim: { piece: victimPiece, color: 'b', at: { x: 100, y: 100 } }
  };
}

test('signature routing maps each attacker piece to its effect', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('q', 'p')), 'nuke');
  assert.equal(r.effectFor(reFor('n', 'p')), 'slash');
  assert.equal(r.effectFor(reFor('b', 'p')), 'zap');
  assert.equal(r.effectFor(reFor('r', 'p')), 'smash');
  assert.equal(r.effectFor(reFor('p', 'p')), 'pixel');
});

test('captured king routes to ascension regardless of attacker', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('q', 'k')), 'ascension');
});

test('unknown attacker piece falls back to splatter', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor(reFor('x', 'p')), 'splatter');
});

test('play without victim.at returns false and does not throw', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.play({ board: { squareSize: 80 }, victim: {} }), false);
});

test('play spawns particles so activeCount grows then play fires onImpact once (instant mode)', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, onImpact: () => { impacts++; } });
  assert.equal(r.activeCount, 0);
  assert.equal(r.play(reFor('q', 'p')), true);
  assert.ok(r.activeCount > 0);
  assert.equal(impacts, 1);
});

test('buildup delays impact: onImpact fires only after buildupMs', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, buildupMs: 680, onImpact: () => { impacts++; } });
  assert.equal(r.play(reFor('q', 'p'), 1000), true);
  // crosshair spawned + main effect pending, but no impact yet
  assert.equal(impacts, 0);
  assert.ok(r.activeCount > 0);
  // tick before fireAt (1000 + 680 = 1680) -> still no impact
  r.tick(1500, null);
  assert.equal(impacts, 0);
  // tick at/after fireAt -> impact fires
  r.tick(1700, null);
  assert.equal(impacts, 1);
});

test('buildup impact fires exactly once across multiple ticks', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, buildupMs: 680, onImpact: () => { impacts++; } });
  r.play(reFor('q', 'p'), 1000);
  r.tick(1700, null);
  r.tick(1800, null);
  r.tick(1900, null);
  assert.equal(impacts, 1);
});

test('buildupMs default is 0 so impact stays instant', () => {
  let impacts = 0;
  const r = new ParticleFxRenderer({ soundOn: false, onImpact: () => { impacts++; } });
  r.play(reFor('q', 'p'));
  assert.equal(impacts, 1);
});

test('routing override maps attacker pieces to themed effects', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno', r: 'vortex' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'p' } }), 'inferno');
  assert.equal(r.effectFor({ attacker: { piece: 'r' }, victim: { piece: 'p' } }), 'vortex');
});

test('routing override falls back to configured fallback for unmapped pieces', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'b' }, victim: { piece: 'p' } }), 'shatter');
});

test('captured king still wins over routing', () => {
  const r = new ParticleFxRenderer({ soundOn: false, routing: { q: 'inferno' }, fallback: 'shatter' });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'k' } }), 'ascension');
});

test('default routing (null) keeps the built-in SIG table', () => {
  const r = new ParticleFxRenderer({ soundOn: false });
  assert.equal(r.effectFor({ attacker: { piece: 'q' }, victim: { piece: 'p' } }), 'nuke');
});
