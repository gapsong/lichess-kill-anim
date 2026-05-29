// Lab-runtime helpers used by variant recipes.
//
// Variants are imported as ES modules but their frame functions reference
// `rand`, `rg`, `spark`, `sparks`, `debris`, `drawBrackets` as free
// identifiers. In production these are injected as a code string by
// `scripts/generate-spritesheet.mjs`. In the lab we install the same
// helpers on `window` once at boot so the recipes resolve them.

function rand(frame, i) {
  const s = Math.sin(frame * 127.1 + i * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rg(ctx, cx, cy, r0, r1, stops) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  stops.forEach((stop) => g.addColorStop(stop[0], stop[1]));
  return g;
}

function debris(ctx, cx, cy, frame, count, minDist, maxDist, colorFn, gravity) {
  gravity = gravity || 0;
  for (let i = 0; i < count; i++) {
    const angle = rand(frame, i) * Math.PI * 2;
    const dist = minDist + rand(frame, i + 10) * (maxDist - minDist);
    const gBias = gravity * rand(frame, i + 40) * dist;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist + gBias;
    const r = 1.2 + rand(frame, i + 30) * 2.2;
    ctx.fillStyle = colorFn(rand(frame, i + 20));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spark(ctx, cx, cy, angle, dist, len, color, lineWidth) {
  lineWidth = lineWidth || 1.5;
  const x1 = cx + Math.cos(angle) * dist;
  const y1 = cy + Math.sin(angle) * dist;
  const x2 = cx + Math.cos(angle) * (dist - len);
  const y2 = cy + Math.sin(angle) * (dist - len);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function sparks(ctx, cx, cy, frame, count, minDist, maxDist, color, lenMin, lenMax) {
  for (let i = 0; i < count; i++) {
    const angle = rand(frame, i + 50) * Math.PI * 2;
    const dist = minDist + rand(frame, i + 60) * (maxDist - minDist);
    const len = lenMin + rand(frame, i + 70) * (lenMax - lenMin);
    spark(ctx, cx, cy, angle, dist, len, color);
  }
}

function drawBrackets(ctx, cx, cy, dist, size, lineWidth, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(cx - dist, cy - dist + size); ctx.lineTo(cx - dist, cy - dist); ctx.lineTo(cx - dist + size, cy - dist);
  ctx.moveTo(cx + dist - size, cy - dist); ctx.lineTo(cx + dist, cy - dist); ctx.lineTo(cx + dist, cy - dist + size);
  ctx.moveTo(cx - dist, cy + dist - size); ctx.lineTo(cx - dist, cy + dist); ctx.lineTo(cx - dist + size, cy + dist);
  ctx.moveTo(cx + dist - size, cy + dist); ctx.lineTo(cx + dist, cy + dist); ctx.lineTo(cx + dist, cy + dist - size);
  ctx.stroke();
}

export function installSharedHelpers(target = globalThis) {
  target.rand = rand;
  target.rg = rg;
  target.debris = debris;
  target.spark = spark;
  target.sparks = sparks;
  target.drawBrackets = drawBrackets;
}
