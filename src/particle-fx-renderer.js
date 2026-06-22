// particle-fx-renderer.js
// Drop-in alternative to CanvasSpriteRenderer that plays the "Chess Carnage"
// live particle effects on the board-local overlay canvas.
//
// Same public surface the userscript already drives:
//   const r = new ParticleFxRenderer({ onImpact, soundOn });
//   r.play(renderEvent);            // spawn an effect at victim.at
//   r.tick(nowMs, context, size);   // advance + draw one frame (board-local px)
//   r.activeCount;                  // > 0 => keep the rAF loop running
//
// Coordinates are board-local: victim.at.{x,y} are pixels inside cg-board and
// `size` is the board edge in px (square = size/8). Everything is scaled by
// k = squareSize / 80 so it looks proportional on any board size.
//
// No imports — bundles cleanly via esbuild into the userscript.

const GLYPH = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const SIG = { q: 'nuke', n: 'slash', b: 'zap', r: 'smash', p: 'pixel', k: 'ascension' };
const GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";
const REF_SQUARE = 80; // board square size the original effects were tuned at

export class ParticleFxRenderer {
  constructor({
    onImpact = null,
    mode = 'signature', // 'signature' | 'random' | a fixed effect id
    intensity = 7,      // 1..10
    soundOn = true,
    buildupMs = 0,      // 0 = instant impact; >0 = crosshair buildup before impact
    routing = null,     // map attacker piece -> effect; null = built-in SIG
    fallback = 'splatter'
  } = {}) {
    this.onImpact = onImpact;
    this.mode = mode;
    this.intensity = Math.max(1, Math.min(10, intensity));
    this.soundOn = soundOn;
    this.buildupMs = buildupMs;
    this.routing = routing;
    this.fallback = fallback;
    this.pending = [];
    this.particles = [];
    this._k = 1;
    this._S = REF_SQUARE;
    this._ac = null;
    this._master = null;
    this.POOL = ['nuke', 'slash', 'zap', 'smash', 'pixel', 'ascension', 'splatter', 'inferno', 'vortex', 'shatter'];
  }

  get activeCount() {
    return this.particles.length + this.pending.length;
  }

  /* ---------- public entry ---------- */
  play(renderEvent, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    const at = renderEvent?.victim?.at;
    const S = renderEvent?.board?.squareSize || REF_SQUARE;
    if (!at) return false;

    this._S = S;
    this._k = S / REF_SQUARE;

    const id = this.effectFor(renderEvent);
    const victim = {
      type: renderEvent.victim.piece || 'p',
      color: renderEvent.victim.color || 'b'
    };

    if (this.buildupMs > 0) {
      // targeting buildup: reticle now, main effect + impact after buildupMs
      this.spawnCrosshair(at.x, at.y, S);
      this.pending.push({
        id, cx: at.x, cy: at.y, S, victim, renderEvent,
        fireAt: nowMs + this.buildupMs
      });
    } else {
      this.fireImpact(id, at.x, at.y, S, victim, renderEvent);
    }
    return true;
  }

  fireImpact(id, cx, cy, S, victim, renderEvent) {
    this.spawn(id, cx, cy, S, victim);
    const sh = this.intensity / 6;
    const amp = (this.SHAKE[id] || 6) * sh;
    this.onImpact?.(renderEvent, { amplitude: Math.max(2, amp), durationMs: 320 });
    if (this.soundOn) this.playSound(id);
  }

  spawnCrosshair(cx, cy, S) {
    const frames = Math.max(8, Math.round(this.buildupMs / 16));
    this.addP({ kind: 'reticle', x: cx, y: cy, S, color: '#ff5a5a', max: frames });
  }

