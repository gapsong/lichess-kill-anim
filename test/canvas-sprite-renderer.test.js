import assert from 'node:assert/strict';
import test from 'node:test';

import { CanvasSpriteRenderer } from '../src/canvas-sprite-renderer.js';

const renderEvent = {
  board: { squareSize: 100 },
  attacker: {
    piece: 'p',
    from: { x: 100, y: 300 },
    to: { x: 300, y: 100 }
  },
  victim: {
    at: { x: 300, y: 100 }
  }
};

test('plays and ticks visible timeline layers', () => {
  const drawCalls = [];
  const renderer = new CanvasSpriteRenderer({
    pack: {
      rules: [{ when: { attacker: { piece: '*' } }, timeline: 'default' }],
      timelines: {
        default: {
          layers: [
            {
              sheet: 'debug',
              frame: 0,
              keyframes: [
                { t: 0, ref: 'attacker.from', alpha: 1 },
                { t: 100, ref: 'attacker.to', alpha: 0 }
              ]
            }
          ]
        }
      }
    },
    drawSprite: (sample) => drawCalls.push(sample)
  });

  renderer.play(renderEvent, 1000);

  assert.equal(renderer.activeCount, 1);

  renderer.tick(1050);

  assert.equal(drawCalls.length, 1);
  assert.equal(drawCalls[0].x, 200);
  assert.equal(drawCalls[0].y, 200);
  assert.equal(drawCalls[0].alpha, 0.5);

  renderer.tick(1101);

  assert.equal(renderer.activeCount, 0);
});

test('supports parallel animations', () => {
  const drawCalls = [];
  const renderer = new CanvasSpriteRenderer({
    pack: {
      rules: [{ when: { attacker: { piece: '*' } }, timeline: 'default' }],
      timelines: {
        default: {
          layers: [
            {
              sheet: 'debug',
              frame: 0,
              keyframes: [
                { t: 0, ref: 'victim.at' },
                { t: 100, ref: 'victim.at' }
              ]
            }
          ]
        }
      }
    },
    drawSprite: () => drawCalls.push('draw')
  });

  renderer.play(renderEvent, 0);
  renderer.play(renderEvent, 0);
  renderer.tick(50);

  assert.equal(renderer.activeCount, 2);
  assert.equal(drawCalls.length, 2);
});

test('fires onImpact once when elapsed time crosses impactAtMs', () => {
  const impacts = [];
  const renderer = new CanvasSpriteRenderer({
    pack: {
      rules: [{ when: { attacker: { piece: '*' } }, timeline: 'default' }],
      timelines: {
        default: {
          impactAtMs: 100,
          layers: [
            {
              sheet: 'debug',
              frame: 0,
              keyframes: [
                { t: 0, ref: 'victim.at', alpha: 1 },
                { t: 300, ref: 'victim.at', alpha: 0 }
              ]
            }
          ]
        }
      }
    },
    drawSprite: () => {},
    onImpact: (event, timeline) => impacts.push(timeline.impactAtMs)
  });

  renderer.play(renderEvent, 1000);

  renderer.tick(1050);
  assert.equal(impacts.length, 0);

  renderer.tick(1150);
  assert.equal(impacts.length, 1);

  renderer.tick(1200);
  assert.equal(impacts.length, 1);
});
