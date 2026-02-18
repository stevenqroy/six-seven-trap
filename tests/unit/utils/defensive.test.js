import { describe, it, expect } from 'vitest';
import {
  toFinite,
  toNonNegativeFinite,
  clamp,
  lerp,
} from '../../../src/utils/defensive.js';

describe('defensive utils (S7R-093)', () => {
  describe('toFinite', () => {
    it('returns valid number as-is', () => {
      expect(toFinite(42)).toBe(42);
      expect(toFinite(-10.5)).toBe(-10.5);
      expect(toFinite(0)).toBe(0);
    });

    it('returns default fallback (0) for non-finite values', () => {
      expect(toFinite(Infinity)).toBe(0);
      expect(toFinite(-Infinity)).toBe(0);
      expect(toFinite(NaN)).toBe(0);
      expect(toFinite(null)).toBe(0); // null converts to 0 in Number(null), but Number.isFinite(null) is false? Wait.
      // Number.isFinite(null) is false.
      expect(toFinite(undefined)).toBe(0);
    });

    it('returns custom fallback for non-finite values', () => {
      expect(toFinite(Infinity, 100)).toBe(100);
      expect(toFinite(NaN, -1)).toBe(-1);
    });
  });

  describe('toNonNegativeFinite', () => {
    it('returns positive number as-is', () => {
      expect(toNonNegativeFinite(42)).toBe(42);
      expect(toNonNegativeFinite(0.001)).toBe(0.001);
    });

    it('clamps negative numbers to 0', () => {
      expect(toNonNegativeFinite(-1)).toBe(0);
      expect(toNonNegativeFinite(-100.5)).toBe(0);
    });

    it('handles non-finite values using fallback, then clamps', () => {
      expect(toNonNegativeFinite(NaN)).toBe(0); // fallback default 0 -> 0
      expect(toNonNegativeFinite(Infinity, 50)).toBe(50);
      expect(toNonNegativeFinite(NaN, -10)).toBe(0); // fallback -10 -> clamped to 0
    });
  });

  describe('clamp', () => {
    it('returns value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('clamps value below min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps value above max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('interpolates between start and end', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(10, 20, 0.5)).toBe(15);
      expect(lerp(0, 100, 0.1)).toBe(10);
    });

    it('returns start when t=0', () => {
      expect(lerp(0, 10, 0)).toBe(0);
    });

    it('returns end when t=1', () => {
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('extrapolates when t is outside [0, 1]', () => {
      expect(lerp(0, 10, -0.5)).toBe(-5);
      expect(lerp(0, 10, 1.5)).toBe(15);
    });
  });
});
