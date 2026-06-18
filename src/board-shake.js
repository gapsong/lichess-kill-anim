const ACTIVE_SHAKES = new WeakMap();

export function shakeElement(element, {
  amplitude = 3,
  durationMs = 160,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  now = () => globalThis.performance.now(),
  random = Math.random
} = {}) {
  if (!element || !requestFrame) return;

  const previous = ACTIVE_SHAKES.get(element);
  if (previous) previous.cancelled = true;

  const baseTransform = previous ? previous.baseTransform : (element.style.transform || '');
  const state = { cancelled: false, baseTransform };
  ACTIVE_SHAKES.set(element, state);

  const startedAt = now();

  function step() {
    if (state.cancelled) return;

    const progress = (now() - startedAt) / durationMs;

    if (progress >= 1) {
      element.style.transform = baseTransform;
      ACTIVE_SHAKES.delete(element);
      return;
    }

    const falloff = 1 - progress;
    const dx = (random() * 2 - 1) * amplitude * falloff;
    const dy = (random() * 2 - 1) * amplitude * falloff;
    element.style.transform =
      `${baseTransform} translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`.trim();
    requestFrame(step);
  }

  requestFrame(step);
}
