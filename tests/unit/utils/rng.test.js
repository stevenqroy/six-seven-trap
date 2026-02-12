import { describe, it, expect } from 'vitest';
import {
  normalizeSeed,
  parseSeedFromQuery,
  createDeterministicRng,
  createRunRng,
} from '../../../src/utils/rng.js';

describe('rng utilities', () => {
  it('normalizes seeds to uint32', () => {
    expect(normalizeSeed(123.9)).toBe(123);
    expect(normalizeSeed(-1)).toBe(4294967295);
    expect(normalizeSeed('not-a-number', 99)).toBe(99);
  });

  it('parses ?seed from query string', () => {
    expect(parseSeedFromQuery('?seed=42')).toBe(42);
    expect(parseSeedFromQuery('?foo=1&seed=7')).toBe(7);
    expect(parseSeedFromQuery('?seed=-1')).toBe(4294967295);
    expect(parseSeedFromQuery('?seed=abc')).toBe(null);
    expect(parseSeedFromQuery('')).toBe(null);
  });

  it('produces stable deterministic sequence for same seed', () => {
    const rngA = createDeterministicRng(12345);
    const rngB = createDeterministicRng(12345);
    const seqA = Array.from({ length: 8 }, () => rngA());
    const seqB = Array.from({ length: 8 }, () => rngB());
    expect(seqA).toEqual(seqB);
  });

  it('createRunRng tracks draws and helper outputs', () => {
    const run = createRunRng({ deterministic: true, seed: 2026 });
    const a = run.random();
    const b = run.randomRange(10, 20);
    const c = run.randomInt(5);

    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(b).toBeGreaterThanOrEqual(10);
    expect(b).toBeLessThan(20);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(5);
    expect(run.getDrawCount()).toBe(3);
  });
});
