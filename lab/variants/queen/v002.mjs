/**
 * @lab-variant queen/v002
 * @parent _baseline
 * @hypothesis Wärmere Palette (cyan-magenta statt lila). Royal-violett ist gut,
 *             aber Magenta-Hot-Pink wirkt aggressiver beim Capture.
 * @generatedBy hand
 * @generatedAt 2026-05-28T14:57:00Z
 */

function frame0(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 20, [
    [0, 'rgba(255,100,200,0.50)'],
    [0.5, 'rgba(200,40,160,0.22)'],
    [1, 'rgba(120,0,120,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,120,200,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
}

function frame1(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 32, [
    [0, 'rgba(255,140,220,0.60)'],
    [0.5, 'rgba(220,60,180,0.28)'],
    [1, 'rgba(120,0,140,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,180,230,0.80)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    spark(ctx, cx, cy, angle, 44, 16, 'rgba(255,160,220,0.75)', 1.8);
  }
}

function frame2(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 24, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,200,230,0.92)'],
    [0.70, 'rgba(220,80,180,0.42)'],
    [1, 'rgba(160,20,140,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,240,0.92)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 22 : 10;
    spark(ctx, cx, cy, angle, 44, len, 'rgba(255,210,230,0.92)', 2);
  }
}

function frame3(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 0, 54, [
    [0, 'rgba(140,0,140,0.18)'],
    [0.5, 'rgba(200,40,160,0.10)'],
    [1, 'rgba(120,0,120,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,210,0.88)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    var len = (i % 2 === 0) ? 26 : 13;
    var color = (i % 2 === 0) ? 'rgba(255,170,220,0.85)' : 'rgba(220,90,180,0.65)';
    spark(ctx, cx, cy, angle, 54, len, color, (i % 2 === 0) ? 2 : 1.5);
  }
}

function frame4(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 18, 62, [
    [0, 'rgba(180,20,140,0.14)'],
    [0.5, 'rgba(140,10,120,0.08)'],
    [1, 'rgba(80,0,80,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,120,200,0.62)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(180,60,160,0.22)';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  for (var i = 0; i < 4; i++) {
    var angle = (i / 4) * Math.PI * 2;
    spark(ctx, cx, cy, angle, 60, 20, 'rgba(220,120,200,0.58)', 1.5);
  }
}

function frame5(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rg(ctx, cx, cy, 20, 58, [
    [0, 'rgba(140,10,120,0.10)'],
    [1, 'rgba(80,0,80,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,80,180,0.40)';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 5, 5, 30, 54, function(r) {
    return 'rgba(' + Math.floor(220 + r * 35) + ',' + Math.floor(80 + r * 60) + ',' + Math.floor(180 + r * 40) + ',0.38)';
  });
}

function frame6(ctx, cx, cy) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(160,40,140,0.24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  debris(ctx, cx, cy, 6, 4, 20, 46, function() { return 'rgba(180,60,160,0.22)'; });
}

function frame7(ctx, cx, cy) {
  ctx.fillStyle = rg(ctx, cx, cy, 0, 44, [
    [0, 'rgba(80,0,60,0.10)'],
    [0.5, 'rgba(60,0,50,0.05)'],
    [1, 'rgba(40,0,30,0)']
  ]);
  ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'shockwave',
  frameCount: 8,
  frameSize: 128,
  drawSize: 88,
  frameDurations: [50, 60, 35, 55, 75, 90, 110, 130],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5, frame6, frame7]
};
