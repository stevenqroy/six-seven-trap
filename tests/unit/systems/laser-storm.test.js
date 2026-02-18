import { describe, expect, it, vi } from 'vitest';
import { MAX_LASER_SMOKE, SCENE } from '../../../src/constants.js';
import {
  spawnLaserSmoke,
  startLaserPostHitBounce,
  updateLaserSmoke,
} from '../../../src/systems/laser-storm.js';

function createBeam(overrides = {}) {
  return {
    angle: Math.PI / 3,
    length: 320,
    life: 0.2,
    inert: false,
    tipX: 0,
    tipY: 0,
    sourceX: 0,
    sourceY: 0,
    bouncePath: null,
    bouncesRemaining: 0,
    inertElapsed: 0,
    inertDuration: 0,
    bounceStage: -1,
    ...overrides,
  };
}

function createLaserStorm(overrides = {}) {
  return {
    smokePuffs: [],
    ...overrides,
  };
}

function createRngSequence(values) {
  let index = 0;
  return vi.fn(() => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  });
}

describe('laser storm physics (S7R-099)', () => {
  it('startLaserPostHitBounce marks beam inert and creates a bounded 5-point bounce path', () => {
    const beam = createBeam({
      angle: Math.PI / 4,
      length: 600,
      life: 0.1,
    });
    const rng = createRngSequence([0.5, 0.2, 0.4, 0.6, 0.8]);

    startLaserPostHitBounce(beam, 500, -120, {
      wCSS: 240,
      hCSS: 140,
      rng,
    });

    expect(beam.inert).toBe(true);
    expect(beam.bouncesRemaining).toBe(SCENE.LASER_BOUNCE_SEGMENTS);
    expect(beam.inertElapsed).toBe(0);
    expect(beam.inertDuration).toBe(SCENE.LASER_BOUNCE_INERT_DURATION);
    expect(beam.bounceStage).toBe(-1);
    expect(beam.bouncePath).toHaveLength(SCENE.LASER_BOUNCE_SEGMENTS + 1);

    for (const point of beam.bouncePath) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(240);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(140);
    }

    expect(beam.tipX).toBe(beam.bouncePath[0].x);
    expect(beam.tipY).toBe(beam.bouncePath[0].y);
    expect(beam.life).toBe(SCENE.LASER_BOUNCE_LIFE_MIN);
  });

  it('startLaserPostHitBounce is deterministic for fixed rng sequences', () => {
    const first = createBeam();
    const second = createBeam();
    const values = [0.25, 0.1, 0.9, 0.33, 0.77];

    startLaserPostHitBounce(first, 80, 90, {
      wCSS: 300,
      hCSS: 200,
      rng: createRngSequence(values),
    });

    startLaserPostHitBounce(second, 80, 90, {
      wCSS: 300,
      hCSS: 200,
      rng: createRngSequence(values),
    });

    expect(second.bouncePath).toEqual(first.bouncePath);
    expect(second.tipX).toBe(first.tipX);
    expect(second.tipY).toBe(first.tipY);
    expect(second.bouncesRemaining).toBe(first.bouncesRemaining);
  });

  it('startLaserPostHitBounce is a no-op when beam is already inert', () => {
    const beam = createBeam({
      inert: true,
      bouncesRemaining: 1,
      inertElapsed: 0.4,
      inertDuration: 2.5,
      bounceStage: 2,
      bouncePath: [{ x: 3, y: 4 }],
      tipX: 3,
      tipY: 4,
      life: 0.6,
    });
    const before = JSON.parse(JSON.stringify(beam));
    const rng = vi.fn(() => 0.75);

    startLaserPostHitBounce(beam, 120, 80, {
      wCSS: 300,
      hCSS: 200,
      rng,
    });

    expect(beam).toEqual(before);
    expect(rng).not.toHaveBeenCalled();
  });

  it('spawnLaserSmoke adds a puff with expected fields', () => {
    const laserStorm = createLaserStorm();
    const rng = vi.fn(() => 0.5);
    const getAdaptiveCapValue = vi.fn((key, fallback) => fallback);

    spawnLaserSmoke(laserStorm, 10, 20, 1, {
      rng,
      isLowGraphics: false,
      getAdaptiveCapValue,
    });

    expect(laserStorm.smokePuffs).toHaveLength(1);
    expect(getAdaptiveCapValue).toHaveBeenNthCalledWith(1, 'maxLaserSmoke', MAX_LASER_SMOKE);
    expect(getAdaptiveCapValue).toHaveBeenNthCalledWith(2, 'laserSmokeSpawnScale', 1);
    expect(laserStorm.smokePuffs[0]).toEqual({
      x: 10,
      y: 14,
      vx: 0,
      vy: -(SCENE.LASER_SMOKE_VY_BASE + SCENE.LASER_SMOKE_VY_RANGE * 0.5),
      r: SCENE.LASER_SMOKE_R_MIN + SCENE.LASER_SMOKE_R_RANGE * 0.5,
      life: SCENE.LASER_SMOKE_LIFE_MIN + SCENE.LASER_SMOKE_LIFE_RANGE * 0.5,
      lifeMax: SCENE.LASER_SMOKE_LIFE_MIN + SCENE.LASER_SMOKE_LIFE_RANGE * 0.5,
      grow: SCENE.LASER_SMOKE_GROW_MIN + SCENE.LASER_SMOKE_GROW_RANGE * 0.5,
    });
  });

  it('spawnLaserSmoke skips in low-graphics mode when rng exceeds threshold', () => {
    const laserStorm = createLaserStorm();
    const rng = vi.fn(() => SCENE.LASER_SMOKE_LOW_GRAPHICS_CHANCE + 0.01);
    const getAdaptiveCapValue = vi.fn((key, fallback) => fallback);

    spawnLaserSmoke(laserStorm, 10, 20, 1, {
      rng,
      isLowGraphics: true,
      getAdaptiveCapValue,
    });

    expect(laserStorm.smokePuffs).toHaveLength(0);
    expect(getAdaptiveCapValue).not.toHaveBeenCalled();
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it('spawnLaserSmoke trims oldest puffs when at smoke cap', () => {
    const smokeCap = SCENE.LASER_SMOKE_MIN_CAP;
    const laserStorm = createLaserStorm({
      smokePuffs: Array.from({ length: smokeCap }, (_, index) => ({
        id: index,
      })),
    });
    const getAdaptiveCapValue = vi.fn((key, fallback) => {
      if (key === 'maxLaserSmoke') return smokeCap;
      return fallback;
    });

    spawnLaserSmoke(laserStorm, 0, 0, 1, {
      rng: vi.fn(() => 0.5),
      isLowGraphics: false,
      getAdaptiveCapValue,
    });

    expect(laserStorm.smokePuffs).toHaveLength(smokeCap);
    expect(laserStorm.smokePuffs[0].id).toBe(1);
    expect(laserStorm.smokePuffs.at(-1)).toHaveProperty('life');
  });

  it('updateLaserSmoke applies physics and removes dead puffs', () => {
    const laserStorm = createLaserStorm({
      smokePuffs: [
        { id: 'a', x: 0, y: 0, vx: 10, vy: -5, r: 2, grow: 3, life: 1, lifeMax: 1 },
        { id: 'b', x: 5, y: 5, vx: 4, vy: -2, r: 3, grow: 1, life: 0.05, lifeMax: 1 },
        { id: 'c', x: 9, y: -1, vx: -6, vy: -1, r: 4, grow: 2, life: 0.3, lifeMax: 1 },
      ],
    });

    updateLaserSmoke(laserStorm, 0.1);

    expect(laserStorm.smokePuffs).toHaveLength(2);
    expect(laserStorm.smokePuffs.some((puff) => puff.id === 'b')).toBe(false);

    const updatedA = laserStorm.smokePuffs.find((puff) => puff.id === 'a');
    expect(updatedA).toBeTruthy();
    expect(updatedA.vx).toBeCloseTo(10 * SCENE.LASER_SMOKE_DRAG, 8);
    expect(updatedA.vy).toBeCloseTo(-5 - SCENE.LASER_SMOKE_GRAVITY * 0.1, 8);
    expect(updatedA.x).toBeCloseTo(updatedA.vx * 0.1, 8);
    expect(updatedA.y).toBeCloseTo(updatedA.vy * 0.1, 8);
    expect(updatedA.r).toBeCloseTo(2 + 3 * 0.1, 8);
    expect(updatedA.life).toBeCloseTo(0.9, 8);
  });
});
