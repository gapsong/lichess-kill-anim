// Crosshair / target-lock animation: 6 frames
// appears → tightens → near-lock → RED LOCK → PULSE (heartbeat) → SNAP (fire)
// frameDurations [70,70,80,90,75,55]ms = 440ms total
// Frame 5 (snap) coincides with impact layer start at t=400ms

function frame0(ctx, cx, cy) {
  // Materializes — wide ring, brackets spread, low opacity
  ctx.strokeStyle = 'rgba(160,210,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke();

  drawBrackets(ctx, cx, cy, 40, 13, 1.5, 'rgba(160,210,255,0.72)');

  ctx.fillStyle = 'rgba(190,225,255,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
}

function frame1(ctx, cx, cy) {
  // Tightening — ring shrinks, brackets move in
  ctx.strokeStyle = 'rgba(200,230,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();

  drawBrackets(ctx, cx, cy, 30, 13, 1.5, 'rgba(200,230,255,0.88)');

  ctx.fillStyle = 'rgba(220,240,255,0.8)';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
}

function frame2(ctx, cx, cy) {
  // Near-lock — color shifts toward red, glow starts
  ctx.strokeStyle = 'rgba(255,150,150,0.22)';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,195,195,0.92)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

  drawBrackets(ctx, cx, cy, 22, 11, 2, 'rgba(255,195,195,0.95)');

  ctx.fillStyle = 'rgba(255,230,230,0.92)';
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}

function frame3(ctx, cx, cy) {
  // LOCKED — full red, brackets tight, stays visible (90ms = longest frame)
  ctx.strokeStyle = 'rgba(255,40,40,0.22)';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,55,55,1)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();

  drawBrackets(ctx, cx, cy, 18, 10, 2, 'rgba(255,70,70,1)');

  ctx.fillStyle = 'rgba(255,40,40,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}

function frame4(ctx, cx, cy) {
  // PULSE — ring briefly expands outward (heartbeat), brackets stay locked
  ctx.strokeStyle = 'rgba(255,60,60,0.18)';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,65,65,0.82)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();

  // Brackets stay at locked position (18) — they don't pulse with the ring
  drawBrackets(ctx, cx, cy, 18, 10, 2, 'rgba(255,80,80,0.9)');

  ctx.fillStyle = 'rgba(255,50,50,0.5)';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}

function frame5(ctx, cx, cy) {
  // SNAP / FIRE — ring crushes to minimum, maximum brightness, explosion begins now
  // Large white-red glow burst
  ctx.strokeStyle = 'rgba(255,80,80,0.35)';
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();

  // Crisp bright ring
  ctx.strokeStyle = 'rgba(255,100,100,1)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();

  drawBrackets(ctx, cx, cy, 15, 9, 2.5, 'rgba(255,120,120,1)');

  // Bright center burst
  ctx.fillStyle = 'rgba(255,80,80,0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
}

export const recipe = {
  name: 'crosshair',
  frameCount: 6,
  frameSize: 128,
  drawSize: 96,
  frameDurations: [70, 70, 80, 90, 75, 55],
  frames: [frame0, frame1, frame2, frame3, frame4, frame5]
};
