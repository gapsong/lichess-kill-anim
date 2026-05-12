import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { SHARED_CODE } from './animations/shared.mjs';
import { recipe as explosionRecipe } from './animations/explosion.mjs';
import { recipe as daggerRecipe } from './animations/dagger.mjs';
import { recipe as crosshairRecipe } from './animations/crosshair.mjs';
import { recipe as slashRecipe } from './animations/slash.mjs';
import { recipe as shockwaveRecipe } from './animations/shockwave.mjs';
import { recipe as popRecipe } from './animations/pop.mjs';

const RECIPES = [explosionRecipe, daggerRecipe, crosshairRecipe, slashRecipe, shockwaveRecipe, popRecipe];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const results = {};

for (const recipe of RECIPES) {
  const drawFrameCode = '[' + recipe.frames.map((f) => f.toString()).join(',\n') + ']';

  const evalCode = `
    (() => {
      ${SHARED_CODE}

      var FRAME_SIZE = ${recipe.frameSize};
      var FRAME_COUNT = ${recipe.frameCount};
      var cx = FRAME_SIZE / 2;
      var cy = FRAME_SIZE / 2;

      var canvas = document.createElement('canvas');
      canvas.width = FRAME_COUNT * FRAME_SIZE;
      canvas.height = FRAME_SIZE;
      var ctx = canvas.getContext('2d');

      var drawFrame = ${drawFrameCode};

      drawFrame.forEach(function(draw, i) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);
        ctx.clip();
        ctx.translate(i * FRAME_SIZE, 0);
        draw(ctx, cx, cy);
        ctx.restore();
      });

      return canvas.toDataURL('image/png');
    })()
  `;

  const dataUrl = await page.evaluate(evalCode);
  results[recipe.name] = dataUrl.split(',')[1];
  console.log(
    `${recipe.name}: ${recipe.frameCount} × ${recipe.frameSize}px — ${Math.round(results[recipe.name].length / 1024)}KB base64`
  );
}

await browser.close();

let source = readFileSync('src/default-animation-pack.js', 'utf8');

for (const recipe of RECIPES) {
  const placeholder = recipe.name.toUpperCase() + '_IMAGE';
  source = source.replace(placeholder, results[recipe.name]);
}

writeFileSync('src/default-animation-pack.js', source);

console.log('Done — all spritesheets embedded.');
