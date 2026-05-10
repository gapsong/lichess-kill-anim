import assert from 'node:assert/strict';
import test from 'node:test';

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
