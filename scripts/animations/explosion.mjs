// Explosion animation: white flash → fireball peak → smoke dissipation
// 8 frames, variable durations [45,45,60,70,80,90,100,120]ms = 610ms total

function frame0(ctx, cx, cy) {
  // Pure white hit flash — sells the impact moment
  ctx.fillStyle = rg(ctx, cx, cy, 0, 18, [
    [0, 'rgba(255,255,255,1)'],
    [0.55, 'rgba(255,255,200,0.85)'],
    [1, 'rgba(255,220,100,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
}

function frame1(ctx, cx, cy) {
  // Expanding flash — overshoot, sparks begin
  ctx.fillStyle = rg(ctx, cx, cy, 0, 42, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,235,100,0.95)'],
    [0.65, 'rgba(255,150,25,0.65)'],
    [1, 'rgba(255,100,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
  debris(ctx, cx, cy, 1, 5, 38, 52, function(r) {
    return 'rgba(255,' + (200 + Math.floor(r * 55)) + ',60,0.9)';
  });
  sparks(ctx, cx, cy, 1, 4, 30, 50, 'rgba(255,230,80,0.9)', 6, 14);
}

function frame2(ctx, cx, cy) {
  // Peak impact + shockwave ring + many sparks
  ctx.fillStyle = rg(ctx, cx, cy, 0, 54, [
    [0, 'rgba(255,255,255,1)'],
    [0.12, 'rgba(255,235,80,1)'],
    [0.48, 'rgba(255,125,18,0.92)'],
    [0.78, 'rgba(200,38,8,0.52)'],
    [1, 'rgba(140,18,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(255,195,75,0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 61, 0, Math.PI * 2); ctx.stroke();

  debris(ctx, cx, cy, 2, 8, 48, 62, function(r) {
    return 'rgba(255,' + (140 + Math.floor(r * 90)) + ',18,0.9)';
  });
  sparks(ctx, cx, cy, 2, 8, 40, 60, 'rgba(255,220,50,0.85)', 8, 18);
}

function frame3(ctx, cx, cy) {
  // Full fireball — settle after overshoot
  ctx.fillStyle = rg(ctx, cx, cy, 0, 60, [
    [0, 'rgba(255,225,75,1)'],
    [0.28, 'rgba(255,138,18,1)'],
    [0.58, 'rgba(218,58,8,0.88)'],
    [0.84, 'rgba(155,28,4,0.42)'],
    [1, 'rgba(90,18,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
  debris(ctx, cx, cy, 3, 10, 52, 68, function(r) {
    return 'rgba(255,' + (95 + Math.floor(r * 115)) + ',0,0.85)';
  });
  sparks(ctx, cx, cy, 3, 6, 45, 65, 'rgba(255,180,20,0.7)', 5, 12);
}

function frame4(ctx, cx, cy) {
  // Expanding, center fading, smoke edge starts
  ctx.fillStyle = rg(ctx, cx, cy, 6, 64, [
    [0, 'rgba(255,175,38,0.88)'],
    [0.32, 'rgba(218,88,14,0.82)'],
    [0.62, 'rgba(158,38,4,0.62)'],
    [0.88, 'rgba(78,18,4,0.25)'],
    [1, 'rgba(38,8,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = rg(ctx, cx, cy, 18, 66, [
    [0, 'rgba(115,95,85,0)'],
    [0.55, 'rgba(100,78,68,0.12)'],
    [1, 'rgba(78,62,52,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill();

  debris(ctx, cx, cy, 4, 10, 54, 68, function(r) {
    return 'rgba(238,' + (78 + Math.floor(r * 98)) + ',0,0.72)';
  });
}

function frame5(ctx, cx, cy) {
  // Fading fireball, smoke thickening
  ctx.fillStyle = rg(ctx, cx, cy, 8, 60, [
    [0, 'rgba(198,98,18,0.62)'],
    [0.38, 'rgba(148,48,8,0.52)'],
    [0.68, 'rgba(98,28,4,0.32)'],
    [1, 'rgba(55,18,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = rg(ctx, cx, cy, 0, 66, [
    [0, 'rgba(108,88,78,0.22)'],
    [0.48, 'rgba(90,72,62,0.19)'],
    [1, 'rgba(68,55,46,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill();

  debris(ctx, cx, cy, 5, 7, 28, 52, function(r) {
    return 'rgba(255,' + (115 + Math.floor(r * 78)) + ',18,0.75)';
  });
}

function frame6(ctx, cx, cy) {
  // Mostly smoke, faint embers
  ctx.fillStyle = rg(ctx, cx, cy, 0, 58, [
    [0, 'rgba(128,102,88,0.36)'],
    [0.38, 'rgba(108,86,74,0.28)'],
    [0.72, 'rgba(88,70,58,0.16)'],
    [1, 'rgba(68,52,42,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.fill();

  debris(ctx, cx, cy, 6, 5, 18, 42, function(r) {
    return 'rgba(255,148,28,' + (0.28 + r * 0.28) + ')';
  });
}

function frame7(ctx, cx, cy) {
  // Final wisp
  ctx.fillStyle = rg(ctx, cx, cy, 0, 48, [
    [0, 'rgba(118,98,84,0.15)'],
    [0.48, 'rgba(98,80,68,0.09)'],
    [1, 'rgba(78,62,52,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill();

  debris(ctx, cx, cy, 7, 2, 12, 28, function() { return 'rgba(255,158,38,0.2)'; });
}

export const recipe = {
  name: 'explosion',
  frameCount: 8,
  frameSize: 128,
  drawSize: 72,
  frameDurations: [45, 45, 60, 70, 80, 90, 100, 120],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
