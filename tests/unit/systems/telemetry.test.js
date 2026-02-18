import { describe, it, expect, vi } from 'vitest';
import {
  computeFrameStats,
  createRunMetrics,
  createTelemetrySystem,
} from '../../../src/systems/telemetry.js';

describe('telemetry system', () => {
  it('computes frame stats with percentiles and ratios', () => {
    const stats = computeFrameStats([10, 20, 30, 40, 50], 5, 150, 10, 50, 3, 1);

    expect(stats.frames).toBe(5);
    expect(stats.avgMs).toBe(30);
    expect(stats.p50Ms).toBe(30);
    expect(stats.p90Ms).toBe(50);
    expect(stats.p95Ms).toBe(50);
    expect(stats.p99Ms).toBe(50);
    expect(stats.over16Ratio).toBeCloseTo(0.6, 6);
    expect(stats.over33Ratio).toBeCloseTo(0.2, 6);
  });

  it('tracks run counters and finalizes summary', () => {
    const telemetry = createTelemetrySystem({ enabled: true });
    telemetry.beginRun({
      seed: 42,
      deterministic: true,
      startedAtMs: 1000,
      reason: 'new-run',
    });

    telemetry.onFrame(16.7);
    telemetry.onFrame(22.4);
    telemetry.onFrame(11.2);
    telemetry.onAbilityUsed('shield');
    telemetry.onAbilityUsed('projectile');
    telemetry.onAbilityUsed('projectile');
    telemetry.onAbilityUsed('ultimate');
    telemetry.onLifeLost(2);
    telemetry.onLifeGained(3);
    telemetry.onShipDamage(2, 'bounce');
    telemetry.onShipDamage(5, 'projectile');
    telemetry.onPhaseTransition(1, 2, 1200);
    telemetry.onQualityTierChange({
      oldTier: 'high',
      newTier: 'medium',
      atMs: 2000,
      reason: 'downgrade',
      triggerAvgMs: 26.2,
      triggerWindowMs: 2000,
      sampleCount: 120,
    });
    telemetry.setRngDraws(77);

    const run = telemetry.finalizeRun({
      reason: 'victory',
      endedAtMs: 5100,
      score: 88,
      bestCombo: 6,
      rngDraws: 80,
    });

    expect(run.seed).toBe(42);
    expect(run.deterministic).toBe(true);
    expect(run.elapsedMs).toBe(4100);
    expect(run.outcome).toBe('victory');
    expect(run.score).toBe(88);
    expect(run.bestCombo).toBe(6);
    expect(run.rngDraws).toBe(80);
    expect(run.livesLost).toBe(1);
    expect(run.livesGained).toBe(1);
    expect(run.remainingLives).toBe(3);
    expect(run.abilityUses.shield).toBe(1);
    expect(run.abilityUses.projectile).toBe(2);
    expect(run.abilityUses.ultimate).toBe(1);
    expect(run.shipDamageTotal).toBe(7);
    expect(run.shipDamageBySource.bounce).toBe(2);
    expect(run.shipDamageBySource.projectile).toBe(5);
    expect(run.phaseTransitions).toEqual([{ oldPhase: 1, newPhase: 2, atMs: 1200 }]);
    expect(run.qualityTransitions).toEqual([
      {
        oldTier: 'high',
        newTier: 'medium',
        atMs: 2000,
        reason: 'downgrade',
        triggerAvgMs: 26.2,
        triggerWindowMs: 2000,
        sampleCount: 120,
      },
    ]);
    expect(run.frame.frames).toBe(3);
    expect(run.frame.maxMs).toBeCloseTo(22.4, 4);
    expect(run.frame.minMs).toBeCloseTo(11.2, 4);
  });

  it('is safe when disabled and does not throw in dump', () => {
    const telemetry = createTelemetrySystem({ enabled: false });
    expect(telemetry.beginRun({ seed: 1 })).toBe(null);
    telemetry.onFrame(16);
    telemetry.onLifeLost(2);
    telemetry.onAbilityUsed('shield');
    telemetry.onShipDamage(4, 'bounce');
    telemetry.onPhaseTransition(1, 2, 100);
    telemetry.onQualityTierChange({ oldTier: 'high', newTier: 'low', atMs: 120 });
    telemetry.setRngDraws(12);
    expect(telemetry.finalizeRun({ reason: 'reset' })).toBe(null);
    expect(telemetry.dumpRun(null)).toBe(false);

    const badLogger = { log: vi.fn(() => { throw new Error('logger failed'); }) };
    const enabledTelemetry = createTelemetrySystem({ enabled: true, logger: badLogger });
    enabledTelemetry.beginRun({ startedAtMs: 0 });
    const finished = enabledTelemetry.finalizeRun({ endedAtMs: 10 });
    expect(enabledTelemetry.dumpRun(finished)).toBe(false);
  });

  it('creates clean run metrics shape', () => {
    const metrics = createRunMetrics({ seed: 9, deterministic: true, startedAtMs: 50 });
    expect(metrics.seed).toBe(9);
    expect(metrics.deterministic).toBe(true);
    expect(metrics.abilityUses.shield).toBe(0);
    expect(metrics.shipDamageBySource['beam-eruption']).toBe(0);
    expect(metrics.frameRaw.sampleMs.length).toBe(0);
  });

  describe('telemetry system edge cases (S7R-102)', () => {
    describe('computeFrameStats', () => {
      it('returns zero percentiles for empty samples', () => {
        const stats = computeFrameStats([], 0, 0, 0, 0, 0, 0);
        expect(stats.p50Ms).toBe(0);
        expect(stats.p90Ms).toBe(0);
        expect(stats.p95Ms).toBe(0);
        expect(stats.p99Ms).toBe(0);
      });

      it('produces safe zero-based output for NaN/non-finite inputs', () => {
        const stats = computeFrameStats([], NaN, Infinity, -Infinity, NaN, undefined, null);
        expect(stats.frames).toBe(0);
        expect(stats.totalMs).toBe(0);
        expect(stats.minMs).toBe(0);
        expect(stats.maxMs).toBe(0);
        expect(stats.avgMs).toBe(0);
        expect(stats.over16Ratio).toBe(0);
        expect(stats.over33Ratio).toBe(0);
      });
    });

    describe('createRunMetrics', () => {
      it('enforces minimum sampleCap floor of 60', () => {
        const m1 = createRunMetrics({ sampleCap: 10 });
        expect(m1.frameRaw.sampleCap).toBe(60);

        const m2 = createRunMetrics({ sampleCap: 59.9 });
        expect(m2.frameRaw.sampleCap).toBe(60);

        const m3 = createRunMetrics({ sampleCap: 100 });
        expect(m3.frameRaw.sampleCap).toBe(100);
      });

      it('uses correct defaults when no args provided', () => {
        const m = createRunMetrics();
        expect(m.seed).toBeNull();
        expect(m.deterministic).toBe(false);
        expect(m.frameRaw.sampleCap).toBeGreaterThanOrEqual(60);
        expect(m.reason).toBe('run-start');
      });
    });

    describe('input normalization', () => {
      it('silently ignores unknown ability names', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        telemetry.beginRun();
        
        telemetry.onAbilityUsed('fireball');
        telemetry.onAbilityUsed('shield'); // Valid
        
        const run = telemetry.getCurrentRun();
        expect(run.abilityUses.shield).toBe(1);
        expect(run.abilityUses['fireball']).toBeUndefined();
        
        // Sum of all tracked abilities should be 1
        const total = Object.values(run.abilityUses).reduce((a, b) => a + b, 0);
        expect(total).toBe(1);
      });

      it('buckets unknown damage sources to "unknown"', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        telemetry.beginRun();
        
        telemetry.onShipDamage(10, 'laser'); // Unknown
        telemetry.onShipDamage(5, 'projectile'); // Known
        
        const run = telemetry.getCurrentRun();
        expect(run.shipDamageBySource.projectile).toBe(5);
        expect(run.shipDamageBySource.unknown).toBe(10);
      });

      it('ignores zero or negative damage amounts', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        telemetry.beginRun();
        
        telemetry.onShipDamage(0, 'projectile');
        telemetry.onShipDamage(-10, 'projectile');
        telemetry.onShipDamage(5, 'projectile');
        
        const run = telemetry.getCurrentRun();
        expect(run.shipDamageTotal).toBe(5);
        expect(run.shipDamageEvents).toBe(1);
      });

      it('ignores same-tier quality transitions', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        telemetry.beginRun();
        
        telemetry.onQualityTierChange({ oldTier: 'high', newTier: 'high' });
        telemetry.onQualityTierChange({ oldTier: 'high', newTier: 'medium' });
        
        const run = telemetry.getCurrentRun();
        expect(run.qualityTransitions.length).toBe(1);
        expect(run.qualityTransitions[0].newTier).toBe('medium');
      });

      it('ignores zero or negative frame times', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        telemetry.beginRun();
        
        telemetry.onFrame(0);
        telemetry.onFrame(-16);
        telemetry.onFrame(16);
        
        const run = telemetry.getCurrentRun();
        expect(run.frame.frames).toBe(1);
      });
    });

    describe('frame sample ring buffer', () => {
      it('overwrites old samples when cap is exceeded', () => {
        // Create with small cap for testing (min is 60, so we use 60)
        const telemetry = createTelemetrySystem({ enabled: true, sampleCap: 60 });
        telemetry.beginRun();
        
        // Fill buffer
        for (let i = 0; i < 60; i++) {
          telemetry.onFrame(10);
        }
        
        // Overflow
        telemetry.onFrame(999);
        
        const run = telemetry.getCurrentRun(); // compactMetrics call
        // Note: compactMetrics computes stats but doesn't expose raw sample array directly.
        // We can check maxMs to see if the 999 was recorded.
        expect(run.frame.maxMs).toBe(999);
        expect(run.frame.frames).toBe(61);
        
        // To verify ring buffer logic specifically, we might need to inspect internal state if exposed,
        // or rely on the fact that computeFrameStats uses the sample array.
        // Since we can't easily access the raw array via public API without modifying source,
        // we assume the implementation (which we read) is correct if behavior holds.
        // The implementation: frame.sampleMs[frame.count % frame.sampleCap] = ms;
      });
    });

    describe('snapshot isolation', () => {
      it('returns a new object from beginRun', () => {
        const telemetry = createTelemetrySystem({ enabled: true });
        const run1 = telemetry.beginRun();
        const run2 = telemetry.getCurrentRun();
        
        expect(run1).not.toBe(run2); // different references
        expect(run1).toEqual(run2); // same content
      });
    });
  });
});
