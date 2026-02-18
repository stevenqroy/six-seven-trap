import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initWorldState,
  rebuildWorldStars,
  resetWorldCache,
} from '../../../src/systems/world-render.js';
import { SCENE } from '../../../src/constants.js';

describe('world-render state (S7R-100)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initWorldState', () => {
    it('returns correct initial shape', () => {
      const state = initWorldState();
      expect(state).toEqual({
        stars: [],
        gradientCache: {
          key: '',
          sky: null,
          hillFar: null,
          hillMid: null,
          hillNear: null,
          barnBody: null,
          doorGlow: null,
          ground: null,
          groundTop: 0,
          barnW: 0,
          barnH: 0,
          barnX: 0,
          barnY: 0,
          doorW: 0,
          doorH: 0,
          doorX: 0,
          doorY: 0,
        },
      });
    });
  });

  describe('rebuildWorldStars', () => {
    it('generates stars within count range', () => {
      const state = initWorldState();
      const rng = vi.fn(() => 0.5);
      const w = 1000;
      const h = 1000;
      
      rebuildWorldStars(state, w, h, rng);
      
      const expectedCount = Math.max(
        SCENE.STAR_COUNT_MIN,
        Math.min(SCENE.STAR_COUNT_MAX, Math.floor((w * h) / SCENE.STAR_DENSITY_DIVISOR))
      );
      
      expect(state.stars.length).toBe(expectedCount);
      expect(state.stars.length).toBeGreaterThanOrEqual(SCENE.STAR_COUNT_MIN);
      expect(state.stars.length).toBeLessThanOrEqual(SCENE.STAR_COUNT_MAX);
    });

    it('positions stars within viewport bounds', () => {
      const state = initWorldState();
      const rng = vi.fn(() => 0.5); // returns middle
      const w = 800;
      const h = 600;
      
      rebuildWorldStars(state, w, h, rng);
      
      state.stars.forEach(star => {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(w);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(h * SCENE.STAR_HEIGHT_RATIO);
      });
    });

    it('generates valid star properties', () => {
      const state = initWorldState();
      const rng = vi.fn(() => 0.5);
      const w = 800;
      const h = 600;
      
      rebuildWorldStars(state, w, h, rng);
      
      state.stars.forEach(star => {
        expect(star.r).toBeGreaterThan(0);
        expect(star.a).toBeGreaterThan(0);
        expect(star.a).toBeLessThanOrEqual(1);
        expect(star.tw).toBeGreaterThan(0);
        expect(star.phase).toBeGreaterThanOrEqual(0);
      });
    });

    it('is deterministic with seeded rng', () => {
      const state1 = initWorldState();
      const state2 = initWorldState();
      const w = 800;
      const h = 600;
      
      const rng1 = vi.fn();
      let seed1 = 0;
      rng1.mockImplementation(() => {
        seed1 = (seed1 + 0.1) % 1;
        return seed1;
      });

      const rng2 = vi.fn();
      let seed2 = 0;
      rng2.mockImplementation(() => {
        seed2 = (seed2 + 0.1) % 1;
        return seed2;
      });

      rebuildWorldStars(state1, w, h, rng1);
      rebuildWorldStars(state2, w, h, rng2);
      
      expect(state1.stars).toEqual(state2.stars);
    });

    it('replaces existing stars on subsequent calls', () => {
      const state = initWorldState();
      const rng = vi.fn(() => 0.5);
      const w = 800;
      const h = 600;
      
      rebuildWorldStars(state, w, h, rng);
      const firstRunCount = state.stars.length;
      
      // Call again
      rebuildWorldStars(state, w, h, rng);
      
      // Should not append
      expect(state.stars.length).toBe(firstRunCount);
    });
  });

  describe('resetWorldCache', () => {
    it('clears the gradient cache key', () => {
      const state = initWorldState();
      state.gradientCache.key = 'some-stale-key';
      
      resetWorldCache(state);
      
      expect(state.gradientCache.key).toBe('');
    });
  });
});
