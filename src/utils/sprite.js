// Sprite transparency & alpha utilities.
// Stateless except for two module-level WeakMap caches (safe, no game state).

const transparentSpriteCache = new WeakMap();
const spriteAlphaCache = new WeakMap();

/**
 * Process an image to remove near-black pixels (transparency key).
 * @param {HTMLImageElement} img
 * @param {Set<HTMLImageElement>} handImages — images that use the higher alpha thresholds
 * @returns {HTMLCanvasElement|HTMLImageElement}
 */
export function getTransparentSprite(img, handImages) {
  if (!img.complete || img.naturalWidth === 0) return img;
  const isHandSprite = handImages ? handImages.has(img) : false;

  const cachedSprite = transparentSpriteCache.get(img);
  if (cachedSprite) return cachedSprite;

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = img.naturalWidth;
  spriteCanvas.height = img.naturalHeight;
  const spriteCtx = spriteCanvas.getContext('2d', { willReadFrequently: true });

  if (!spriteCtx) return img;

  spriteCtx.drawImage(img, 0, 0);
  const imageData = spriteCtx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);
  const px = imageData.data;
  const hardCut = isHandSprite ? 45 : 10;
  const softCut = isHandSprite ? 95 : 35;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];
    const maxChannel = Math.max(r, g, b);
    if (maxChannel <= hardCut) {
      px[i + 3] = 0;
    } else if (maxChannel < softCut) {
      px[i + 3] = Math.round(a * ((maxChannel - hardCut) / (softCut - hardCut)));
    }
  }

  spriteCtx.putImageData(imageData, 0, 0);
  transparentSpriteCache.set(img, spriteCanvas);
  return spriteCanvas;
}

/**
 * Draw an image with the transparency-key processing applied.
 */
export function drawImageWithTransparencyKey(ctx, img, x, y, w, h, handImages) {
  ctx.drawImage(getTransparentSprite(img, handImages), x, y, w, h);
}

/**
 * Get alpha channel data for pixel-level collision detection.
 */
export function getSpriteAlphaData(img, handImages) {
  const sprite = getTransparentSprite(img, handImages);
  if (!sprite || !sprite.width || !sprite.height) return null;

  const cached = spriteAlphaCache.get(sprite);
  if (cached) return cached;

  let sourceCanvas = sprite;
  if (!(sprite instanceof HTMLCanvasElement)) {
    const c = document.createElement('canvas');
    c.width = sprite.naturalWidth || sprite.width;
    c.height = sprite.naturalHeight || sprite.height;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    if (!cctx) return null;
    cctx.drawImage(sprite, 0, 0);
    sourceCanvas = c;
  }

  const sctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  const imageData = sctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const payload = {
    w: sourceCanvas.width,
    h: sourceCanvas.height,
    alpha: imageData.data,
  };
  spriteAlphaCache.set(sprite, payload);
  return payload;
}

/**
 * Sample the alpha value at a specific pixel coordinate in alpha data.
 */
export function sampleSpriteAlpha(alphaData, u, v) {
  const x = Math.floor(u);
  const y = Math.floor(v);
  if (x < 0 || y < 0 || x >= alphaData.w || y >= alphaData.h) return 0;
  const idx = (y * alphaData.w + x) * 4 + 3;
  return alphaData.alpha[idx];
}

/**
 * Check if a point is visible on the character body sprite.
 */
export function isVisibleOnBody(px, py, bodyTarget) {
  if (!bodyTarget || !bodyTarget.alpha) return false;
  const localX = (px - bodyTarget.x) / bodyTarget.w;
  const localY = (py - bodyTarget.y) / bodyTarget.h;
  if (localX < 0 || localX > 1 || localY < 0 || localY > 1) return false;
  const u = localX * bodyTarget.alpha.w;
  const v = localY * bodyTarget.alpha.h;
  return sampleSpriteAlpha(bodyTarget.alpha, u, v) > 20;
}

/**
 * Check if a point is visible on a hand sprite (accounts for rotation + stretch).
 */
export function isVisibleOnHand(px, py, handTarget) {
  if (!handTarget || !handTarget.alpha) return false;

  const dx = px - handTarget.tx;
  const dy = py - handTarget.ty;
  const c = Math.cos(handTarget.rot);
  const s = Math.sin(handTarget.rot);
  const unrotX = dx * c + dy * s;
  const unrotY = -dx * s + dy * c;
  const localX = unrotX;
  const localY = unrotY / handTarget.stretch;

  const drawLocalX = localX - handTarget.drawX;
  const drawLocalY = localY - handTarget.drawY;
  if (
    drawLocalX < 0 ||
    drawLocalY < 0 ||
    drawLocalX > handTarget.drawW ||
    drawLocalY > handTarget.drawH
  ) {
    return false;
  }

  const u = (drawLocalX / handTarget.drawW) * handTarget.alpha.w;
  const v = (drawLocalY / handTarget.drawH) * handTarget.alpha.h;
  return sampleSpriteAlpha(handTarget.alpha, u, v) > 20;
}

/**
 * Check if a point hits any visible pixel on the character (body or hands).
 */
export function hitVisibleCharacterPixel(px, py, targets) {
  if (isVisibleOnBody(px, py, targets.body)) return true;
  for (let i = 0; i < targets.hands.length; i++) {
    if (isVisibleOnHand(px, py, targets.hands[i])) return true;
  }
  return false;
}

/**
 * Binary sample: 1 if visible, 0 if not.
 */
export function sampleVisibleCharacter(px, py, targets) {
  return hitVisibleCharacterPixel(px, py, targets) ? 1 : 0;
}

/**
 * Estimate surface normal at a point on the character, for bouncing embers.
 */
export function estimateCharacterNormal(px, py, targets, fallbackVx, fallbackVy) {
  const eps = 2;
  const sx = sampleVisibleCharacter(px + eps, py, targets) - sampleVisibleCharacter(px - eps, py, targets);
  const sy = sampleVisibleCharacter(px, py + eps, targets) - sampleVisibleCharacter(px, py - eps, targets);

  let nx = -sx;
  let ny = -sy;
  let nLen = Math.hypot(nx, ny);
  if (nLen < 0.001) {
    const fLen = Math.hypot(fallbackVx, fallbackVy);
    if (fLen < 0.001) return { nx: 0, ny: -1 };
    return { nx: -fallbackVx / fLen, ny: -fallbackVy / fLen };
  }
  nx /= nLen;
  ny /= nLen;
  return { nx, ny };
}
