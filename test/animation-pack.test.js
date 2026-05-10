import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultAnimationPack } from '../src/default-animation-pack.js';
import { selectTimeline } from '../src/animation-pack.js';

test('selects the first matching timeline rule', () => {
  const pack = {
    rules: [
      { when: { attacker: { piece: 'p' } }, timeline: 'pawn' },
      { when: { attacker: { piece: '*' } }, timeline: 'fallback' }
    ],
    timelines: {
      pawn: { layers: [] },
      fallback: { layers: [] }
    }
  };

  assert.equal(selectTimeline(pack, { attacker: { piece: 'p' } }), pack.timelines.pawn);
  assert.equal(selectTimeline(pack, { attacker: { piece: 'n' } }), pack.timelines.fallback);
});

test('default pack maps bishops to slash and pawns to attacker movement', () => {
  const bishopTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'b' } });
  const pawnTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'p' } });

  assert.deepEqual(bishopTimeline.layers.map((layer) => layer.id), ['slash']);
  assert.deepEqual(pawnTimeline.layers.map((layer) => layer.id), ['attacker']);
});
