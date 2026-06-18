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
