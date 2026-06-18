export function frameRect(sheet, frame) {
  return {
    sx: frame * sheet.frameWidth,
    sy: 0,
    sw: sheet.frameWidth,
    sh: sheet.frameHeight
  };
}

export function createImageLoader({ Image = globalThis.Image } = {}) {
  const cache = new Map();

  return function loadImage(src) {
    if (cache.has(src)) return cache.get(src);

    const image = new Image();
    image.src = src;
    cache.set(src, image);
    return image;
  };
}

export function createCanvasSpriteDrawer({ context, pack, loadImage = createImageLoader() }) {
  Object.values(pack.spritesheets).forEach((sheet) => loadImage(sheet.image));

  return function drawSprite(sample) {
    const sheet = pack.spritesheets[sample.sheet];
    if (!sheet) return;

    const image = loadImage(sheet.image);
    if (!image.complete) return;

    const { sx, sy, sw, sh } = frameRect(sheet, sample.frame);
    const size = sheet.drawSize ?? sheet.frameWidth;

    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = sample.alpha;
    context.translate(sample.x, sample.y);
    context.rotate(sample.rotation);
    context.scale(sample.scale, sample.scale);
    context.drawImage(image, sx, sy, sw, sh, -size / 2, -size / 2, size, size);
    context.restore();
  };
}
