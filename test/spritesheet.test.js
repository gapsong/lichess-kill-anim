import assert from 'node:assert/strict';
import test from 'node:test';

import { createCanvasSpriteDrawer, frameRect } from '../src/spritesheet.js';

test('calculates frame rectangles for a horizontal spritesheet', () => {
  assert.deepEqual(frameRect({ frameWidth: 32, frameHeight: 32 }, 4), {
    sx: 128,
    sy: 0,
    sw: 32,
    sh: 32
  });
});

test('draws sprites without image smoothing (nearest neighbor)', () => {
  const drawImageCalls = [];
  const context = {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage(...args) {
      drawImageCalls.push(args);
    }
  };

  const drawSprite = createCanvasSpriteDrawer({
    context,
    pack: {
      spritesheets: {
        fx: { image: 'data:image/png;base64,x', frameWidth: 32, frameHeight: 32, drawSize: 96 }
      }
    },
    loadImage: () => ({ complete: true })
  });

  drawSprite({ sheet: 'fx', frame: 1, x: 50, y: 50, scale: 1, rotation: 0, alpha: 1 });

  assert.equal(context.imageSmoothingEnabled, false);
  assert.equal(drawImageCalls.length, 1);
});
