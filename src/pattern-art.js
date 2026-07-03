import { boardLocalSquareCenter } from './board-geometry.js';

const FILES = 'abcdefgh';

// Themes recolour the highlights (own side / opponent) and the bright accent used
// by flashes and micro-sparks, so the same animation reads differently per theme.
export const PATTERN_THEMES = [
  { id: 'classic', label: 'Classic', own: '#3bd17a', enemy: '#e5564b', spark: '#ffffff' },
  { id: 'fire', label: 'Fire', own: '#ffb347', enemy: '#ff5757', spark: '#fff1c0' },
  { id: 'void', label: 'Void', own: '#b98cff', enemy: '#ff66d8', spark: '#ffffff' },
  { id: 'ice', label: 'Ice', own: '#6fe6ff', enemy: '#ff8aa6', spark: '#eafcff' },
  { id: 'gold', label: 'Gold', own: '#ffd76a', enemy: '#c8893a', spark: '#fff6d8' }
];

const center = (square, size, blackO) => boardLocalSquareCenter(square, size, blackO);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
// bottom of the board is the viewer's side; that side is 'w' unless the board is flipped.
const colorFor = (pattern, theme, blackO) => (pattern.side === (blackO ? 'b' : 'w') ? theme.own : theme.enemy);

// Screen-space y direction (toward the enemy) for a pawn/piece on `square`, correct
// for either board orientation — derived from where the square ahead actually sits.
function forwardDir(square, side, size, blackO) {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]);
  const aheadR = r + (side === 'w' ? 1 : -1);
  if (aheadR < 1 || aheadR > 8) return (side === 'w' ? -1 : 1) * (blackO ? -1 : 1);
  const here = center(square, size, blackO);
  const ahead = center(`${FILES[f]}${aheadR}`, size, blackO);
  return Math.sign(ahead.y - here.y) || -1;
}

/* ---------- shared FX ---------- */
function squareGlow(ctx, p, sq, color, now, phase = 0) {
  const pulse = 0.55 + 0.45 * Math.sin(now / 330 + phase);
  cornerTicks(ctx, p.x, p.y, sq, color, {
    hs: sq / 2 - sq * 0.1, len: sq * 0.16, lw: Math.max(2, sq * 0.06),
    alpha: 0.4 + 0.5 * pulse, blur: sq * (0.2 + 0.35 * pulse)
  });
}

function cornerTicks(ctx, x, y, sq, color, { hs, len, lw, alpha, blur }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cx = x + sx * hs, cy = y + sy * hs;
      ctx.beginPath();
      ctx.moveTo(cx - sx * len, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - sy * len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function microSparks(ctx, x, y, sq, color, now, count = 6, spread = 0.5, intensity = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.12;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const ang = now / 900 + i * 2.39963;
    const rad = sq * spread * (0.35 + 0.65 * ((Math.sin(now / 680 + i * 1.7) + 1) / 2));
    const tw = 0.35 + 0.65 * ((Math.sin(now / 190 + i * 3.1) + 1) / 2);
    ctx.globalAlpha = 0.22 * tw * intensity;
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, Math.max(0.5, sq * 0.026 * tw), 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}

function energyBolt(ctx, from, to, sq, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.4;
  ctx.lineWidth = Math.max(2, sq * 0.07);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/* ---------- 🛡️ Fianchetto ---------- */
function drawShield(ctx, cx, cy, sq, color, bulge, scale, alpha) {
  const w = sq * 1.5;
  const h = sq * 1.05 * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, sq * 0.08);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.5;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(0, bulge * h * 1.4, w, 0);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.16;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.restore();
}

function drawLaser(ctx, a, b, sq, color, spark, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.6 * intensity;
  ctx.globalAlpha = intensity;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.14 * intensity);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = spark;
  ctx.globalAlpha = intensity * 0.9;
  ctx.lineWidth = Math.max(1, sq * 0.05);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.fillStyle = spark;
  ctx.beginPath(); ctx.arc(a.x, a.y, sq * 0.18 * intensity, 0, 6.2832); ctx.fill();
  ctx.restore();
}

function drawFianchetto(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const bsq = pattern.squares[0];
  const bf = bsq.charCodeAt(0) - 97;
  const br = Number(bsq[1]);
  const c = center(bsq, size, blackO);
  const dir = forwardDir(bsq, pattern.side, size, blackO);
  const cyc = (now % 2000) / 2000;
  const pop = cyc < 0.12 ? easeOutBack(clamp01(cyc / 0.12)) : 1;
  const breathe = 0.94 + 0.06 * Math.sin(now / 300);
  drawShield(ctx, c.x, c.y, sq, color, dir, pop * breathe, Math.min(1, pop));
  microSparks(ctx, c.x, c.y + dir * sq * 0.7, sq, theme.spark, now, 7, 0.7, 0.8);
  if (cyc > 0.35 && cyc < 0.62) {
    const intensity = Math.sin(((cyc - 0.35) / 0.27) * Math.PI);
    const df = bf < 4 ? 1 : -1;
    const dr = pattern.side === 'w' ? 1 : -1;
    let ef = bf, er = br;
    while (ef + df >= 0 && ef + df < 8 && er + dr >= 1 && er + dr <= 8) { ef += df; er += dr; }
    drawLaser(ctx, c, center(`${FILES[ef]}${er}`, size, blackO), sq, color, theme.spark, intensity);
    microSparks(ctx, c.x, c.y, sq, theme.spark, now, 5, 0.4, intensity);
  }
}

/* ---------- 🏰 King fortress ---------- */
function drawWall(ctx, cx, baseY, sq, color, dir, scale, alpha) {
  const halfW = sq * 1.15;
  const h = sq * 0.8 * scale;
  const topY = baseY + dir * h;
  const merlon = sq * 0.18;
  const segments = 7;
  const segW = (halfW * 2) / segments;
  const leftX = cx - halfW, rightX = cx + halfW;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.06);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.4;
  ctx.beginPath();
  ctx.moveTo(leftX, baseY);
  ctx.lineTo(leftX, topY);
  for (let i = 0; i < segments; i++) {
    const x0 = leftX + i * segW;
    const x1 = x0 + segW;
    if (i % 2 === 0) {
      ctx.lineTo(x0, topY + dir * merlon);
      ctx.lineTo(x1, topY + dir * merlon);
      ctx.lineTo(x1, topY);
    } else {
      ctx.lineTo(x1, topY);
    }
  }
  ctx.lineTo(rightX, baseY);
  ctx.globalAlpha = alpha * 0.13;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.restore();
}

