// Pawn pop: tiny glint → quick expand → sharp flash → ring + sparks → rapid fade
// 8 frames, variable durations [30, 40, 25, 50, 65, 75, 90, 110]ms = 485ms total

function frame0(ctx, cx, cy) {
  // Tiny bright glint
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 8, [
    [0, 'rgba(255,255,200,0.90)'],
    [0.5, 'rgba(255,220,100,0.40)'],
    [1, 'rgba(255,180,50,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function frame1(ctx, cx, cy) {
  // Quick expand
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 20, [
    [0, 'rgba(255,255,200,0.80)'],
    [0.4, 'rgba(255,200,80,0.50)'],
    [1, 'rgba(255,140,20,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  sparks(ctx, cx, cy, 1, 4, 14, 22, 'rgba(255,220,80,0.75)', 5, 10);
}

function frame2(ctx, cx, cy) {
  // Sharp impact flash — very short (25ms), brightest frame
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 22, [
    [0, 'rgba(255,255,255,1)'],
    [0.30, 'rgba(255,240,160,0.85)'],
    [0.70, 'rgba(255,180,60,0.40)'],
    [1, 'rgba(255,120,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    spark(ctx, cx, cy, angle, 18, 10, 'rgba(255,255,200,0.85)', 1.8);
  }
}

function frame3(ctx, cx, cy) {
  // Ring + sparks burst — peak visual complexity
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,200,80,0.70)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  sparks(ctx, cx, cy, 3, 6, 18, 32, 'rgba(255,220,80,0.80)', 5, 12);
  debris(ctx, cx, cy, 3, 6, 12, 28, function(r) {
    return 'rgba(255,' + Math.floor(160 + r * 80) + ',20,0.75)';
  });
}

function frame4(ctx, cx, cy) {
  // Ring expanding + fading, debris spreading
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,180,60,0.45)';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 4, 6, 20, 38, function(r) {
    return 'rgba(255,' + Math.floor(140 + r * 80) + ',18,0.60)';
  });
  sparks(ctx, cx, cy, 4, 4, 24, 38, 'rgba(255,180,40,0.50)', 4, 10);
}

function frame5(ctx, cx, cy) {
  // Dimming ring, sparse debris
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,140,40,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 5, 5, 24, 40, function(r) {
    return 'rgba(255,' + Math.floor(120 + r * 60) + ',0,' + (0.20 + r * 0.25) + ')';
  });
}

function frame6(ctx, cx, cy) {
  // Nearly gone — faint embers
  debris(ctx, cx, cy, 6, 3, 20, 36, function() { return 'rgba(255,140,20,0.18)'; });
}

function frame7(ctx, cx, cy) {
  // Residue — near-transparent
  ctx.fillStyle = rg(ctx, cx, cy, 0, 32, [
    [0, 'rgba(200,100,0,0.06)'],
    [1, 'rgba(180,80,0,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'pop',
  frameCount: 8,
  frameSize: 128,
  drawSize: 72,
  frameDurations: [30, 40, 25, 50, 65, 75, 90, 110],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
