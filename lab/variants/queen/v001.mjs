/**
 * @lab-variant queen/v001
 * @parent _baseline
 * @hypothesis Längere Anticipation (frame0 50→120 ms) macht den Impact spürbarer.
 *             Sonst identisch zur Baseline.
 * @generatedBy hand
 * @generatedAt 2026-05-28T14:56:00Z
 */

function frame0(ctx, cx, cy) {
  // Slower, more deliberate void gathering — additional sub-glow for charge feel.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 16, [
    [0, 'rgba(170,90,255,0.30)'],
    [1, 'rgba(80,0,160,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rg(ctx, cx, cy, 0, 22, [
    [0, 'rgba(180,100,255,0.55)'],
    [0.5, 'rgba(120,50,200,0.22)'],
    [1, 'rgba(80,0,160,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,80,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.stroke();
}

function frame1(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 32, [
    [0, 'rgba(200,120,255,0.55)'],
    [0.5, 'rgba(140,60,220,0.25)'],
    [1, 'rgba(80,0,180,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,160,255,0.80)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    spark(ctx, cx, cy, angle, 44, 16, 'rgba(200,140,255,0.70)', 1.8);
  }
}

function frame2(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 24, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(230,180,255,0.90)'],
    [0.70, 'rgba(160,80,255,0.40)'],
    [1, 'rgba(100,20,220,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,255,0.90)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 20 : 10;
    spark(ctx, cx, cy, angle, 44, len, 'rgba(240,200,255,0.90)', 2);
  }
}

function frame3(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 54, [
    [0, 'rgba(80,0,160,0.15)'],
    [0.5, 'rgba(120,40,200,0.08)'],
    [1, 'rgba(80,0,160,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,140,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 26 : 13;
    var color = (i % 2 === 0) ? 'rgba(220,160,255,0.85)' : 'rgba(180,120,255,0.65)';
    spark(ctx, cx, cy, angle, 54, len, color, (i % 2 === 0) ? 2 : 1.5);
  }
}

function frame4(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 18, 62, [
    [0, 'rgba(100,20,200,0.12)'],
    [0.5, 'rgba(80,10,160,0.07)'],
    [1, 'rgba(60,0,120,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,120,255,0.60)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,80,220,0.20)';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2;
    spark(ctx, cx, cy, angle, 60, 20, 'rgba(180,120,255,0.55)', 1.5);
  }
}

function frame5(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 20, 58, [
    [0, 'rgba(80,10,160,0.08)'],
    [1, 'rgba(60,0,120,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,100,220,0.38)';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 5, 5, 30, 54, function(r) {
    return 'rgba(' + Math.floor(140 + r * 60) + ',' + Math.floor(60 + r * 40) + ',255,0.35)';
  });
}

function frame6(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(120,60,200,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 6, 4, 20, 46, function() { return 'rgba(140,80,220,0.20)'; });
}

function frame7(ctx, cx, cy) {
  ctx.fillStyle = rg(ctx, cx, cy, 0, 44, [
    [0, 'rgba(60,0,100,0.08)'],
    [0.5, 'rgba(40,0,80,0.04)'],
    [1, 'rgba(20,0,50,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'shockwave',
  frameCount: 8,
  frameSize: 128,
  drawSize: 88,
  // Longer anticipation: 120 ms hold on frame 0 (was 50). Total: 675 ms.
  frameDurations: [120, 60, 35, 55, 75, 90, 110, 130],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
