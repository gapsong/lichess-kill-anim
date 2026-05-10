import { selectTimeline } from './animation-pack.js';
import { sampleLayer } from './timeline.js';

const DEFAULT_MAX_DURATION_MS = 3000;

export class CanvasSpriteRenderer {
  constructor({
    pack,
    drawSprite,
    maxDurationMs = DEFAULT_MAX_DURATION_MS
  }) {
    this.pack = pack;
    this.drawSprite = drawSprite;
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
      renderEvent
    });

    return true;
  }

  tick(nowMs = performance.now()) {
    const stillActive = [];

    for (const animation of this.activeAnimations) {
      const elapsedMs = nowMs - animation.startedAt;

      if (elapsedMs <= animation.durationMs) {
        this.draw(animation, elapsedMs);
        stillActive.push(animation);
      }
    }

    this.activeAnimations = stillActive;
  }

  draw(animation, elapsedMs) {
    for (const layer of animation.timeline.layers) {
      const sample = sampleLayer(layer, animation.renderEvent, elapsedMs);
      if (sample) this.drawSprite(sample, animation.renderEvent);
    }
  }
}

function timelineDuration(timeline) {
  const keyframeEnd = Math.max(
    0,
    ...timeline.layers.flatMap((layer) => layer.keyframes.map((keyframe) => keyframe.t))
  );

  return Math.min(timeline.maxDurationMs ?? keyframeEnd, keyframeEnd);
}
