export function sampleLayer(layer, renderEvent, elapsedMs) {
  const keyframes = [...layer.keyframes].sort((a, b) => a.t - b.t);
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (!first || elapsedMs < first.t || elapsedMs > last.t) return null;

  const nextIndex = keyframes.findIndex((keyframe) => keyframe.t >= elapsedMs);
  const next = keyframes[nextIndex];
  const previous = keyframes[Math.max(0, nextIndex - 1)];
  const progress = next.t === previous.t
    ? 0
    : (elapsedMs - previous.t) / (next.t - previous.t);

  const from = resolveKeyframe(previous, renderEvent);
  const to = resolveKeyframe(next, renderEvent);

  return {
    sheet: layer.sheet,
    frame: layer.frame,
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    scale: lerp(from.scale, to.scale, progress),
    alpha: lerp(from.alpha, to.alpha, progress),
    rotation: lerp(from.rotation, to.rotation, progress)
  };
}

function resolveKeyframe(keyframe, renderEvent) {
  const ref = resolveRef(keyframe.ref, renderEvent);
  const squareSize = renderEvent.board.squareSize;

  return {
    x: ref.x + (keyframe.dx ?? 0) * squareSize,
    y: ref.y + (keyframe.dy ?? 0) * squareSize,
    scale: keyframe.scale ?? 1,
    alpha: keyframe.alpha ?? 1,
    rotation: keyframe.rotation ?? 0
  };
}

function resolveRef(ref, renderEvent) {
  if (ref === 'attacker.from') return renderEvent.attacker.from;
  if (ref === 'attacker.to') return renderEvent.attacker.to;
  if (ref === 'victim.at') return renderEvent.victim.at;

  throw new Error(`Unknown timeline ref: ${ref}`);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}
