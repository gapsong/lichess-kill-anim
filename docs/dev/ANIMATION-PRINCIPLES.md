# Animation Principles for Sprite Effects

Reference for coding frame-by-frame canvas sprite animations. Distilled from saint11's pixel art articles, classic game animation theory (12 Principles), and what works in our generator.

---

## Core Principles

### 1. Color Story (most important for effects)
Every animation should move through a defined color arc. The viewer reads color as temperature and energy — design the arc first, then draw.

**Explosion arc:**
```
Frame 0-1: WHITE (pure energy, impact moment)
Frame 2-3: YELLOW → ORANGE (peak heat)
Frame 4-5: ORANGE → RED (expansion, cooling)
Frame 6:   DARK RED / BROWN (smoke starts)
Frame 7:   GREY (cold wisp)
```

**Blood/dagger arc:**
```
Frame 0:   none / faint glint
Frame 1:   SILVER → WHITE (blade flash, smear)
Frame 2:   CRIMSON (first blood burst, impact peak)
Frame 3-4: DARK RED → BURGUNDY (droplets spreading)
Frame 5-6: DARK / MAROON (settling)
Frame 7:   DARK STAIN (fade)
```

**Rule:** never skip more than one color step per frame. The eye expects continuous progression.

---

### 2. Hit Flash — the one frame that sells impact
Frame at moment of contact must be a **pure white or near-white burst**. Even one 45ms frame of pure white makes the hit feel real. Without it, the animation feels soft.

- Radius: smaller than you expect (the constraint creates punch)
- Duration: 1 frame only — 45ms max
- Color: `rgba(255,255,255,1)` at center, transparent at edge

---

### 3. Timing Ratio (saint11 + game feel)
Spend **more frames on aftermath than on impact**.

Bad: even distribution (2 build / 2 impact / 4 dissipate)  
Good: front-loaded impact, long tail (1-2 build / 2-3 impact / 3-4 dissipate)

For 8 frames at variable durations:
```
[45, 45, 60, 70, 80, 90, 100, 120]ms
```
Short frames at peak → longer frames in smoke/settle. Total: ~610ms.

---

### 4. Squash & Stretch on Non-Organic Objects
Even fire and plasma follow squash/stretch logic:

- **Anticipation frame** (frame 0): compressed, tiny — builds expectation
- **Stretch/overshoot** (frame 1-2): expands *past* its final size
- **Settle** (frame 3): pulls back slightly to equilibrium
- **Expand into smoke** (frame 4-7): larger area but lower opacity — smoke always takes more space than fire

Keyframe implication:
```js
{ t: 0,   scale: 0.25, alpha: 0 },  // compressed flash seed
{ t: 45,  scale: 1.4,  alpha: 1 },  // overshoot
{ t: 90,  scale: 1.1,  alpha: 1 },  // settle
{ t: 300, scale: 2.0,  alpha: 0.8 },
{ t: 560, scale: 2.6,  alpha: 0 }
```

---

### 5. Smear Frame
A single "blurred" intermediate frame between two key poses creates perceived speed. For a blade:
- Draw a wide, semi-transparent diagonal band instead of a crisp line
- For explosions: a radially-streaked ellipse instead of a circle

---

### 6. Secondary Motion
While the main effect plays, secondary elements add life:
- **Debris/sparks**: small particles radiating outward (straight-ahead from center)
- **Trailing lines**: elongated in direction of travel, fade at tail
- **Smoke tendrils**: offset from center, rising slower than fire expands

Secondary motion should follow **follow-through** — it continues for 1-2 frames after the main event peaks.

---

### 7. Debris Arc Physics
Particles should not move in straight lines at constant speed. Imply:
- **Radial distance** increases frame-over-frame (they move outward)
- **Y-bias**: gravity pulls downward — increase `y + rand * gravity` each frame
- **Deceleration**: distance increment shrinks per frame (ease-out)

For code: instead of pure `rand(frame, i)` for position, accumulate:
```js
const dist = baseDist + easeOut(frame / FRAMES) * maxDist;
```

---

### 8. Clear Silhouette Rule
At any frame, the overall shape must be readable in silhouette. Avoid frames where the effect blends into a blob with no defined edge. For round explosions: the outer debris halo creates the silhouette boundary even as the center fades.

---

### 9. Palette Discipline
- Use **3-5 colors max** per animation type (not counting alpha variations)
- Keep a primary color, a highlight (lighter), and a shadow/smoke (darker+desaturated)
- The highlight should appear only at peak frames; it draws the eye to the impact moment

---

## Applying Principles to Codegen

When writing a `drawFrame[]` array:

1. Write the color story first as a comment block above the array
2. Frame 0 = white flash seed (even if tiny)
3. Frames 1-2 = peak: radial gradient from white core, large radius, high opacity
4. Frame 3 = peak settle: core starts darkening to yellow/orange
5. Frames 4-5 = expand + secondary smoke layer added
6. Frames 6-7 = smoke dominant, fire almost gone, debris at max distance

---

## Checklist Before Committing a Spritesheet

- [ ] Frame 0 has a visible white/bright hit flash
- [ ] Color clearly progresses (no backtracking)
- [ ] At least one frame has a shockwave/ring element (for impact feel)
- [ ] Debris particles present from frame 1 onward
- [ ] Alpha fades to 0 by last frame (clean end)
- [ ] Works at small size (the board squares are ~80-100px total, sprite drawSize ~72px)
