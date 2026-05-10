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

test('default pack assigns animated frame sequences per piece role', () => {
  const pawnTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'p' } });
  const bishopTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'b' } });
  const fallbackTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'q' } });

  assert.deepEqual(pawnTimeline.layers[0].frames, [0, 1, 2, 3]);
  assert.deepEqual(bishopTimeline.layers[0].frames, [4, 5, 6, 7]);
  assert.deepEqual(fallbackTimeline.layers[0].frames, [8, 9, 10, 11]);
});
