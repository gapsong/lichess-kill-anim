import { selectTimeline } from './animation-pack.js';
import { sampleLayer } from './timeline.js';

const DEFAULT_MAX_DURATION_MS = 3000;

export class CanvasSpriteRenderer {
  constructor({
    pack,
    drawSprite,
    onImpact = null,
    maxDurationMs = DEFAULT_MAX_DURATION_MS
  }) {
    this.pack = pack;
    this.drawSprite = drawSprite;
    this.onImpact = onImpact;
    this.maxDurationMs = maxDurationMs;
    this.activeAnimations = [];
  }

  get activeCount() {
    return this.activeAnimations.length;
  }

  play(renderEvent, nowMs = performance.now()) {
    const timeline = selectTimeline(this.pack, renderEvent);
    if (!timeline) return false;

    this.activeAnimations.push({
      startedAt: nowMs,
      durationMs: Math.min(timelineDuration(timeline), this.maxDurationMs),
      timeline,
      renderEvent,
      impactFired: false
    });

    return true;
  }

  tick(nowMs = performance.now()) {
    this.activeAnimations = this.activeAnimations.filter((animation) => {
      const elapsedMs = nowMs - animation.startedAt;
      if (elapsedMs > animation.durationMs) return false;
      this.fireImpact(animation, elapsedMs);
      this.draw(animation, elapsedMs);
      return true;
    });
  }

  fireImpact(animation, elapsedMs) {
    if (animation.impactFired) return;

    const impactAtMs = animation.timeline.impactAtMs;
    if (impactAtMs == null || elapsedMs < impactAtMs) return;

    animation.impactFired = true;
    this.onImpact?.(animation.renderEvent, animation.timeline);
  }

  draw(animation, elapsedMs) {
    for (const layer of animation.timeline.layers) {
      const sample = sampleLayer(layer, animation.renderEvent, elapsedMs);
      if (sample) this.drawSprite(sample, animation.renderEvent);
    }
  }
}

function timelineDuration(timeline) {
  const end = Math.max(0, ...timeline.layers.flatMap((l) => l.keyframes.map((kf) => kf.t)));
  return Math.min(timeline.maxDurationMs ?? end, end);
}
