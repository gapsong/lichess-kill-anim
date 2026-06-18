// Sword slash: anticipation glint → sweeping arc smear → white impact flash → slash marks → spark burst → ember scatter → blood splat → fade
// 8 frames, variable durations [40, 55, 30, 65, 85, 95, 110, 130]ms = 610ms total

function frame0(ctx, cx, cy) {
  // Anticipation: silver-gold glint at upper-left — blade tip catching light before swing
  var ox = cx - 30, oy = cy - 30;
  ctx.fillStyle = rg(ctx, ox, oy, 0, 14, [
    [0, 'rgba(255,248,215,1)'],
    [0.35, 'rgba(255,235,145,0.72)'],
    [1, 'rgba(255,220,80,0)']
  ]);
  ctx.beginPath(); ctx.arc(ox, oy, 14, 0, Math.PI * 2); ctx.fill();
  // Star flare — 4 short spokes
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (var i = 0; i < 4; i++) {
    var angle = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(ox + Math.cos(angle) * 4, oy + Math.sin(angle) * 4);
    ctx.lineTo(ox + Math.cos(angle) * 10, oy + Math.sin(angle) * 10);
    ctx.stroke();
  }
}

function frame1(ctx, cx, cy) {
  // Sweeping smear: quadratic arc from upper-left to lower-right (sword swing motion)
  var x0 = cx - 44, y0 = cy - 44;
  var x1 = cx + 44, y1 = cy + 44;
  var cpx = cx + 12, cpy = cy - 12;  // slight upward curve, like real sword arc

  // Outer glow (motion blur feel)
  ctx.strokeStyle = 'rgba(255,210,80,0.28)';
  ctx.lineWidth = 38;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cpx, cpy, x1, y1); ctx.stroke();

  // Gradient core smear
  var g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.18, 'rgba(255,240,190,0.65)');
  g.addColorStop(0.52, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.84, 'rgba(255,228,150,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cpx, cpy, x1, y1); ctx.stroke();

  // Bright cutting edge
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cpx, cpy, x1, y1); ctx.stroke();
}

function frame2(ctx, cx, cy) {
  // White impact flash — very short (30ms), maximum brightness, sells the hit
  ctx.fillStyle = rg(ctx, cx, cy, 0, 32, [
    [0, 'rgba(255,255,255,1)'],
    [0.28, 'rgba(255,255,230,0.95)'],
    [0.62, 'rgba(255,240,170,0.55)'],
    [1, 'rgba(255,200,80,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    spark(ctx, cx, cy, angle, 26, 14, 'rgba(255,255,200,0.85)', 2);
  }
}

function frame3(ctx, cx, cy) {
  // Slash marks: two diagonal cut lines + sparks at crossing
  var x0 = cx - 38, y0 = cy - 38, x1 = cx + 38, y1 = cy + 38;
  var x2 = cx - 28, y2 = cy + 22, x3 = cx + 28, y3 = cy - 22;

  var g1 = ctx.createLinearGradient(x0, y0, x1, y1);
  g1.addColorStop(0, 'rgba(255,255,255,0)');
  g1.addColorStop(0.22, 'rgba(255,255,220,0.9)');
  g1.addColorStop(0.58, 'rgba(255,255,255,0.98)');
  g1.addColorStop(0.82, 'rgba(255,245,190,0.7)');
  g1.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = g1;
  ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

  var g2 = ctx.createLinearGradient(x2, y2, x3, y3);
  g2.addColorStop(0, 'rgba(255,220,120,0)');
  g2.addColorStop(0.42, 'rgba(255,220,120,0.72)');
  g2.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.strokeStyle = g2;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();

  sparks(ctx, cx, cy, 3, 7, 12, 26, 'rgba(255,228,80,0.9)', 5, 12);
}

function frame4(ctx, cx, cy) {
  // Spark burst: gold/orange debris + first blood drops
  debris(ctx, cx, cy, 4, 12, 14, 40, function(r) {
    return 'rgba(255,' + (155 + Math.floor(r * 85)) + ',' + Math.floor(r * 28) + ',0.88)';
  });
  debris(ctx, cx, cy, 4, 5, 10, 26, function(r) {
    return 'rgba(' + (170 + Math.floor(r * 24)) + ',' + Math.floor(r * 10) + ',20,0.82)';
  }, 0.18);
  sparks(ctx, cx, cy, 4, 6, 26, 46, 'rgba(255,198,48,0.78)', 5, 13);
}

function frame5(ctx, cx, cy) {
  // Ember scatter: sparks dimming, blood drops elongated mid-flight
  debris(ctx, cx, cy, 5, 7, 22, 48, function(r) {
    return 'rgba(255,' + (118 + Math.floor(r * 82)) + ',22,' + (0.32 + r * 0.38) + ')';
  });
  for (var i = 0; i < 6; i++) {
    var angle = rand(5, i + 80) * Math.PI * 2;
    var dist = 18 + rand(5, i + 81) * 20;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    ctx.rotate(angle);
    ctx.scale(1, 0.38);
    ctx.fillStyle = 'rgba(160,0,16,0.86)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 + rand(5, i + 82) * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function frame6(ctx, cx, cy) {
  // Blood splat lands: drops at distance, dark central pool
  for (var i = 0; i < 7; i++) {
    var angle = rand(6, i + 90) * Math.PI * 2;
    var dist = 38 + rand(6, i + 91) * 24;
    var gBias = 0.44 * rand(6, i + 92) * dist;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist + gBias);
    ctx.scale(1 + rand(6, i + 93) * 1.3, 0.46);
    ctx.fillStyle = 'rgba(' + (74 + Math.floor(rand(6, i + 94) * 28)) + ',0,10,0.66)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 + rand(6, i + 95) * 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(84,0,12,0.30)';
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
}

function frame7(ctx, cx, cy) {
  // Dark fade — near-transparent residue, clean end
  ctx.fillStyle = rg(ctx, cx, cy, 0, 42, [
    [0, 'rgba(66,0,10,0.10)'],
    [0.48, 'rgba(46,0,7,0.05)'],
    [1, 'rgba(26,0,4,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'slash',
  frameCount: 8,
  frameSize: 128,
  drawSize: 84,
  frameDurations: [40, 55, 30, 65, 85, 95, 110, 130],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
