/**
 * @lab-variant queen/v003
 * @parent _baseline
 * @hypothesis Schärferer, schnellerer Impact. Tail-Frames um 30% gekürzt,
 *             impact-Ring kompakter (radius -10%). "Whip-Snap" statt "Slow-Bloom".
 * @generatedBy hand
 * @generatedAt 2026-05-28T14:58:00Z
 */

function frame0(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 18, [
    [0, 'rgba(180,100,255,0.50)'],
    [0.5, 'rgba(120,50,200,0.22)'],
    [1, 'rgba(80,0,160,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,80,255,0.42)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
}

function frame1(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 28, [
    [0, 'rgba(210,140,255,0.65)'],
    [0.5, 'rgba(150,70,230,0.30)'],
    [1, 'rgba(90,0,200,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,170,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    spark(ctx, cx, cy, angle, 38, 14, 'rgba(210,150,255,0.75)', 1.8);
  }
}

function frame2(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 22, [
    [0, 'rgba(255,255,255,1)'],
    [0.20, 'rgba(240,200,255,0.95)'],
    [0.65, 'rgba(180,100,255,0.50)'],
    [1, 'rgba(110,30,230,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,255,0.95)';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 24 : 12;
    spark(ctx, cx, cy, angle, 40, len, 'rgba(250,210,255,0.95)', 2.2);
  }
}

function frame3(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 48, [
    [0, 'rgba(80,0,160,0.18)'],
    [0.5, 'rgba(120,40,200,0.10)'],
    [1, 'rgba(80,0,160,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210,150,255,0.90)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 22 : 11;
    var color = (i % 2 === 0) ? 'rgba(220,160,255,0.88)' : 'rgba(180,120,255,0.65)';
    spark(ctx, cx, cy, angle, 48, len, color, (i % 2 === 0) ? 2 : 1.5);
  }
}

function frame4(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 16, 54, [
    [0, 'rgba(100,20,200,0.12)'],
    [0.5, 'rgba(80,10,160,0.07)'],
    [1, 'rgba(60,0,120,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,120,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2;
    spark(ctx, cx, cy, angle, 52, 16, 'rgba(180,120,255,0.50)', 1.5);
  }
}

function frame5(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(160,100,220,0.34)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 5, 4, 26, 46, function(r) {
    return 'rgba(' + Math.floor(140 + r * 60) + ',' + Math.floor(60 + r * 40) + ',255,0.32)';
  });
}

function frame6(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(120,60,200,0.18)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 6, 3, 18, 40, function() { return 'rgba(140,80,220,0.18)'; });
}

function frame7(ctx, cx, cy) {
  ctx.fillStyle = rg(ctx, cx, cy, 0, 38, [
    [0, 'rgba(60,0,100,0.07)'],
    [1, 'rgba(20,0,50,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'shockwave',
  frameCount: 8,
  frameSize: 128,
  drawSize: 84,
  // Tail kürzer: tail-Frames (5..7) ~30% verkürzt. Total: 470 ms (vs 605 baseline).
  frameDurations: [40, 50, 30, 50, 65, 65, 75, 95],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
