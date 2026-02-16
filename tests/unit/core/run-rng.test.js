import { describe, it, expect } from 'vitest';
import { createRunRngTracker } from '../../../src/core/run-rng.js';
import { createRunRng } from '../../../src/utils/rng.js';

describe('run-rng (S7R-088)', () => {
  describe('createRunRng (low-level)', () => {
    it('generates deterministic sequence when seeded', () => {
      const seed = 12345;
      const rng1 = createRunRng({ deterministic: true, seed });
      const rng2 = createRunRng({ deterministic: true, seed });

      const seq1 = [rng1.random(), rng1.random(), rng1.random()];
      const seq2 = [rng2.random(), rng2.random(), rng2.random()];

      expect(seq1).toEqual(seq2);
      expect(rng1.seed).toBe(12345);
    });

    it('generates different sequences without deterministic flag (even with seed)', () => {
      // Note: createRunRng currently uses Math.random() if deterministic is false, ignoring seed
      const seed = 12345;
      const rng1 = createRunRng({ deterministic: false, seed });
      const rng2 = createRunRng({ deterministic: false, seed });

      // Math.random() is extremely unlikely to produce the same sequence
      const val1 = rng1.random();
      const val2 = rng2.random();
      expect(val1).not.toBe(val2);
    });

    it('increments draw count', () => {
      const rng = createRunRng({ deterministic: true, seed: 1 });
      expect(rng.getDrawCount()).toBe(0);
      rng.random();
      expect(rng.getDrawCount()).toBe(1);
      rng.random();
      rng.random();
      expect(rng.getDrawCount()).toBe(3);
    });
  });

  describe('createRunRngTracker (high-level)', () => {
    it('creates tracker with expected methods', () => {
      const tracker = createRunRngTracker();
      expect(typeof tracker.start).toBe('function');
      expect(typeof tracker.random).toBe('function');
      expect(typeof tracker.getDrawCount).toBe('function');
      expect(typeof tracker.logSummary).toBe('function');
    });

    it('resets draw count on start()', () => {
      const tracker = createRunRngTracker();
      tracker.start();
      tracker.random();
      tracker.random();
      expect(tracker.getDrawCount()).toBe(2);

      tracker.start('restart');
      expect(tracker.getDrawCount()).toBe(0);
    });

    it('respects deterministic flag provided via getter', () => {
      const getDeterministicFlag = () => true;
      const tracker = createRunRngTracker({ getDeterministicFlag });
      
      const run1 = tracker.start();
      expect(run1.deterministic).toBe(true);
    });

    it('prioritizes seed from search string over default', () => {
      const search = '?seed=999';
      const tracker = createRunRngTracker({ search });
      const run = tracker.start();

      expect(run.seed).toBe(999);
      expect(run.deterministic).toBe(true); // seedOverride implies deterministic

      const val1 = tracker.random();
      
      const tracker2 = createRunRngTracker({ search });
      tracker2.start();
      const val2 = tracker2.random();

      expect(val1).toBe(val2);
    });

    it('ignores invalid seed in search string', () => {
      const search = '?seed=invalid';
      const tracker = createRunRngTracker({ search });
      const run = tracker.start();

      // Should fallback to Date.now() and non-deterministic (unless flag says otherwise)
      // Since seedOverride is null, deterministic depends on getDeterministicFlag default (false)
      expect(run.deterministic).toBe(false);
    });

    it('ensures monotonic draw count increase', () => {
      const tracker = createRunRngTracker();
      tracker.start();
      const c1 = tracker.getDrawCount();
      tracker.random();
      const c2 = tracker.getDrawCount();
      expect(c2).toBeGreaterThan(c1);
    });
  });
});
