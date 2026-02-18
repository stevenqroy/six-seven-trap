import { describe, expect, it, vi } from 'vitest';
import {
  clamp,
  distPointToSegmentSq,
  edgeBiasedUnit,
  quantize,
} from '../../../src/utils/math.js';

describe('math utils (S7R-092)', () => {
  it('clamp returns values within the provided bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(22, 0, 10)).toBe(10);
  });

  it('distPointToSegmentSq handles points on and off a segment', () => {
    expect(distPointToSegmentSq(5, 0, 0, 0, 10, 0)).toBe(0);
    expect(distPointToSegmentSq(5, 3, 0, 0, 10, 0)).toBe(9);
    expect(distPointToSegmentSq(15, 0, 0, 0, 10, 0)).toBe(25);
  });

  it('distPointToSegmentSq handles degenerate zero-length segments', () => {
    expect(distPointToSegmentSq(5, 7, 2, 3, 2, 3)).toBe(25);
  });

  it('quantize snaps to step and handles non-finite values', () => {
    expect(quantize(1.26, 0.5)).toBe(1.5);
    expect(quantize(1.24, 0.5)).toBe(1);
    expect(quantize(Number.NaN, 0.5)).toBe(0);
    expect(quantize(Number.POSITIVE_INFINITY, 0.5)).toBe(0);
  });

  it('quantize returns original value when step is non-positive', () => {
    expect(quantize(3.75, 0)).toBe(3.75);
    expect(quantize(3.75, -2)).toBe(3.75);
  });

  it('edgeBiasedUnit uses injected rng and stays within [0, 1]', () => {
    const random = vi
      .fn()
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5);

    const value = edgeBiasedUnit(2, random);

    expect(value).toBeCloseTo(0.25, 8);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('edgeBiasedUnit applies stronger edge bias with higher power', () => {
    const lowPowerRandom = vi
      .fn()
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.5);
    const highPowerRandom = vi
      .fn()
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.5);

    const lowPowerValue = edgeBiasedUnit(1, lowPowerRandom);
    const highPowerValue = edgeBiasedUnit(4, highPowerRandom);

    expect(highPowerValue).toBeGreaterThan(lowPowerValue);
    expect(highPowerValue).toBeCloseTo(0.9375, 8);
  });
});