  tick(nowMs, ctx, size) {
    // fire any pending impacts whose buildup has elapsed (runs even without ctx)
    if (this.pending.length) {
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const q = this.pending[i];
        if (nowMs >= q.fireAt) {
          this.fireImpact(q.id, q.cx, q.cy, q.S, q.victim, q.renderEvent);
          this.pending.splice(i, 1);
        }
      }
    }
    if (!ctx) return;
    const ps = this.particles;
    // update + cull
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      this.updateP(p);
      if (p.dead) ps.splice(i, 1);
    }
    // draw in spawn order so backgrounds (flash) sit under glyph under sparks under text
    for (let i = 0; i < ps.length; i++) this.drawP(ps[i], ctx);
  }

  /* ---------- effect routing ---------- */
  effectFor(re) {
    if (this.mode && this.mode !== 'signature' && this.mode !== 'random' && SIG_HAS(this.mode)) return this.mode;
    if (this.mode === 'random') return this.POOL[(Math.random() * this.POOL.length) | 0];
    const victim = re.victim || {};
    const attacker = re.attacker || {};
    if (victim.piece === 'k') return 'ascension';
    const map = this.routing || SIG;
    return map[attacker.piece] || this.fallback || 'splatter';
  }

  /* ---------- helpers ---------- */
  rand(a, b) { return a + Math.random() * (b - a); }
  pickc(a) { return a[(Math.random() * a.length) | 0]; }

  SHAKE = { nuke: 14, splatter: 6, slash: 7, zap: 5, smash: 12, pixel: 0, ascension: 0, vortex: 6, inferno: 7, shatter: 5 };

  addP(cfg) {
    const k = this._k;
    const p = Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, life: 0, max: 60, size: 4,
      shape: 'circle', color: '#fff', rot: 0, vrot: 0, kind: 'std', alpha: 1,
      grow: 0, glow: 0, seed: Math.random() * 10, fadeIn: false, S: this._S
    }, cfg);
    // scale physical magnitudes by board size (positions stay absolute)
    for (const key of ['vx', 'vy', 'g', 'size', 'grow', 'glow', 'vr', 'w']) {
      if (typeof p[key] === 'number') p[key] *= k;
    }
    this.particles.push(p);
    return p;
  }

  glyph(victim, cx, cy, S, mode, max, extra) {
    const white = victim.color === 'w';
    return this.addP(Object.assign({
      kind: 'glyph', x: cx, y: cy, mode,
      char: GLYPH[victim.type] || GLYPH.p,
      color: white ? '#f4f3ee' : '#2b2926',
      stroke: Math.max(1, S * 0.022),
      strokeColor: white ? '#403e39' : '#0d0c0a',
      fontPx: S * 0.78, max: max || 30, S
    }, extra || {}));
  }

  glyphHalf(victim, cx, cy, S, half, dirx, diry, rotDeg, max) {
    const white = victim.color === 'w';
    return this.addP({
      kind: 'glyphHalf', x: cx, y: cy, half, dirx, diry, rotDeg,
      char: GLYPH[victim.type] || GLYPH.p,
      color: white ? '#f4f3ee' : '#2b2926',
      stroke: Math.max(1, S * 0.022),
      strokeColor: white ? '#403e39' : '#0d0c0a',
      fontPx: S * 0.78, max: max || 32, S
    });
  }

  bigText(txt, color, cx, cy, scale, font) {
    return this.addP({
      kind: 'text', x: cx, y: cy, txt, color,
      fontPx: (scale || 1) * 40, font: font || "'Bungee','Segoe UI',system-ui,sans-serif",
      max: 55, vy: -0.4
    });
  }

  flashBlob(cx, cy, color, S, max) {
    return this.addP({ kind: 'flash', x: cx, y: cy, color, r: S * 2.6, max: max || 14 });
  }

  /* ================= UPDATE ================= */
  updateP(p) {
    p.life++;
    if (p.life >= p.max) { p.dead = true; return; }
    if (p.kind === 'orbit') {
      p.ang += p.va; p.rad += p.vr;
      if (p.rad < 3 * this._k) { p.dead = true; return; }
      p.x = p.cx + Math.cos(p.ang) * p.rad; p.y = p.cy + Math.sin(p.ang) * p.rad; return;
    }
    if (p.kind === 'bolt' || p.kind === 'flash' || p.kind === 'beam' || p.kind === 'streak' || p.kind === 'reticle' || p.kind === 'ring') return;
    if (p.kind === 'glyph' || p.kind === 'glyphHalf' || p.kind === 'text') {
      if (p.vy) p.y += p.vy;
      return;
    }
    if (p.kind === 'ember') p.vx += Math.sin((p.life + p.seed) * 0.3) * 0.09 * this._k;
    p.vx *= p.drag; p.vy = (p.vy + p.g) * p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
    if (p.grow) p.size = Math.max(0.2, p.size + p.grow);
  }

  /* ================= DRAW ================= */
  drawP(p, ctx) {
    const t = p.life / p.max;

    if (p.kind === 'flash') {
      const a = (1 - t) * 0.7;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grd.addColorStop(0, hexA(p.color, a));
      grd.addColorStop(1, hexA(p.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      return;
    }
    if (p.kind === 'beam') {
      ctx.save();
      ctx.globalAlpha = t < 0.2 ? t / 0.2 : (1 - (t - 0.2) / 0.8);
      const grd = ctx.createLinearGradient(0, p.y - p.h, 0, p.y);
      grd.addColorStop(0, 'rgba(255,216,107,0)');
      grd.addColorStop(1, 'rgba(255,216,107,0.55)');
      ctx.fillStyle = grd;
      ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
      ctx.restore();
      return;
    }
    if (p.kind === 'bolt') {
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = p.color; ctx.lineWidth = p.w; ctx.lineCap = 'round';
      ctx.shadowColor = p.color; ctx.shadowBlur = 16;
      ctx.beginPath(); const pts = p.pts; ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }
    if (p.kind === 'streak') {
      const sc = t < 0.3 ? t / 0.3 : 1;
      const a = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.globalAlpha = a;
      const grd = ctx.createLinearGradient(-p.len / 2, 0, p.len / 2, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(0.5, '#fff');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
      ctx.fillRect(-p.len / 2 * sc, -p.th / 2, p.len * sc, p.th);
      ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }
    if (p.kind === 'text') {
      let sc, a;
      if (t < 0.25) { sc = 0.3 + (1.18 - 0.3) * (t / 0.25); a = t / 0.25; }
      else if (t < 0.68) { sc = 1.18 - 0.18 * ((t - 0.25) / 0.43); a = 1; }
      else { sc = 1 - 0.08 * ((t - 0.68) / 0.32); a = 1 - (t - 0.68) / 0.32; }
      ctx.save(); ctx.translate(p.x, p.y - p.life * 0.6); ctx.scale(sc, sc);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `${p.fontPx * this._k}px ${p.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = p.color; ctx.shadowBlur = 20;
      ctx.fillStyle = p.color; ctx.fillText(p.txt, 0, 0);
      ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }
    if (p.kind === 'glyph') { this.drawGlyph(p, ctx, t); return; }
    if (p.kind === 'glyphHalf') { this.drawGlyphHalf(p, ctx, t); return; }
    if (p.kind === 'reticle') { this.drawReticle(p, ctx, t); return; }
    if (p.kind === 'ring') { this.drawRing(p, ctx, t); return; }

    // ---- particle shapes ----
    let a = (p.fadeIn && p.life < 4) ? p.life / 4 : (1 - t);
    a = Math.max(0, a) * (p.alpha ?? 1);
    ctx.globalAlpha = a;
    if (p.shape === 'spark') {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
      const len = Math.min(20 * this._k, Math.hypot(p.vx, p.vy) * 1.7); const ang = Math.atan2(p.vy, p.vx);
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = p.glow; }
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }
    if (p.shape === 'square') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = p.glow; }
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return;
    }
    if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = p.glow; }
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.4, p.size), 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  glyphTransform(mode, t, S) {
    let sx = 1, sy = 1, dx = 0, dy = 0, rot = 0, a = 1;
    switch (mode) {
      case 'nuke': sx = sy = 1 + 0.7 * t; a = 1 - t; break;
      case 'splatter': sx = sy = 1 + 0.25 * t; a = 1 - t; break;
      case 'smash': { const e = Math.min(1, t / 0.6); sx = 1 + 0.7 * e; sy = Math.max(0.05, 1 - 0.95 * e); dy = S * 0.4 * e; a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4; break; }
      case 'zap': a = (Math.floor(t * 6) % 2 === 0) ? 1 : 0.15; sx = sy = 1 - 0.2 * t; dy = -S * 0.2 * t; if (t > 0.85) a = Math.max(0, (1 - t) / 0.15); break;
      case 'ascension': dy = -S * 1.3 * t; sx = sy = 1 + 0.15 * t; a = 1 - t; break;
      case 'vortex': sx = sy = Math.max(0, 1 - t); rot = t * Math.PI * 4; a = 1 - t; break;
      case 'inferno': a = 1 - t; sy = 1 - 0.15 * t; dy = S * 0.1 * t; break;
      case 'shatter': sx = sy = 1 + 0.05 * t; a = 1 - t; break;
      default: a = 1 - t;
    }
    return { sx, sy, dx, dy, rot, a };
  }

  drawGlyph(p, ctx, t) {
    const tf = this.glyphTransform(p.mode, t, p.S);
    ctx.save();
    ctx.translate(p.x + tf.dx, p.y + tf.dy);
    ctx.rotate(tf.rot); ctx.scale(tf.sx, tf.sy);
    ctx.globalAlpha = Math.max(0, tf.a);
    ctx.font = `${p.fontPx}px ${GFONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (p.mode === 'ascension') { ctx.shadowColor = '#ffd86b'; ctx.shadowBlur = 12; }
    ctx.lineWidth = p.stroke; ctx.strokeStyle = p.strokeColor; ctx.strokeText(p.char, 0, 0);
    ctx.fillStyle = p.color; ctx.fillText(p.char, 0, 0);
    ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  drawGlyphHalf(p, ctx, t) {
    const a = 1 - t;
    const dx = p.dirx * p.S * 0.5 * t;
    const dy = p.diry * p.S * 0.8 * t;
    const rot = (p.rotDeg * Math.PI / 180) * t;
    const H = p.fontPx;
    ctx.save();
    ctx.translate(p.x + dx, p.y + dy);
    ctx.rotate(rot);
    ctx.beginPath();
    if (p.half === 'top') ctx.rect(-H, -H, 2 * H, H);
    else ctx.rect(-H, 0, 2 * H, H);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `${p.fontPx}px ${GFONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = p.stroke; ctx.strokeStyle = p.strokeColor; ctx.strokeText(p.char, 0, 0);
    ctx.fillStyle = p.color; ctx.fillText(p.char, 0, 0);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  drawRing(p, ctx, t) {
    const e = 1 - Math.pow(1 - t, 3);            // ease-out expansion
    const r = p.r0 + (p.r1 - p.r0) * e;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';    // additive glow
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, p.lw * (1 - t));
    ctx.shadowColor = p.color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r), 0, 6.2832); ctx.stroke();
    ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  drawReticle(p, ctx, t) {
    const S = p.S;
    const ease = 1 - Math.pow(1 - t, 2);
    const gap = S * (0.95 - 0.45 * ease);   // brackets close in over time
    const len = S * 0.26;
    const rot = t * Math.PI * 0.5;          // slow quarter rotation
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 6));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.min(1, t * 4) * pulse; // quick fade-in, then pulse
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1.5, S * 0.04);
    ctx.lineCap = 'round';
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    for (let q = 0; q < 4; q++) {
      const sx = q < 2 ? -1 : 1;
      const sy = (q % 2 === 0) ? -1 : 1;
      const x = sx * gap, y = sy * gap;
      ctx.beginPath();
      ctx.moveTo(x, y - sy * len); ctx.lineTo(x, y); ctx.lineTo(x - sx * len, y);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1, S * 0.03), 0, 6.2832);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  bolt(cx, cy, S) {
    const top = cy - S * 2.2;
    const segs = 9; const pts = [];
    for (let i = 0; i <= segs; i++) {
      const tt = i / segs;
      pts.push({ x: cx + ((i === 0 || i === segs) ? 0 : this.rand(-S * 0.3, S * 0.3)), y: top + (cy - top) * tt });
    }
    this.addP({ kind: 'bolt', pts, color: '#7cc8ff', w: 7, max: 7, x: cx, y: cy });
    this.addP({ kind: 'bolt', pts: pts.map((p) => ({ x: p.x, y: p.y })), color: '#eaf6ff', w: 3, max: 9, x: cx, y: cy });
  }

  /* ================= EFFECTS ================= */
  spawn(id, cx, cy, S, victim) {
    const lvl = this.intensity, cs = 0.5 + lvl / 13;

    if (id === 'nuke') {
      // Void-Schockwelle (Dame): violetter Ring + Flash, dann violetter Feuerball
      this.flashBlob(cx, cy, '#d9b3ff', S, 16);
      this.addP({ kind: 'ring', x: cx, y: cy, r0: S * 0.15, r1: S * 2.7, lw: S * 0.16, color: '#b98cff', max: 22 });
      this.addP({ kind: 'ring', x: cx, y: cy, r0: S * 0.10, r1: S * 1.7, lw: S * 0.09, color: '#ecd9ff', max: 15 });
      this.glyph(victim, cx, cy, S, 'nuke', 18);
      this.bigText('BOOM', '#cf9bff', cx, cy, 1.0);
      let N = Math.round(46 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(3, 13); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, drag: 0.93, max: this.rand(28, 52), size: this.rand(4, 11), color: this.pickc(['#f3e6ff', '#c9a0ff', '#9b5cff', '#5e23c9']), glow: 14, grow: 0.3 }); }
      N = Math.round(13 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(0.5, 3); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, g: -0.02, drag: 0.96, max: this.rand(50, 80), size: this.rand(10, 22), color: 'rgba(58,40,92,.5)', grow: 0.7, fadeIn: true }); }
      N = Math.round(20 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(6, 16); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.1, drag: 0.92, max: this.rand(16, 30), size: this.rand(1.5, 3), color: '#e6d2ff', shape: 'spark' }); }
    }
    else if (id === 'splatter') {
      this.glyph(victim, cx, cy, S, 'splatter', 14);
      const N = Math.round(34 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(2, 11); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.45, drag: 0.99, max: this.rand(30, 60), size: this.rand(2, 8), color: this.pickc(['#b81f12', '#8e0f08', '#d6332a', '#6e0a05']) }); }
    }
    else if (id === 'slash') {
      // directional streak + split halves
      this.addP({ kind: 'streak', x: cx, y: cy, ang: this.rand(-0.9, -0.5), len: S * 2.5, th: Math.max(3, S * 0.06), max: 18 });
      this.glyphHalf(victim, cx, cy, S, 'top', -1, 1, -32, 32);
      this.glyphHalf(victim, cx, cy, S, 'bottom', 1, 1.4, 30, 32);
      const N = Math.round(26 * cs);
      for (let i = 0; i < N; i++) { const a = -0.6 + this.rand(-0.5, 0.5) + (i % 2 ? Math.PI : 0), sp = this.rand(4, 12); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.4, drag: 0.99, max: this.rand(26, 46), size: this.rand(2, 6), color: this.pickc(['#c4231a', '#8e0f08', '#e0392e']) }); }
    }
    else if (id === 'zap') {
      this.flashBlob(cx, cy, '#bfe9ff', S, 12);
      this.bolt(cx, cy, S);
      this.glyph(victim, cx, cy, S, 'zap', 26);
      const N = Math.round(22 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(3, 10); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.08, drag: 0.9, max: this.rand(14, 28), size: this.rand(1, 2.5), color: this.pickc(['#bff0ff', '#5ec6ff', '#ffffff']), shape: 'spark', glow: 8 }); }
    }
    else if (id === 'smash') {
      this.glyph(victim, cx, cy, S, 'smash', 22);
      this.bigText('POW!', '#ffd24a', cx, cy - S * 0.2, 1.25);
      const N = Math.round(26 * cs);
      for (let i = 0; i < N; i++) { const dir = (i % 2 ? 1 : -1); this.addP({ x: cx + dir * S * 0.1, y: cy + S * 0.2, vx: dir * this.rand(2, 8), vy: this.rand(-3, -0.5), g: 0.25, drag: 0.95, max: this.rand(26, 46), size: this.rand(3, 8), color: this.pickc(['#9b8b73', '#c2b393', '#7a6e5a']), grow: 0.3 }); }
    }
    else if (id === 'pixel') {
      const val = VALUE[victim.type];
      this.glyph(victim, cx, cy, S, 'pixel', 10);
      this.bigText('+' + (val || 1), '#63e88a', cx, cy - S * 0.3, 0.95, "'Bungee',monospace,monospace");
      const pal = ['#ffffff', '#ffe14d', '#46d17a', '#5ec6ff', '#ff5edb', '#ff6a3d'];
      const N = Math.round(30 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(2, 9); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.3, drag: 0.97, max: this.rand(22, 40), size: this.rand(4, 9), color: this.pickc(pal), shape: 'square', vrot: this.rand(-0.2, 0.2) }); }
    }
    else if (id === 'ascension') {
      this.flashBlob(cx, cy, '#fff0c0', S, 22);
      this.addP({ kind: 'beam', x: cx, y: cy, w: S * 0.9, h: Math.min(cy, S * 4), color: '#ffd86b', max: 52 });
      this.glyph(victim, cx, cy, S, 'ascension', 52);
      const N = Math.round(26 * cs);
      for (let i = 0; i < N; i++) this.addP({ x: cx + this.rand(-S * 0.35, S * 0.35), y: cy + this.rand(-S * 0.1, S * 0.3), vx: this.rand(-0.6, 0.6), vy: this.rand(-3.5, -1), g: -0.02, drag: 0.99, max: this.rand(40, 70), size: this.rand(2, 5), color: this.pickc(['#fff3c0', '#ffd86b', '#ffe9a0', '#ffffff']), glow: 10 });
    }
    else if (id === 'vortex') {
      this.glyph(victim, cx, cy, S, 'vortex', 42);
      const N = Math.round(40 * cs);
      for (let i = 0; i < N; i++) { const ang = Math.random() * 6.28, rad = this.rand(S * 0.4, S * 1.1); this.addP({ kind: 'orbit', cx, cy, ang, rad, va: this.rand(0.18, 0.32), vr: -this.rand(0.8, 2.2), x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, max: 120, size: this.rand(2, 5), color: this.pickc(['#b18bff', '#7b4dff', '#d9c6ff', '#ffffff']), glow: 10 }); }
    }
    else if (id === 'inferno') {
      this.flashBlob(cx, cy, '#ff8a3d', S, 14);
      this.glyph(victim, cx, cy, S, 'inferno', 36);
      let N = Math.round(40 * cs);
      for (let i = 0; i < N; i++) this.addP({ kind: 'ember', x: cx + this.rand(-S * 0.3, S * 0.3), y: cy + this.rand(-S * 0.1, S * 0.3), vx: this.rand(-1.5, 1.5), vy: this.rand(-5, -1.5), g: -0.03, drag: 0.98, max: this.rand(26, 52), size: this.rand(4, 11), color: this.pickc(['#ffe14d', '#ff8a1f', '#ff4d12', '#cf2a0a']), glow: 14, grow: -0.08 });
      N = Math.round(10 * cs);
      for (let i = 0; i < N; i++) this.addP({ x: cx + this.rand(-S * 0.2, S * 0.2), y: cy, vx: this.rand(-0.6, 0.6), vy: this.rand(-2, -0.5), g: -0.01, drag: 0.98, max: this.rand(50, 80), size: this.rand(8, 16), color: 'rgba(40,34,30,.5)', grow: 0.6, fadeIn: true });
    }
    else if (id === 'shatter') {
      const col = victim.color === 'w' ? '#e8e4da' : '#3a3833';
      this.glyph(victim, cx, cy, S, 'shatter', 14);
      let N = Math.round(16 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(2, 8); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, g: 0.35, drag: 0.99, max: this.rand(30, 55), size: this.rand(4, 9), color: col, shape: 'square', vrot: this.rand(-0.3, 0.3) }); }
      N = Math.round(20 * cs);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, sp = this.rand(0.5, 3); this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.02, drag: 0.97, max: this.rand(40, 70), size: this.rand(1, 2.5), color: 'rgba(200,196,186,.7)' }); }
    }
    else {
      // unknown id -> splatter fallback
      this.spawn('splatter', cx, cy, S, victim);
    }
  }

  /* ================= SOUND (WebAudio synth) ================= */
  ensureAudio() {
    if (this._ac) { if (this._ac.state === 'suspended') this._ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._ac = new AC();
      this._master = this._ac.createGain();
      this._master.gain.value = 0.5;
      this._master.connect(this._ac.destination);
    } catch (e) { /* no audio */ }
  }
  tone(freq, type, t0, dur, gain, freq2) {
    const ac = this._ac; if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; const t = ac.currentTime + t0;
    o.frequency.setValueAtTime(freq, t);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this._master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(t0, dur, type, freq, gain) {
    const ac = this._ac; if (!ac) return;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = type === 'hp' ? 'highpass' : (type === 'bp' ? 'bandpass' : 'lowpass');
    f.frequency.value = freq;
    const g = ac.createGain(); const t = ac.currentTime + t0;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this._master); src.start(t); src.stop(t + dur);
  }
  playSound(id) {
    this.ensureAudio(); if (!this._ac) return;
    if (id === 'nuke') { this.noise(0, 0.5, 'low', 900, 0.5); this.tone(90, 'sine', 0, 0.45, 0.5, 32); }
    else if (id === 'splatter') { this.noise(0, 0.18, 'low', 700, 0.45); this.tone(200, 'sine', 0, 0.15, 0.25, 60); }
    else if (id === 'slash') { this.noise(0, 0.14, 'bp', 2200, 0.45); }
    else if (id === 'zap') { this.tone(700, 'square', 0, 0.22, 0.18, 180); this.noise(0, 0.2, 'hp', 1500, 0.15); }
    else if (id === 'smash') { this.tone(140, 'sine', 0, 0.28, 0.5, 46); this.noise(0, 0.1, 'low', 500, 0.35); }
    else if (id === 'pixel') { this.tone(880, 'square', 0, 0.06, 0.2); this.tone(1320, 'square', 0.07, 0.07, 0.2); }
    else if (id === 'ascension') { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 'triangle', i * 0.08, 0.55, 0.15)); }
    else if (id === 'vortex') { this.tone(420, 'sawtooth', 0, 0.6, 0.22, 55); this.noise(0, 0.6, 'low', 600, 0.12); }
    else if (id === 'inferno') { this.noise(0, 0.6, 'brown', 700, 0.3); this.tone(70, 'sine', 0, 0.6, 0.3, 50); }
    else if (id === 'shatter') { for (let i = 0; i < 5; i++) this.tone(this.rand(2200, 4200), 'triangle', i * 0.03, 0.08, 0.12); }
  }
}

function SIG_HAS(id) {
  return ['nuke', 'slash', 'zap', 'smash', 'pixel', 'ascension', 'splatter', 'inferno', 'vortex', 'shatter'].includes(id);
}

function hexA(hex, a) {
  // accepts #rgb / #rrggbb / rgba()/rgb() passthrough
  if (typeof hex !== 'string') return `rgba(255,255,255,${a})`;
  if (hex[0] !== '#') return hex;
  let r, g, b;
  if (hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
  else { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); }
  return `rgba(${r},${g},${b},${a})`;
}

export default ParticleFxRenderer;
