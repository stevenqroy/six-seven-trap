import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECTILE } from '../../../src/constants.js';
import {
  drawProjectiles,
  fireProjectile,
  updateProjectiles,
} from '../../../src/game-objects/projectile.js';

function createState(projectiles = []) {
  return { projectiles };
}

function createProjectile(overrides = {}) {
  return {
    x: 120,
    y: 220,
    dy: -PROJECTILE.SPEED_PX_PER_FRAME * 60,
    life: 2.2,
    trail: [],
    colorTheme: 0,
    ...overrides,
  };
}

function createMockCtx() {
  const calls = [];
  let shadowBlur = 0;
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    shadowColor: '',
    globalCompositeOperation: 'source-over',
    get shadowBlur() {
      return shadowBlur;
    },
    set shadowBlur(value) {
      shadowBlur = value;
      calls.push({ type: 'shadowBlur', value });
    },
    save() {
      calls.push({ type: 'save' });
    },
    restore() {
      calls.push({ type: 'restore' });
    },
    beginPath() {
      calls.push({ type: 'beginPath' });
    },
    arc(x, y, radius) {
      calls.push({ type: 'arc', x, y, radius, fillStyle: this.fillStyle });
    },
    fill() {
      calls.push({ type: 'fill', fillStyle: this.fillStyle, shadowBlur });
    },
    moveTo(x, y) {
      calls.push({ type: 'moveTo', x, y });
    },
    lineTo(x, y) {
      calls.push({ type: 'lineTo', x, y });
    },
    stroke() {
      calls.push({
        type: 'stroke',
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
        lineCap: this.lineCap,
      });
    },
    createLinearGradient(x0, y0, x1, y1) {
      const stops = [];
      const gradient = {
        addColorStop(offset, color) {
          stops.push({ offset, color });
        },
      };
      calls.push({
        type: 'createLinearGradient',
        x0,
        y0,
        x1,
        y1,
        stops,
      });
      return gradient;
    },
  };

  return { ctx, calls };
}

describe('projectile game object (S7R-076)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('spawns projectiles with expected defaults and bounded theme indexes', () => {
    const randomValues = [0, 0.2499, 0.25, 0.5, 0.75, 0.9999];
    const expectedThemes = [0, 0, 1, 2, 3, 3];
    const randomSpy = vi.spyOn(Math, 'random');

    randomValues.forEach((value, index) => {
      randomSpy.mockReturnValueOnce(value);
      const state = createState();

      const fired = fireProjectile(state, 100 + index, 200);
      const projectile = state.projectiles[0];

      expect(fired).toBe(true);
      expect(projectile.x).toBe(100 + index);
      expect(projectile.y).toBe(200);
      expect(projectile.dy).toBe(-PROJECTILE.SPEED_PX_PER_FRAME * 60);
      expect(projectile.life).toBe(2.2);
      expect(projectile.trail).toEqual([]);
      expect(projectile.colorTheme).toBe(expectedThemes[index]);
      expect(projectile.colorTheme).toBeGreaterThanOrEqual(0);
      expect(projectile.colorTheme).toBeLessThan(4);
    });
  });

  it('respects the MAX_ACTIVE spawn cap', () => {
    const state = createState();

    for (let i = 0; i < PROJECTILE.MAX_ACTIVE; i++) {
      expect(fireProjectile(state, i * 10, 200)).toBe(true);
    }

    expect(fireProjectile(state, 999, 200)).toBe(false);
    expect(state.projectiles).toHaveLength(PROJECTILE.MAX_ACTIVE);
  });

  it('updates movement and reports collision hits against the ship', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const state = createState();
    fireProjectile(state, 50, 150);

    const hits = updateProjectiles(state, 0.1, {
      x: 40,
      y: 90,
      w: 30,
      h: 30,
      ready: true,
    });

    expect(hits).toHaveLength(1);
    expect(hits[0].x).toBe(50);
    expect(hits[0].y).toBeCloseTo(102, 5);
    expect(hits[0].colorTheme).toBe(3);
    expect(state.projectiles).toHaveLength(0);
  });

  it('moves active projectiles over dt and appends to trail history', () => {
    const state = createState([
      createProjectile({
        x: 100,
        y: 300,
      }),
    ]);

    const hits = updateProjectiles(state, 0.5, null);
    const projectile = state.projectiles[0];

    expect(hits).toEqual([]);
    expect(projectile.y).toBeCloseTo(60, 5);
    expect(projectile.life).toBeCloseTo(1.7, 5);
    expect(projectile.trail).toHaveLength(1);
    expect(projectile.trail[0]).toMatchObject({ x: 100, y: 60 });
  });

  it('removes projectiles that expire or move above the offscreen bound', () => {
    const expiredState = createState([
      createProjectile({
        x: 90,
        y: 260,
      }),
    ]);
    const offscreenState = createState([
      createProjectile({
        x: 80,
        y: -70,
        life: 2.2,
      }),
    ]);

    expect(updateProjectiles(expiredState, 3, null)).toEqual([]);
    expect(expiredState.projectiles).toHaveLength(0);

    expect(updateProjectiles(offscreenState, 0.05, null)).toEqual([]);
    expect(offscreenState.projectiles).toHaveLength(0);
  });

  it('bounds trail growth to PROJECTILE.TRAIL_LENGTH', () => {
    const state = createState([
      createProjectile({
        x: 140,
        y: 240,
      }),
    ]);

    for (let i = 0; i < PROJECTILE.TRAIL_LENGTH + 25; i++) {
      updateProjectiles(state, 0, null);
    }

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].trail).toHaveLength(PROJECTILE.TRAIL_LENGTH);
  });

  it('applies draw quality caps to projectile shadow blur', () => {
    const baseProjectile = {
      x: 140,
      y: 120,
      dy: -PROJECTILE.SPEED_PX_PER_FRAME * 60,
      life: 2.2,
      trail: [
        { x: 138, y: 128 },
        { x: 136, y: 136 },
      ],
      colorTheme: 2,
    };

    const noBlur = createMockCtx();
    drawProjectiles(noBlur.ctx, createState([{ ...baseProjectile }]), {
      shadowBlurEnabled: false,
      maxShadowBlur: 6,
    });
    expect(
      noBlur.calls.some((call) => call.type === 'shadowBlur' && call.value > 0),
    ).toBe(false);

    const clamped = createMockCtx();
    drawProjectiles(clamped.ctx, createState([{ ...baseProjectile }]), {
      maxShadowBlur: 999,
    });
    expect(
      clamped.calls.some((call) => call.type === 'shadowBlur' && call.value === 18),
    ).toBe(true);

    const capped = createMockCtx();
    drawProjectiles(capped.ctx, createState([{ ...baseProjectile }]), {
      shadowBlurEnabled: true,
      maxShadowBlur: 7,
    });
    expect(
      capped.calls.some((call) => call.type === 'shadowBlur' && call.value === 7),
    ).toBe(true);
  });
});
