// Browser-context utility code injected into every page.evaluate() call.
// Functions here are available to all animation draw frames.
export const SHARED_CODE = `
  function rand(frame, i) {
    const s = Math.sin(frame * 127.1 + i * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function rg(ctx, cx, cy, r0, r1, stops) {
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    stops.forEach(function(stop) { g.addColorStop(stop[0], stop[1]); });
    return g;
  }

  function debris(ctx, cx, cy, frame, count, minDist, maxDist, colorFn, gravity) {
    gravity = gravity || 0;
    for (var i = 0; i < count; i++) {
      var angle = rand(frame, i) * Math.PI * 2;
      var dist = minDist + rand(frame, i + 10) * (maxDist - minDist);
      var gBias = gravity * rand(frame, i + 40) * dist;
      var x = cx + Math.cos(angle) * dist;
      var y = cy + Math.sin(angle) * dist + gBias;
      var r = 1.2 + rand(frame, i + 30) * 2.2;
      ctx.fillStyle = colorFn(rand(frame, i + 20));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function spark(ctx, cx, cy, angle, dist, len, color, lineWidth) {
    lineWidth = lineWidth || 1.5;
    var x1 = cx + Math.cos(angle) * dist;
    var y1 = cy + Math.sin(angle) * dist;
    var x2 = cx + Math.cos(angle) * (dist - len);
    var y2 = cy + Math.sin(angle) * (dist - len);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function sparks(ctx, cx, cy, frame, count, minDist, maxDist, color, lenMin, lenMax) {
    for (var i = 0; i < count; i++) {
      var angle = rand(frame, i + 50) * Math.PI * 2;
      var dist = minDist + rand(frame, i + 60) * (maxDist - minDist);
      var len = lenMin + rand(frame, i + 70) * (lenMax - lenMin);
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
`;
