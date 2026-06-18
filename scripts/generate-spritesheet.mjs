import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { SHARED_CODE } from './animations/shared.mjs';
import { recipe as explosionRecipe } from './animations/explosion.mjs';
import { recipe as daggerRecipe } from './animations/dagger.mjs';
import { recipe as crosshairRecipe } from './animations/crosshair.mjs';
import { recipe as slashRecipe } from './animations/slash.mjs';
import { recipe as shockwaveRecipe } from './animations/shockwave.mjs';
import { recipe as popRecipe } from './animations/pop.mjs';
import { recipe as flashRecipe } from './animations/flash.mjs';

const RECIPES = [
  explosionRecipe,
  daggerRecipe,
  crosshairRecipe,
  slashRecipe,
  shockwaveRecipe,
  popRecipe,
  flashRecipe
];

// Pixelate-Pass: Frames werden auf einem logischen Pixel-Grid quantisiert,
// damit der Look zu handgezeichneter Pixel-Art passt (hartes Alpha, Paletten-Ramp).
// Die Strips werden in niedriger Aufloesung gespeichert; der Drawer skaliert
// mit imageSmoothingEnabled=false (nearest neighbor) auf drawSize hoch.
const DEFAULT_PIXEL_GRID = 32;
const DEFAULT_ALPHA_CUTOFF = 48;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

mkdirSync('artifacts/spritesheets', { recursive: true });

const results = {};

for (const recipe of RECIPES) {
  const drawFrameCode = '[' + recipe.frames.map((f) => f.toString()).join(',\n') + ']';

  const evalCode = `
    (() => {
      ${SHARED_CODE}

      var FRAME_SIZE = ${recipe.frameSize};
      var FRAME_COUNT = ${recipe.frameCount};
      var PIXEL_GRID = ${recipe.pixelGrid ?? DEFAULT_PIXEL_GRID};
      var ALPHA_CUTOFF = ${recipe.alphaCutoff ?? DEFAULT_ALPHA_CUTOFF};
      var PALETTE = ${JSON.stringify(recipe.palette ?? null)};
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

      function scaleTo(source, width, height) {
        var c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        var x = c.getContext('2d');
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = 'high';
        x.drawImage(source, 0, 0, width, height);
        return c;
      }

      var stage = canvas;
      while (stage.height / 2 >= PIXEL_GRID * 2) {
        stage = scaleTo(stage, stage.width / 2, stage.height / 2);
      }
      var small = scaleTo(stage, FRAME_COUNT * PIXEL_GRID, PIXEL_GRID);

      var sctx = small.getContext('2d');
      var image = sctx.getImageData(0, 0, small.width, small.height);
      var data = image.data;

      var palette = PALETTE && PALETTE.map(function (hex) {
        return [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16)
        ];
      });

      function posterize(value) {
        return Math.round(value / 85) * 85;
      }

      for (var p = 0; p < data.length; p += 4) {
        if (data[p + 3] < ALPHA_CUTOFF) {
          data[p] = data[p + 1] = data[p + 2] = data[p + 3] = 0;
          continue;
        }
        data[p + 3] = 255;
        if (palette) {
          var best = 0;
          var bestDist = Infinity;
          for (var c = 0; c < palette.length; c++) {
            var dr = data[p] - palette[c][0];
            var dg = data[p + 1] - palette[c][1];
            var db = data[p + 2] - palette[c][2];
            var dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
              bestDist = dist;
              best = c;
            }
          }
          data[p] = palette[best][0];
          data[p + 1] = palette[best][1];
          data[p + 2] = palette[best][2];
        } else {
          data[p] = posterize(data[p]);
          data[p + 1] = posterize(data[p + 1]);
          data[p + 2] = posterize(data[p + 2]);
        }
      }

      sctx.putImageData(image, 0, 0);

      var preview = document.createElement('canvas');
      preview.width = small.width * 4;
      preview.height = small.height * 4;
      var pctx = preview.getContext('2d');
      pctx.fillStyle = '#3a3a3a';
      pctx.fillRect(0, 0, preview.width, preview.height);
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(small, 0, 0, preview.width, preview.height);

      return {
        strip: small.toDataURL('image/png'),
        preview: preview.toDataURL('image/png'),
        pixelGrid: PIXEL_GRID
      };
    })()
  `;

  const { strip, preview, pixelGrid } = await page.evaluate(evalCode);
  const base64 = strip.split(',')[1];
  results[recipe.name] = { base64, pixelGrid };

  writeFileSync(`artifacts/spritesheets/${recipe.name}.png`, Buffer.from(base64, 'base64'));
  writeFileSync(
    `artifacts/spritesheets/${recipe.name}@4x.png`,
    Buffer.from(preview.split(',')[1], 'base64')
  );

  console.log(
    `${recipe.name}: ${recipe.frameCount} × ${pixelGrid}px — ${Math.round(base64.length / 1024)}KB base64`
  );
}

await browser.close();

let source = readFileSync('src/default-animation-pack.js', 'utf8');

for (const recipe of RECIPES) {
  const { base64, pixelGrid } = results[recipe.name];

  const block = [
    `${recipe.name}: {`,
    `      image: "data:image/png;base64,${base64}",`,
    `      frameWidth: ${pixelGrid},`,
    `      frameHeight: ${pixelGrid},`,
    `      frames: ${recipe.frameCount},`,
    `      drawSize: ${recipe.drawSize}`,
    `    }`
  ].join('\n');

  const pattern = new RegExp(`${recipe.name}: \\{[^}]*\\}`);
  if (!pattern.test(source)) {
    throw new Error(`spritesheet block not found in pack: ${recipe.name}`);
  }
  source = source.replace(pattern, () => block);
}

writeFileSync('src/default-animation-pack.js', source);

console.log('Done — all pixelated spritesheets embedded.');
