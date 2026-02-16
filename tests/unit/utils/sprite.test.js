import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drawImageWithTransparencyKey,
  estimateCharacterNormal,
  getSpriteAlphaData,
  getTransparentSprite,
  hitVisibleCharacterPixel,
  isVisibleOnBody,
  isVisibleOnHand,
  sampleSpriteAlpha,
} from '../../../src/utils/sprite.js';

function createMockImage({
  width = 2,
  height = 2,
  pixels = null,
} = {}) {
  const basePixels = pixels
    ?? new Uint8ClampedArray([
      10, 10, 10, 255,
      40, 40, 40, 255,
      100, 100, 100, 255,
      200, 200, 200, 255,
    ]);
  return {
    complete: true,
    naturalWidth: width,
    naturalHeight: height,
    __mockPixels: basePixels,
  };
}

function createAlphaPayload(width, height, alphaAt) {
  const alpha = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alpha[(y * width + x) * 4 + 3] = alphaAt(x, y);
    }
  }
  return { w: width, h: height, alpha };
}

function createMock2DContext(canvas) {
  let pixelData = new Uint8ClampedArray(Math.max(1, canvas.width * canvas.height * 4));
  return {
    drawImage: vi.fn((img) => {
      if (img && img.__mockPixels instanceof Uint8ClampedArray) {
        pixelData = new Uint8ClampedArray(img.__mockPixels);
      }
    }),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(pixelData),
    })),
    putImageData: vi.fn((imageData) => {
      pixelData = new Uint8ClampedArray(imageData.data);
    }),
  };
}

describe('sprite utils (S7R-089)', () => {
  let forceNullContext = false;

  beforeEach(() => {
    forceNullContext = false;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContextMock() {
      if (forceNullContext) {
        forceNullContext = false;
        return null;
      }
      if (!this.__mockContext) {
        this.__mockContext = createMock2DContext(this);
      }
      return this.__mockContext;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sampleSpriteAlpha handles valid, boundary, and out-of-range coordinates', () => {
    const alphaData = {
      w: 2,
      h: 2,
      alpha: new Uint8ClampedArray([
        0, 0, 0, 10,
        0, 0, 0, 20,
        0, 0, 0, 30,
        0, 0, 0, 40,
      ]),
    };

    expect(sampleSpriteAlpha(alphaData, 0, 0)).toBe(10);
    expect(sampleSpriteAlpha(alphaData, 1, 1)).toBe(40);
    expect(sampleSpriteAlpha(alphaData, 1.99, 1.99)).toBe(40);
    expect(sampleSpriteAlpha(alphaData, -0.01, 0)).toBe(0);
    expect(sampleSpriteAlpha(alphaData, 0, -0.01)).toBe(0);
    expect(sampleSpriteAlpha(alphaData, 2, 1)).toBe(0);
    expect(sampleSpriteAlpha(alphaData, 1, 2)).toBe(0);
  });

  it('getTransparentSprite returns cached sprite for repeated calls', () => {
    const img = createMockImage();
    const handImages = new Set();

    const first = getTransparentSprite(img, handImages);
    const second = getTransparentSprite(img, handImages);

    expect(first).toBe(second);
    expect(first).toBeInstanceOf(HTMLCanvasElement);
  });

  it('getTransparentSprite handles null canvas context by returning the source image', () => {
    const img = createMockImage();
    forceNullContext = true;

    const result = getTransparentSprite(img, new Set());

    expect(result).toBe(img);
  });

  it('getSpriteAlphaData reuses cached payload for the same sprite input', () => {
    const img = createMockImage({
      width: 2,
      height: 2,
      pixels: new Uint8ClampedArray([
        0, 0, 0, 25,
        0, 0, 0, 50,
        0, 0, 0, 75,
        0, 0, 0, 100,
      ]),
    });

    const first = getSpriteAlphaData(img, new Set());
    const second = getSpriteAlphaData(img, new Set());

    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it('drawImageWithTransparencyKey forwards a processed sprite to drawImage', () => {
    const img = createMockImage();
    const ctx = { drawImage: vi.fn() };

    drawImageWithTransparencyKey(ctx, img, 4, 5, 6, 7, new Set());

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage.mock.calls[0].slice(1)).toEqual([4, 5, 6, 7]);
  });

  it('isVisibleOnBody and isVisibleOnHand return expected inside/outside results', () => {
    const alphaPayload = {
      w: 2,
      h: 2,
      alpha: new Uint8ClampedArray([
        0, 0, 0, 10,
        0, 0, 0, 20,
        0, 0, 0, 30,
        0, 0, 0, 40,
      ]),
    };

    const bodyTarget = {
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      alpha: alphaPayload,
    };
    const handTarget = {
      tx: 0,
      ty: 0,
      rot: 0,
      stretch: 1,
      drawX: 0,
      drawY: 0,
      drawW: 100,
      drawH: 100,
      alpha: alphaPayload,
    };

    expect(isVisibleOnBody(35, 58, bodyTarget)).toBe(true);
    expect(isVisibleOnBody(85, 33, bodyTarget)).toBe(false);
    expect(isVisibleOnBody(5, 33, bodyTarget)).toBe(false);

    expect(isVisibleOnHand(75, 75, handTarget)).toBe(true);
    expect(isVisibleOnHand(75, 25, handTarget)).toBe(false);
    expect(isVisibleOnHand(120, 120, handTarget)).toBe(false);
  });

  it('hitVisibleCharacterPixel handles empty targets, hits, and misses', () => {
    const alphaPayload = createAlphaPayload(2, 2, (x, y) => ((x === 1 && y === 1) ? 255 : 0));
    const bodyTarget = {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      alpha: alphaPayload,
    };
    const handTarget = {
      tx: 0,
      ty: 0,
      rot: 0,
      stretch: 1,
      drawX: 0,
      drawY: 0,
      drawW: 100,
      drawH: 100,
      alpha: alphaPayload,
    };

    expect(hitVisibleCharacterPixel(10, 10, { body: null, hands: [] })).toBe(false);
    expect(hitVisibleCharacterPixel(75, 75, { body: bodyTarget, hands: [] })).toBe(true);
    expect(hitVisibleCharacterPixel(10, 10, { body: null, hands: [handTarget] })).toBe(false);
  });

  it('estimateCharacterNormal returns computed normals and fallback vectors', () => {
    const edgeAlpha = createAlphaPayload(10, 10, (x) => (x >= 5 ? 255 : 0));
    const computed = estimateCharacterNormal(
      5,
      5,
      {
        body: {
          x: 0,
          y: 0,
          w: 10,
          h: 10,
          alpha: edgeAlpha,
        },
        hands: [],
      },
      1,
      0,
    );

    expect(computed.nx).toBeCloseTo(-1, 6);
    expect(computed.ny).toBeCloseTo(0, 6);

    expect(estimateCharacterNormal(0, 0, { body: null, hands: [] }, 3, 4)).toEqual({
      nx: -0.6,
      ny: -0.8,
    });
    expect(estimateCharacterNormal(0, 0, { body: null, hands: [] }, 0, 0)).toEqual({
      nx: 0,
      ny: -1,
    });
  });
});
