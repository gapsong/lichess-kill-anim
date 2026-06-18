// Hit-Flash: weiße Impact-Silhouette auf dem Opfer-Feld.
// 3 Frames, hart und kurz — verkauft den Treffer (siehe ANIMATION-PRINCIPLES #2).

function frame0(ctx, cx, cy) {
  var s = 38;
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.fillRect(cx - 7, cy - s - 24, 14, 24);
  ctx.fillRect(cx - 7, cy + s, 14, 24);
  ctx.fillRect(cx - s - 24, cy - 7, 24, 14);
  ctx.fillRect(cx + s, cy - 7, 24, 14);
}

function frame1(ctx, cx, cy) {
  var s = 48;
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 14;
  ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(cx - 10, cy - 10, 20, 20);
}

function frame2(ctx, cx, cy) {
  var d = 50;
  var s = 9;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - d - s, cy - d - s, s * 2, s * 2);
  ctx.fillRect(cx + d - s, cy - d - s, s * 2, s * 2);
  ctx.fillRect(cx - d - s, cy + d - s, s * 2, s * 2);
  ctx.fillRect(cx + d - s, cy + d - s, s * 2, s * 2);
}

export const recipe = {
  name: 'flash',
  frameCount: 3,
  frameSize: 128,
  drawSize: 96,
  frameDurations: [50, 45, 60],
  frames: [frame0, frame1, frame2]
};
