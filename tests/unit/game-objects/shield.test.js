import { describe, expect, it } from 'vitest';
import { SHIELD } from '../../../src/constants.js';
import {
  activateShield,
  drawShield,
  getShieldAlpha,
  isShieldActive,
  updateShield,
} from '../../../src/game-objects/shield.js';

function createState({
  active = false,
  startedAt = 0,
  lastUsedAt = -Infinity,
  rippleAt = -Infinity,
  qualityTier = 'high',
} = {}) {
  return {
    qualityTier,
    shield: {
      active,
      startedAt,
      lastUsedAt,
      rippleAt,
    },
  };
}

function createMockCtx({ width = 800, height = 600 } = {}) {
  const shadowBlurValues = [];
  const fillRectCalls = [];
  const ctx = {
    canvas: { width, height },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    lineDashOffset: 0,
    _shadowBlur: 0,
    save() {},
    restore() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    bezierCurveTo() {},
    fillRect(x, y, w, h) {
      fillRectCalls.push({ x, y, w, h });
    },
    setLineDash() {},
    createRadialGradient() {
      return {
        addColorStop() {},
      };
    },
  };

  Object.defineProperty(ctx, 'shadowBlur', {
    get() {
      return this._shadowBlur;
    },
    set(value) {
      this._shadowBlur = value;
      shadowBlurValues.push(value);
    },
  });

  return { ctx, shadowBlurValues, fillRectCalls };
}

function getMaxShadowBlur(values) {
  return values.reduce((max, value) => Math.max(max, value), 0);
}

describe('shield game object (S7R-075)', () => {
  it('activateShield allows first activation and enforces cooldown re-use', () => {
    const state = createState();
    const startedAt = 10_000;

    expect(activateShield(state, startedAt)).toBe(true);
    expect(state.shield.active).toBe(true);
    expect(state.shield.startedAt).toBe(startedAt);
    expect(state.shield.lastUsedAt).toBe(startedAt);

    expect(activateShield(state, startedAt + SHIELD.COOLDOWN_MS - 1)).toBe(false);
    expect(state.shield.startedAt).toBe(startedAt);

    expect(activateShield(state, startedAt + SHIELD.COOLDOWN_MS)).toBe(true);
    expect(state.shield.startedAt).toBe(startedAt + SHIELD.COOLDOWN_MS);
  });

  it('updateShield expires the shield at duration boundary', () => {
    const state = createState();
    const startedAt = 2_000;
    activateShield(state, startedAt);

    updateShield(state, startedAt + SHIELD.DURATION_MS - 1);
    expect(state.shield.active).toBe(true);
    expect(isShieldActive(state, startedAt + SHIELD.DURATION_MS - 1)).toBe(true);

    updateShield(state, startedAt + SHIELD.DURATION_MS);
    expect(state.shield.active).toBe(false);
    expect(isShieldActive(state, startedAt + SHIELD.DURATION_MS)).toBe(false);
  });

  it('isShieldActive and getShieldAlpha reflect active and expired states', () => {
    const state = createState({
      active: true,
      startedAt: 1_000,
    });

    const activeAlpha = getShieldAlpha(state, 1_300);
    expect(activeAlpha).toBeGreaterThan(0);
    expect(activeAlpha).toBeLessThanOrEqual(1);

    state.shield.active = false;
    expect(getShieldAlpha(state, 1_300)).toBe(0);

    state.shield.active = true;
    expect(getShieldAlpha(state, 1_000 + SHIELD.DURATION_MS)).toBe(0);
  });

  it('drawShield enforces disabled quality caps and keeps particle pools bounded', () => {
    const state = createState({
      active: true,
      startedAt: 1_000,
      qualityTier: 'high',
    });
    const { ctx, shadowBlurValues } = createMockCtx();

    drawShield(ctx, 320, 180, state, 1_350, {
      shadowBlurEnabled: false,
      maxShadowBlur: 24,
    });

    expect(shadowBlurValues.length).toBeGreaterThan(0);
    expect(getMaxShadowBlur(shadowBlurValues)).toBe(0);
    expect(state.shield.fx.sparkles.length).toBeLessThanOrEqual(20);
    expect(state.shield.fx.burstParticles.length).toBeLessThanOrEqual(10);
    expect(state.shield.fx.arcs.length).toBeLessThanOrEqual(5);
  });

  it('drawShield applies explicit blur cap and limits impact burst particles', () => {
    const state = createState({
      active: true,
      startedAt: 1_000,
      rippleAt: 1_460,
      qualityTier: 'high',
    });
    const { ctx, shadowBlurValues, fillRectCalls } = createMockCtx();

    drawShield(ctx, 320, 180, state, 1_500, {
      shadowBlurEnabled: true,
      maxShadowBlur: 4,
    });

    const maxShadowBlur = getMaxShadowBlur(shadowBlurValues);
    expect(maxShadowBlur).toBeGreaterThan(0);
    expect(maxShadowBlur).toBeLessThanOrEqual(4);
    expect(fillRectCalls.length).toBeGreaterThan(0);

    const activeBurstCount = state.shield.fx.burstParticles.filter((particle) => particle.active).length;
    expect(activeBurstCount).toBeLessThanOrEqual(10);
  });

  it('drawShield falls back to low-tier caps when quality caps are omitted', () => {
    const state = createState({
      active: true,
      startedAt: 1_000,
      qualityTier: 'low',
    });
    const { ctx, shadowBlurValues } = createMockCtx();

    drawShield(ctx, 320, 180, state, 1_400);

    expect(shadowBlurValues.length).toBeGreaterThan(0);
    expect(getMaxShadowBlur(shadowBlurValues)).toBe(0);
  });
});
