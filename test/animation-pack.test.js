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

test('default pack routes knight to dagger-kill timeline', () => {
  const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'n' } });
  assert.deepEqual(timeline.layers.map((l) => l.id), ['crosshair', 'slash']);
});

test('default pack routes queen to queen-shockwave timeline', () => {
  const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'q' } });
  assert.deepEqual(timeline.layers.map((l) => l.id), ['crosshair', 'shockwave']);
});

test('default pack routes rook to rook-impact timeline', () => {
  const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'r' } });
  assert.deepEqual(timeline.layers.map((l) => l.id), ['crosshair', 'impact']);
});

test('default pack routes pawn to pawn-pop timeline', () => {
  const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'p' } });
  assert.deepEqual(timeline.layers.map((l) => l.id), ['crosshair', 'pop']);
});

test('default pack routes king and unknown pieces to kill-impact timeline', () => {
  const kingTimeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'k' } });
  assert.deepEqual(kingTimeline.layers.map((l) => l.id), ['crosshair', 'impact']);
});

test('crosshair is the first layer in every timeline with matching frame durations', () => {
  const pieces = ['q', 'r', 'n', 'b', 'p', 'k'];
  for (const piece of pieces) {
    const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece } });
    assert.equal(timeline.layers[0].id, 'crosshair', `expected crosshair first layer for piece ${piece}`);
    assert.deepEqual(timeline.layers[0].frameDurations, [120, 120, 150, 180, 120, 80]);
  }
});

test('kill-impact impact layer uses all 8 frames with variable durations', () => {
  const timeline = defaultAnimationPack.timelines['kill-impact'];

  assert.deepEqual(timeline.layers[1].frames, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(timeline.layers[1].frameDurations, [60, 80, 120, 160, 200, 240, 280, 360]);
});

test('dagger-kill slash layer uses all 8 frames with variable durations', () => {
  const timeline = selectTimeline(defaultAnimationPack, { attacker: { piece: 'n' } });

  assert.deepEqual(timeline.layers[1].frames, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(timeline.layers[1].frameDurations, [60, 80, 60, 160, 220, 220, 280, 360]);
});
