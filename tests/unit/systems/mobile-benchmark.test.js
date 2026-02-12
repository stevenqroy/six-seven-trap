import { describe, it, expect } from 'vitest';
import {
  computeFrameMetrics,
  evaluateBenchmarkChecks,
  computeRelativeSpread,
  evaluateRepeatability,
} from '../../../src/systems/mobile-benchmark.js';

describe('mobile benchmark metrics', () => {
  it('computes fps, percentiles, and spike burst stats', () => {
    const metrics = computeFrameMetrics(
      [16, 17, 55, 60, 14, 16, 52, 53, 54, 15],
      { sustainedWindowMs: 100, spikeThresholdMs: 50 }
    );

    expect(metrics.frames).toBe(10);
    expect(metrics.avgMs).toBeCloseTo(35.2, 6);
    expect(metrics.avgFps).toBeCloseTo(28.4091, 3);
    expect(metrics.minMs).toBe(14);
    expect(metrics.maxMs).toBe(60);
    expect(metrics.p50Ms).toBe(17);
    expect(metrics.p95Ms).toBe(60);
    expect(metrics.spikes.count).toBe(5);
    expect(metrics.spikes.maxBurstMs).toBe(159);
    expect(metrics.sustained.worstAvgMs).toBeGreaterThan(40);
  });

  it('evaluates pass/fail checks against configured thresholds', () => {
    const metrics = computeFrameMetrics(
      [16, 16, 17, 16, 16, 16, 16, 17, 16, 16, 16, 16],
      { sustainedWindowMs: 120, spikeThresholdMs: 50 }
    );
    const evaluation = evaluateBenchmarkChecks(metrics, {
      minAverageFps: 45,
      minSustainedFps: 45,
      maxSpikeBurstMs: 2000,
      sustainedWindowMs: 120,
      spikeThresholdMs: 50,
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.checks.every((check) => check.pass)).toBe(true);

    const strictEvaluation = evaluateBenchmarkChecks(metrics, {
      minAverageFps: 90,
      minSustainedFps: 90,
      maxSpikeBurstMs: 10,
      sustainedWindowMs: 120,
      spikeThresholdMs: 30,
    });
    expect(strictEvaluation.passed).toBe(false);
    expect(strictEvaluation.checks.some((check) => !check.pass)).toBe(true);
  });

  it('computes repeatability deltas and checks tolerance', () => {
    const spread = computeRelativeSpread([16, 16.8, 16.4]);
    expect(spread.ready).toBe(true);
    expect(spread.deltaRatio).toBeCloseTo(0.04878, 4);

    const repeatabilityPass = evaluateRepeatability([16, 16.4, 16.2], {
      maxDeltaRatio: 0.05,
    });
    expect(repeatabilityPass.pass).toBe(true);

    const repeatabilityFail = evaluateRepeatability([16, 19.5, 17.8], {
      maxDeltaRatio: 0.05,
    });
    expect(repeatabilityFail.pass).toBe(false);
  });
});
