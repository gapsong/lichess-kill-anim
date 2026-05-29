// 2x2 playground: 4 candidate variants loop in parallel, sharing a start
// time so every canvas hits frame 0 in the same rAF tick.
//
// Re-uses the production sprite renderer. Variant recipes are baked once
// to an offscreen canvas per variant and treated as a "sprite sheet".

import { CanvasSpriteRenderer } from '../../src/canvas-sprite-renderer.js';

const LOOP_GAP_MS = 700;

// Default queen kill timeline used when a variant doesn't override it.
// Mirrors `queen-shockwave` in src/default-animation-pack.js but with
// only the kill layer (no crosshair) so the lab focuses on the impact.
function defaultQueenTimeline(sheetId, recipe) {
  return {
    maxDurationMs: 2200,
    layers: [
      {
        id: 'kill',
        sheet: sheetId,
        frames: recipe.frames.map((_, i) => i),
        frameDurations: recipe.frameDurations,
        keyframes: [
          { t: 0,    ref: 'victim.at', scale: 0.8, alpha: 0 },
          { t: 80,   ref: 'victim.at', scale: 1.1, alpha: 0.85 },
          { t: 220,  ref: 'victim.at', scale: 1.35, alpha: 1 },
          { t: 600,  ref: 'victim.at', scale: 1.5, alpha: 1 },
          { t: 1200, ref: 'victim.at', scale: 2.0, alpha: 0.6 },
          { t: 1800, ref: 'victim.at', scale: 2.6, alpha: 0 }
        ]
      }
    ]
  };
}

function bakeRecipe(recipe) {
  const canvas = document.createElement('canvas');
  canvas.width = recipe.frameCount * recipe.frameSize;
  canvas.height = recipe.frameSize;
  const ctx = canvas.getContext('2d');
  const cx = recipe.frameSize / 2;
  const cy = recipe.frameSize / 2;

  for (let i = 0; i < recipe.frames.length; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * recipe.frameSize, 0, recipe.frameSize, recipe.frameSize);
    ctx.clip();
    ctx.translate(i * recipe.frameSize, 0);
    recipe.frames[i](ctx, cx, cy);
    ctx.restore();
  }

  return canvas;
}

function buildPackFor(variant) {
  const sheetId = variant.id;
  const baked = bakeRecipe(variant.recipe);
  const timeline = variant.timeline ?? defaultQueenTimeline(sheetId, variant.recipe);

  return {
    spritesheets: {
      [sheetId]: {
        image: baked,
        frameWidth: variant.recipe.frameSize,
        frameHeight: variant.recipe.frameSize,
        drawSize: variant.recipe.drawSize
      }
    },
    timelines: { kill: timeline },
    rules: [{ when: {}, timeline: 'kill' }]
  };
}

function createDrawer(pack, context) {
  return function drawSprite(sample) {
    const sheet = pack.spritesheets[sample.sheet];
    if (!sheet) return;
    const sx = sample.frame * sheet.frameWidth;
    const size = sheet.drawSize ?? sheet.frameWidth;

    context.save();
    context.globalAlpha = sample.alpha;
    context.translate(sample.x, sample.y);
    context.rotate(sample.rotation);
    context.scale(sample.scale, sample.scale);
    context.drawImage(
      sheet.image,
      sx, 0, sheet.frameWidth, sheet.frameHeight,
      -size / 2, -size / 2, size, size
    );
    context.restore();
  };
}

function timelineDuration(timeline) {
  let max = 0;
  for (const layer of timeline.layers) {
    for (const kf of layer.keyframes) if (kf.t > max) max = kf.t;
  }
  return Math.min(timeline.maxDurationMs ?? max, max);
}

export function createCellRunner({ canvas, variant, renderEvent }) {
  const boardSize = renderEvent.board.size;
  canvas.width = boardSize;
  canvas.height = boardSize;
  const ctx = canvas.getContext('2d');

  const pack = buildPackFor(variant);
  const drawSprite = createDrawer(pack, ctx);
  const renderer = new CanvasSpriteRenderer({ pack, drawSprite });
  const duration = timelineDuration(pack.timelines.kill);

  return {
    variant,
    canvas,
    duration,
    play(startTime) {
      renderer.play(renderEvent, startTime);
    },
    tick(now) {
      ctx.clearRect(0, 0, boardSize, boardSize);
      renderer.tick(now);
    },
    isIdle() {
      return renderer.activeCount === 0;
    }
  };
}

export function startPlayground({ cells }) {
  let nextStart = performance.now();
  for (const cell of cells) cell.play(nextStart);
  let cycleEnd = nextStart + maxDuration(cells);

  function frame(now) {
    for (const cell of cells) cell.tick(now);

    if (cells.every((c) => c.isIdle()) && now >= cycleEnd + LOOP_GAP_MS) {
      nextStart = now;
      for (const cell of cells) cell.play(nextStart);
      cycleEnd = nextStart + maxDuration(cells);
    }

    handle = requestAnimationFrame(frame);
  }

  let handle = requestAnimationFrame(frame);

  return () => cancelAnimationFrame(handle);
}

function maxDuration(cells) {
  return cells.reduce((m, c) => Math.max(m, c.duration), 0);
}
