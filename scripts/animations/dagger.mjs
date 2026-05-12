// Dagger animation: silver glint → blade smear → impact flash → blood burst → spreading drops → dark stain
// 8 frames, variable durations [45,60,45,75,90,90,100,120]ms = 625ms total

function frame0(ctx, cx, cy) {
  // Anticipation: faint silver glint at center
  ctx.fillStyle = rg(ctx, cx, cy, 0, 9, [
    [0, 'rgba(220,235,255,0.85)'],
    [0.5, 'rgba(200,220,255,0.35)'],
    [1, 'rgba(180,210,255,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
}

function frame1(ctx, cx, cy) {
  // Smear: blade in motion — diagonal white/silver band (smear frame implies speed)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  // Outer glow band
  var g = ctx.createLinearGradient(-54, 0, 54, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.18, 'rgba(220,235,255,0.45)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.82)');
  g.addColorStop(0.82, 'rgba(215,232,255,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-54, -13, 108, 26);
  // Bright core streak
  var core = ctx.createLinearGradient(-42, 0, 42, 0);
  core.addColorStop(0, 'rgba(255,255,255,0)');
  core.addColorStop(0.38, 'rgba(255,255,255,0.88)');
  core.addColorStop(0.72, 'rgba(240,248,255,0.6)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(-42, -5, 84, 10);
  ctx.restore();
}

function frame2(ctx, cx, cy) {
  // Impact: tight white burst, precise — small radius means sharp/concentrated hit
  ctx.fillStyle = rg(ctx, cx, cy, 0, 22, [
    [0, 'rgba(255,255,255,1)'],
    [0.38, 'rgba(255,240,235,0.9)'],
    [0.72, 'rgba(255,210,205,0.42)'],
    [1, 'rgba(255,185,175,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();

  // 4 radial sparks at contact point
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    spark(ctx, cx, cy, angle, 22, 11, 'rgba(255,255,220,0.8)', 1.5);
  }
}

function frame3(ctx, cx, cy) {
  // Blood burst: crimson particles radiating outward
  debris(ctx, cx, cy, 3, 14, 12, 32, function(r) {
    return 'rgba(' + (178 + Math.floor(r * 22)) + ',' + Math.floor(r * 14) + ',22,0.92)';
  });
  // Elongated drops in direction of travel
  for (var i = 0; i < 5; i++) {
    var angle = rand(3, i + 80) * Math.PI * 2;
    var dist = 18 + rand(3, i + 81) * 14;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    ctx.rotate(angle);
    ctx.scale(1, 0.38);
    ctx.fillStyle = 'rgba(168,0,18,0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, 3 + rand(3, i + 82) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function frame4(ctx, cx, cy) {
  // Blood drops spreading mid-distance, slight gravity pull
  debris(ctx, cx, cy, 4, 12, 28, 52, function(r) {
    return 'rgba(' + (148 + Math.floor(r * 32)) + ',' + Math.floor(r * 10) + ',18,0.82)';
  }, 0.32);
}

function frame5(ctx, cx, cy) {
  // Fewer drops, darker, decelerating near max distance
  debris(ctx, cx, cy, 5, 8, 40, 65, function(r) {
    return 'rgba(' + (108 + Math.floor(r * 42)) + ',0,12,0.72)';
  }, 0.52);
}

function frame6(ctx, cx, cy) {
  // Splat marks land at max distance, small dark pool at center
  for (var i = 0; i < 6; i++) {
    var angle = rand(6, i + 90) * Math.PI * 2;
    var dist = 42 + rand(6, i + 91) * 20;
    var gBias = 0.48 * rand(6, i + 92) * dist;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist + gBias);
    ctx.scale(1 + rand(6, i + 93) * 1.4, 0.48);
    ctx.fillStyle = 'rgba(' + (78 + Math.floor(rand(6, i + 94) * 30)) + ',0,10,0.68)';
    ctx.beginPath();
    ctx.arc(0, 0, 3 + rand(6, i + 95) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Central pool
  ctx.fillStyle = 'rgba(88,0,12,0.32)';
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
}

function frame7(ctx, cx, cy) {
  // Dark stain — nearly transparent, clean end
  ctx.fillStyle = rg(ctx, cx, cy, 0, 38, [
    [0, 'rgba(72,0,10,0.11)'],
    [0.52, 'rgba(52,0,8,0.05)'],
    [1, 'rgba(32,0,5,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'dagger',
  frameCount: 8,
  frameSize: 128,
  drawSize: 80,
  frameDurations: [45, 60, 45, 75, 90, 90, 100, 120],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
