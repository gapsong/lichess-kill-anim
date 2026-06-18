import assert from 'node:assert/strict';
import test from 'node:test';

import { shakeElement } from '../src/board-shake.js';

test('offsets the element while shaking and restores the base transform', () => {
  let time = 0;
  const frames = [];
  const element = { style: { transform: 'rotate(1deg)' } };

  shakeElement(element, {
    amplitude: 4,
    durationMs: 100,
    requestFrame: (callback) => frames.push(callback),
    now: () => time,
    random: () => 1
  });

  assert.equal(frames.length, 1);

  time = 50;
  frames.shift()();
  assert.equal(element.style.transform, 'rotate(1deg) translate(2.0px, 2.0px)');
  assert.equal(frames.length, 1);

  time = 120;
  frames.shift()();
  assert.equal(element.style.transform, 'rotate(1deg)');
  assert.equal(frames.length, 0);
});

test('does nothing without an element or frame scheduler', () => {
  shakeElement(null, { requestFrame: () => {} });
  shakeElement({ style: {} }, { requestFrame: undefined });
});
