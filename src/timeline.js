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
    frame: sampleFrame(layer, elapsedMs),
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    scale: lerp(from.scale, to.scale, progress),
    alpha: lerp(from.alpha, to.alpha, progress),
    rotation: lerp(from.rotation, to.rotation, progress)
  };
}

function sampleFrame(layer, elapsedMs) {
  if (!layer.frames) return layer.frame;

  // Count frames from when this layer's first keyframe starts, not from t=0.
  // Without this, a layer starting at t=400 would show frame 6 instead of frame 0.
  const layerStart = layer.keyframes?.length ? Math.min(...layer.keyframes.map((kf) => kf.t)) : 0;
  const localMs = Math.max(0, elapsedMs - layerStart);

  if (layer.frameDurations) {
    let acc = 0;
    for (let i = 0; i < layer.frameDurations.length; i++) {
      acc += layer.frameDurations[i];
      if (localMs < acc) return layer.frames[i];
    }
    return layer.frames[layer.frames.length - 1];
  }

  const frameDurationMs = layer.frameDurationMs ?? 100;
  const index = Math.floor(localMs / frameDurationMs) % layer.frames.length;
  return layer.frames[index];
}

function resolveKeyframe(keyframe, renderEvent) {
  const ref = resolveRef(keyframe.ref, renderEvent);
  const squareSize = renderEvent.board.squareSize;

  return {
    x: ref.x + (keyframe.dx ?? 0) * squareSize,
    y: ref.y + (keyframe.dy ?? 0) * squareSize,
    scale: keyframe.scale ?? 1,
    alpha: keyframe.alpha ?? 1,
    rotation: (keyframe.rotationRef === 'attacker.angle' ? renderEvent.direction.angleRad : 0) + (keyframe.rotation ?? 0)
  };
}

const REFS = {
  'attacker.from': (e) => e.attacker.from,
  'attacker.to': (e) => e.attacker.to,
  'victim.at': (e) => e.victim.at
};

function resolveRef(ref, renderEvent) {
  const resolve = REFS[ref];
  if (!resolve) throw new Error(`Unknown timeline ref: ${ref}`);
  return resolve(renderEvent);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}