function drawFortress(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const k = center(pattern.squares[0], size, blackO);
  const pawnY = center(pattern.squares[1], size, blackO).y;
  const dir = Math.sign(pawnY - k.y) || -1;
  const baseY = (k.y + pawnY) / 2;
  const cyc = (now % 2200) / 2200;
  const pop = cyc < 0.12 ? easeOutBack(clamp01(cyc / 0.12)) : 1;
  const breathe = 0.96 + 0.04 * Math.sin(now / 320);
  drawWall(ctx, k.x, baseY, sq, color, dir, pop * breathe, Math.min(1, pop));
  for (const s of pattern.squares) squareGlow(ctx, center(s, size, blackO), sq, color, now);
  microSparks(ctx, k.x, baseY + dir * sq * 0.6, sq, theme.spark, now, 7, 0.9, 0.6);
}

/* ---------- 🏰 Doubled/connected rooks ---------- */
function drawRooks(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const a = center(pattern.line.from, size, blackO);
  const b = center(pattern.line.to, size, blackO);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const cyc = (now % 1700) / 1700;
  squareGlow(ctx, a, sq, color, now);
  squareGlow(ctx, b, sq, color, now, 1.4);
  if (cyc < 0.42) {
    const p = cyc / 0.42;
    energyBolt(ctx, a, { x: a.x + (mid.x - a.x) * p, y: a.y + (mid.y - a.y) * p }, sq, color);
    energyBolt(ctx, b, { x: b.x + (mid.x - b.x) * p, y: b.y + (mid.y - b.y) * p }, sq, color);
  } else {
    const p = (cyc - 0.42) / 0.58;
    const flash = Math.max(0, 1 - p * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.4;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 250);
    ctx.lineWidth = Math.max(2, sq * 0.13);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = theme.spark;
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.8 * flash;
      ctx.globalAlpha = flash;
      ctx.beginPath(); ctx.arc(mid.x, mid.y, sq * 0.1 + sq * 0.3 * flash, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    const gp = (now / 700) % 1;
    microSparks(ctx, a.x + (b.x - a.x) * gp, a.y + (b.y - a.y) * gp, sq, theme.spark, now, 3, 0.18);
  }
}

/* ---------- 💥 Battery ---------- */
function drawBattery(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const a = center(pattern.line.from, size, blackO);
  const b = center(pattern.line.to, size, blackO);
  squareGlow(ctx, a, sq, color, now);
  squareGlow(ctx, b, sq, color, now, 1.0);
  const cyc = (now % 1500) / 1500;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
  if (cyc < 0.7) {
    const p = cyc / 0.7;
    const hx = a.x + (b.x - a.x) * p, hy = a.y + (b.y - a.y) * p;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.6;
    ctx.globalAlpha = 0.4 + 0.6 * p;
    ctx.beginPath(); ctx.arc(hx, hy, sq * (0.08 + 0.06 * p), 0, 6.2832); ctx.fill();
    ctx.restore();
    microSparks(ctx, hx, hy, sq, theme.spark, now, 4, 0.25, p);
  } else {
    const p = (cyc - 0.7) / 0.3;
    const f = Math.max(0, 1 - p);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.8 * f;
    ctx.globalAlpha = f;
    ctx.strokeStyle = theme.spark;
    ctx.lineWidth = Math.max(2, sq * 0.16 * f);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, sq * 0.06);
    for (const c of [a, b]) {
      ctx.globalAlpha = f * 0.8;
      ctx.beginPath(); ctx.arc(c.x, c.y, sq * (0.3 + 0.5 * p), 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
    microSparks(ctx, b.x, b.y, sq, theme.spark, now, 8, 0.6, f);
  }
}

/* ---------- 🔒 Pin ---------- */
function lockBrackets(ctx, cx, cy, sq, color, close) {
  const gap = sq * (0.62 - 0.18 * close);
  const len = sq * 0.2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.05);
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.25;
  for (let q = 0; q < 4; q++) {
    const sx = q < 2 ? -1 : 1;
    const sy = (q % 2 === 0) ? -1 : 1;
    const x = cx + sx * gap, y = cy + sy * gap;
    ctx.beginPath();
    ctx.moveTo(x, y - sy * len); ctx.lineTo(x, y); ctx.lineTo(x - sx * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPin(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const att = center(pattern.squares[0], size, blackO);
  const pinned = center(pattern.squares[1], size, blackO);
  const target = center(pattern.squares[2], size, blackO);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.045);
  ctx.lineCap = 'round';
  ctx.setLineDash([sq * 0.13, sq * 0.1]);
  ctx.lineDashOffset = -((now / 35) % 1000);
  ctx.beginPath(); ctx.moveTo(att.x, att.y); ctx.lineTo(target.x, target.y); ctx.stroke();
  ctx.restore();
  squareGlow(ctx, target, sq, color, now, 1.0);
  const cyc = (now % 1600) / 1600;
  const close = cyc < 0.5 ? easeOutBack(clamp01(cyc / 0.3)) : 1;
  const shake = (cyc > 0.3 && cyc < 0.5) ? Math.sin(now / 28) * sq * 0.025 : 0;
  lockBrackets(ctx, pinned.x + shake, pinned.y, sq, color, close);
  if (close > 0.9) microSparks(ctx, pinned.x, pinned.y, sq, theme.spark, now, 4, 0.45, 0.8);
}

/* ---------- 🗡️ Skewer ---------- */
function drawSkewer(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const att = center(pattern.squares[0], size, blackO);
  const back = center(pattern.squares[2], size, blackO);
  const cyc = (now % 1200) / 1200;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(att.x, att.y); ctx.lineTo(back.x, back.y); ctx.stroke();
  ctx.restore();
  if (cyc < 0.5) {
    const p = clamp01(cyc / 0.5);
    const hx = att.x + (back.x - att.x) * p, hy = att.y + (back.y - att.y) * p;
    const tp = Math.max(0, p - 0.3);
    const tx = att.x + (back.x - att.x) * tp, ty = att.y + (back.y - att.y) * tp;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.5;
    ctx.lineWidth = Math.max(2, sq * 0.1);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = theme.spark;
    ctx.beginPath(); ctx.arc(hx, hy, sq * 0.12, 0, 6.2832); ctx.fill();
    ctx.restore();
    microSparks(ctx, hx, hy, sq, theme.spark, now, 4, 0.2, 1);
  } else if (cyc < 0.72) {
    const f = 1 - (cyc - 0.5) / 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = theme.spark;
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.8 * f;
    ctx.globalAlpha = f;
    ctx.beginPath(); ctx.arc(back.x, back.y, sq * 0.15 + sq * 0.25 * (1 - f), 0, 6.2832); ctx.fill();
    ctx.restore();
    microSparks(ctx, back.x, back.y, sq, theme.spark, now, 6, 0.45, f);
  }
}

/* ---------- 🚩 Outpost ---------- */
function drawOutpost(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const c = center(pattern.squares[0], size, blackO);
  const cyc = (now % 2200) / 2200;
  const pulse = (cyc % 0.5) / 0.5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5 * (1 - pulse);
  ctx.lineWidth = Math.max(1, sq * 0.05);
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.3;
  ctx.beginPath(); ctx.arc(c.x, c.y, sq * 0.35 + sq * 0.35 * pulse, 0, 6.2832); ctx.stroke();
  ctx.restore();
  const rise = cyc < 0.15 ? easeOutBack(clamp01(cyc / 0.15)) : 1;
  const poleH = sq * 0.72 * rise;
  const px = c.x + sq * 0.28, py = c.y - sq * 0.1;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.05);
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.2;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - poleH); ctx.stroke();
  const wave = Math.sin(now / 180) * sq * 0.05;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.92 * rise;
  ctx.beginPath();
  ctx.moveTo(px, py - poleH);
  ctx.lineTo(px - sq * 0.32, py - poleH + sq * 0.1 + wave);
  ctx.lineTo(px, py - poleH + sq * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  microSparks(ctx, c.x, c.y, sq, theme.spark, now, 6, 0.5, 0.7);
}

/* ---------- 🏃 Passed pawn ---------- */
function drawPassedPawn(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const c = center(pattern.squares[0], size, blackO);
  const dir = forwardDir(pattern.squares[0], pattern.side, size, blackO);
  squareGlow(ctx, c, sq, color, now);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, sq * 0.035);
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.15;
  for (let i = 0; i < 3; i++) {
    const phase = ((now / 1800) + i * 0.34) % 1;
    const cy = c.y + dir * sq * (0.3 + phase * 0.5);
    const wsp = sq * 0.14;
    ctx.globalAlpha = (1 - phase) * 0.35;
    ctx.beginPath();
    ctx.moveTo(c.x - wsp, cy + dir * wsp * 0.6);
    ctx.lineTo(c.x, cy);
    ctx.lineTo(c.x + wsp, cy + dir * wsp * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const ph = ((now / 2200) + i * 0.27) % 1;
    const mx = c.x + Math.sin(now / 1400 + i) * sq * 0.07;
    const my = c.y + dir * sq * (0.15 + ph * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - ph) * 0.15;
    ctx.fillStyle = theme.spark;
    ctx.shadowColor = theme.spark;
    ctx.shadowBlur = sq * 0.08;
    ctx.beginPath(); ctx.arc(mx, my, sq * 0.02, 0, 6.2832); ctx.fill();
    ctx.restore();
  }
}

/* ---------- ⛓️ Pawn chain ---------- */
function drawPawnChain(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const centers = pattern.squares.map((s) => center(s, size, blackO));
  const n = centers.length;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, sq * 0.045);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(centers[0].x, centers[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(centers[i].x, centers[i].y);
  ctx.stroke();
  ctx.restore();
  const pulsePos = ((now / 900) % 1) * (n - 1);
  centers.forEach((c, i) => {
    const strength = (i + 1) / n;
    const near = Math.max(0, 1 - Math.abs(i - pulsePos));
    const breathe = 0.5 + 0.5 * Math.sin(now / 300 + i * 0.6);
    cornerTicks(ctx, c.x, c.y, sq, color, {
      hs: sq / 2 - sq * 0.1, len: sq * (0.12 + 0.12 * strength),
      lw: Math.max(2, sq * (0.05 + 0.06 * strength)),
      alpha: 0.35 + 0.5 * strength * (0.6 + 0.4 * breathe),
      blur: sq * (0.15 + 0.45 * strength + 0.35 * near)
    });
    microSparks(ctx, c.x, c.y, sq, theme.spark, now, 2 + Math.round(strength * 5), 0.42, 0.4 + 0.6 * strength + 0.5 * near);
  });
  const fi = Math.min(Math.floor(pulsePos), n - 2);
  const fr = pulsePos - fi;
  const a = centers[fi], b = centers[fi + 1];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = theme.spark;
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.5;
  ctx.beginPath();
  ctx.arc(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, sq * 0.1, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

/* ---------- 🎯 Hotspot ---------- */
function drawHotspot(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const focal = center(pattern.squares[0], size, blackO);
  const attackers = pattern.squares.slice(1).map((s) => center(s, size, blackO));
  const n = attackers.length;
  const heat = Math.min(1, (n - 3) / 4 + 0.45);
  const breathe = 0.6 + 0.4 * Math.sin(now / 250);
  attackers.forEach((a, i) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.2;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(1, sq * 0.04);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(focal.x, focal.y); ctx.stroke();
    const p = ((now / 700) + i * 0.18) % 1;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = theme.spark;
    ctx.beginPath(); ctx.arc(a.x + (focal.x - a.x) * p, a.y + (focal.y - a.y) * p, sq * 0.05, 0, 6.2832); ctx.fill();
    ctx.restore();
  });
  const rad = sq * (0.45 + 0.45 * heat) * breathe;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grd = ctx.createRadialGradient(focal.x, focal.y, 0, focal.x, focal.y, rad);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.55 * breathe;
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(focal.x, focal.y, rad, 0, 6.2832); ctx.fill();
  ctx.restore();
  microSparks(ctx, focal.x, focal.y, sq, theme.spark, now, 4 + n, 0.4, heat);
}

/* ---------- 🏹 Open file ---------- */
function drawOpenFile(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const a = center(pattern.line.from, size, blackO);
  const b = center(pattern.line.to, size, blackO);
  squareGlow(ctx, a, sq, color, now);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = sq * 0.15;
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = Math.max(1, sq * 0.05);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  const p = (now / 1100) % 1;
  const px = a.x + (b.x - a.x) * p, py = a.y + (b.y - a.y) * p;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.spark;
  ctx.shadowBlur = sq * 0.25;
  ctx.beginPath(); ctx.arc(px, py, sq * 0.08, 0, 6.2832); ctx.fill();
  ctx.restore();
  microSparks(ctx, px, py, sq, theme.spark, now, 3, 0.2, 0.6);
}

/* ---------- 🐴 Fork ---------- */
function drawFork(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const att = center(pattern.squares[0], size, blackO);
  const targets = pattern.squares.slice(1).map((s) => center(s, size, blackO));
  squareGlow(ctx, att, sq, color, now);
  const cyc = (now % 1300) / 1300;
  targets.forEach((t, i) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.25;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, sq * 0.045);
    ctx.beginPath(); ctx.moveTo(att.x, att.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    const p = clamp01((cyc - i * 0.06) / 0.4);
    if (cyc < 0.55) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = theme.spark;
      ctx.shadowBlur = sq * 0.4;
      ctx.beginPath(); ctx.arc(att.x + (t.x - att.x) * p, att.y + (t.y - att.y) * p, sq * 0.06, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
    cornerTicks(ctx, t.x, t.y, sq, color, { hs: sq / 2 - sq * 0.1, len: sq * 0.13, lw: Math.max(2, sq * 0.055), alpha: 0.55, blur: sq * 0.25 });
  });
  microSparks(ctx, att.x, att.y, sq, theme.spark, now, 5, 0.4, 0.8);
}

function drawGeneric(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  for (const square of pattern.squares) squareGlow(ctx, center(square, size, blackO), sq, color, now);
}

/* ---------- ⚠️ Hanging piece — deliberately the gentlest, least intrusive hint ---------- */
function drawHanging(ctx, size, pattern, now, theme, blackO) {
  const color = colorFor(pattern, theme, blackO);
  const sq = size / 8;
  const c = center(pattern.squares[0], size, blackO);
  const cyc = (now % 3200) / 3200;
  const pulse = 0.5 + 0.5 * Math.sin(cyc * 6.2832);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, sq * 0.02);
  ctx.globalAlpha = 0.08 + 0.07 * pulse;
  ctx.beginPath();
  ctx.arc(c.x, c.y, sq * 0.32 + sq * 0.03 * pulse, 0, 6.2832);
  ctx.stroke();
  ctx.restore();
}

// Draws one pattern's animated highlight onto ctx. `size` is the board edge in px,
// `blackO` whether the board is flipped (black at the bottom).
export function drawPatternFx(ctx, size, pattern, now, theme = PATTERN_THEMES[0], blackO = false) {
  switch (pattern.type) {
    case 'fianchetto': return drawFianchetto(ctx, size, pattern, now, theme, blackO);
    case 'rooks': return drawRooks(ctx, size, pattern, now, theme, blackO);
    case 'battery': return drawBattery(ctx, size, pattern, now, theme, blackO);
    case 'pin': return drawPin(ctx, size, pattern, now, theme, blackO);
    case 'skewer': return drawSkewer(ctx, size, pattern, now, theme, blackO);
    case 'outpost': return drawOutpost(ctx, size, pattern, now, theme, blackO);
    case 'passed-pawn': return drawPassedPawn(ctx, size, pattern, now, theme, blackO);
    case 'pawn-chain': return drawPawnChain(ctx, size, pattern, now, theme, blackO);
    case 'hotspot': return drawHotspot(ctx, size, pattern, now, theme, blackO);
    case 'open-file': return drawOpenFile(ctx, size, pattern, now, theme, blackO);
    case 'fortress': return drawFortress(ctx, size, pattern, now, theme, blackO);
    case 'fork': return drawFork(ctx, size, pattern, now, theme, blackO);
    case 'hanging': return drawHanging(ctx, size, pattern, now, theme, blackO);
    default: return drawGeneric(ctx, size, pattern, now, theme, blackO);
  }
}
