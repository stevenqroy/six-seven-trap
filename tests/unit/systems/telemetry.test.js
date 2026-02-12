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
});
