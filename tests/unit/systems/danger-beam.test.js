import { describe, expect, it } from 'vitest';
import { getDangerBeamGeometry } from '../../../src/systems/danger-beam.js';
import { SCENE } from '../../../src/constants.js';

function createBadguysRender(overrides = {}) {
  return {
    ready: true,
    x: 120,
    y: 80,
    w: 180,
    h: 90,
    ...overrides,
  };
}

function createDangerBeam(overrides = {}) {
  return {
    enabled: true,
    offsetX: 14,
    offsetY: 8,
    widthRatio: 0.55,
    speedA: 0.004,
    speedB: 0.002,
    phaseA: 0.5,
    phaseB: 1.2,
    widthAmp: 1,
    lengthMin: 0.24,
    lengthMax: 0.72,
    huePhase: 0,
    ...overrides,
  };
}

describe('danger beam geometry (S7R-096)', () => {
  it('returns null when badguys render is not ready', () => {
    const geometry = getDangerBeamGeometry(2500, {
      badguysRender: createBadguysRender({ ready: false }),
      dangerBeam: createDangerBeam(),
      hCSS: 720,
    });

    expect(geometry).toBe(null);
  });

  it('returns null when danger beam is disabled', () => {
    const geometry = getDangerBeamGeometry(2500, {
      badguysRender: createBadguysRender(),
      dangerBeam: createDangerBeam({ enabled: false }),
      hCSS: 720,
    });

    expect(geometry).toBe(null);
  });

  it('returns null when computed beam height is non-positive', () => {
    const geometry = getDangerBeamGeometry(2500, {
      badguysRender: createBadguysRender({ y: 260 }),
      dangerBeam: createDangerBeam({ offsetY: 220 }),
      hCSS: 300,
    });

    expect(geometry).toBe(null);
  });

  it('returns valid finite geometry for valid inputs', () => {
    const badguysRender = createBadguysRender();
    const dangerBeam = createDangerBeam();
    const geometry = getDangerBeamGeometry(2500, {
      badguysRender,
      dangerBeam,
      hCSS: 720,
    });

    expect(geometry).toBeTruthy();
    expect(Number.isFinite(geometry.originX)).toBe(true);
    expect(Number.isFinite(geometry.originY)).toBe(true);
    expect(Number.isFinite(geometry.beamBottom)).toBe(true);
    expect(Number.isFinite(geometry.beamHeight)).toBe(true);
    expect(Number.isFinite(geometry.topWidth)).toBe(true);
    expect(Number.isFinite(geometry.bottomWidth)).toBe(true);
    expect(geometry.originX).toBeCloseTo(badguysRender.x + badguysRender.w * 0.5 + dangerBeam.offsetX, 8);
    expect(geometry.originY).toBeCloseTo(
      badguysRender.y + badguysRender.h * SCENE.DANGER_BEAM_ORIGIN_Y_RATIO + dangerBeam.offsetY,
      8
    );
    expect(geometry.beamHeight).toBeGreaterThan(0);
    expect(geometry.beamBottom).toBeGreaterThan(geometry.originY);
  });

  it('is deterministic for fixed inputs and fixed timestamp', () => {
    const params = {
      badguysRender: createBadguysRender(),
      dangerBeam: createDangerBeam(),
      hCSS: 720,
    };

    const first = getDangerBeamGeometry(2500, params);
    const second = getDangerBeamGeometry(2500, params);

    expect(first).toEqual(second);
  });

  it('changes oscillated geometry over time for the same beam state', () => {
    const params = {
      badguysRender: createBadguysRender(),
      dangerBeam: createDangerBeam(),
      hCSS: 720,
    };

    const early = getDangerBeamGeometry(1000, params);
    const later = getDangerBeamGeometry(5000, params);

    expect(early).toBeTruthy();
    expect(later).toBeTruthy();
    expect(early.bottomWidth).not.toBe(later.bottomWidth);
    expect(early.beamBottom).not.toBe(later.beamBottom);
  });
});
