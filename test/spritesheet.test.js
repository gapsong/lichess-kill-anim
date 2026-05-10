import assert from 'node:assert/strict';
import test from 'node:test';

import { frameRect } from '../src/spritesheet.js';

test('calculates frame rectangles for a horizontal spritesheet', () => {
  assert.deepEqual(frameRect({ frameWidth: 32, frameHeight: 32 }, 4), {
    sx: 128,
    sy: 0,
    sw: 32,
    sh: 32
  });
});
