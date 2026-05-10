import assert from 'node:assert/strict';
import test from 'node:test';

import { sampleLayer } from '../src/timeline.js';

const renderEvent = {
  board: { squareSize: 100 },
  attacker: {
    from: { x: 100, y: 300 },
    to: { x: 300, y: 100 }
  },
  victim: {
    at: { x: 300, y: 100 }
  }
};

test('interpolates keyframe position and visual properties', () => {
  const sample = sampleLayer(
    {
      sheet: 'debug',
      frame: 0,
      keyframes: [
        { t: 0, ref: 'attacker.from', scale: 1, alpha: 1, rotation: 0 },
        { t: 200, ref: 'attacker.to', scale: 2, alpha: 0, rotation: 1 }
      ]
    },
    renderEvent,
    100
  );

  assert.deepEqual(sample, {
    sheet: 'debug',
    frame: 0,
    x: 200,
    y: 200,
    scale: 1.5,
    alpha: 0.5,
    rotation: 0.5
  });
});

test('applies dx and dy as square-unit offsets', () => {
  const sample = sampleLayer(
    {
      sheet: 'debug',
      frame: 2,
      keyframes: [
        { t: 0, ref: 'victim.at', dx: 0.5, dy: -0.25 }
      ]
    },
    renderEvent,
    0
  );

  assert.equal(sample.x, 350);
  assert.equal(sample.y, 75);
});

test('samples animated sprite frames over time', () => {
  const layer = {
    sheet: 'debug',
    frames: [0, 1, 2, 3],
    frameDurationMs: 80,
    keyframes: [
      { t: 0, ref: 'attacker.from' },
      { t: 400, ref: 'attacker.to' }
    ]
  };

  assert.equal(sampleLayer(layer, renderEvent, 0).frame, 0);
  assert.equal(sampleLayer(layer, renderEvent, 79).frame, 0);
  assert.equal(sampleLayer(layer, renderEvent, 80).frame, 1);
  assert.equal(sampleLayer(layer, renderEvent, 160).frame, 2);
  assert.equal(sampleLayer(layer, renderEvent, 240).frame, 3);
  assert.equal(sampleLayer(layer, renderEvent, 320).frame, 0);
});

test('does not sample before the first or after the last keyframe', () => {
  const layer = {
    keyframes: [
      { t: 100, ref: 'victim.at' },
      { t: 200, ref: 'victim.at' }
    ]
  };

  assert.equal(sampleLayer(layer, renderEvent, 99), null);
  assert.equal(sampleLayer(layer, renderEvent, 201), null);
});
