import { describe, it, expect } from 'vitest';
import {
  computeFrameMetrics,
  DEFAULT_BENCHMARK_THRESHOLDS,
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

  it('returns zeroed metrics for empty input and sanitizes non-finite samples', () => {
    const emptyMetrics = computeFrameMetrics([]);
    expect(emptyMetrics.frames).toBe(0);
    expect(emptyMetrics.totalMs).toBe(0);
    expect(emptyMetrics.avgMs).toBe(0);
    expect(emptyMetrics.avgFps).toBe(0);
    expect(emptyMetrics.minMs).toBe(0);
    expect(emptyMetrics.maxMs).toBe(0);
    expect(emptyMetrics.p50Ms).toBe(0);
    expect(emptyMetrics.p99Ms).toBe(0);
    expect(emptyMetrics.over16Ratio).toBe(0);
    expect(emptyMetrics.spikes.count).toBe(0);
    expect(emptyMetrics.sustained.ready).toBe(false);

    const sanitized = computeFrameMetrics([NaN, Infinity, -Infinity, -1, 0, null, 16, 17]);
    expect(sanitized.frames).toBe(2);
    expect(sanitized.totalMs).toBe(33);
    expect(sanitized.avgMs).toBeCloseTo(16.5, 6);
    expect(sanitized.minMs).toBe(16);
    expect(sanitized.maxMs).toBe(17);
  });

  it('handles single-sample frame metrics', () => {
    const metrics = computeFrameMetrics([20]);
    expect(metrics.frames).toBe(1);
    expect(metrics.avgMs).toBe(20);
    expect(metrics.avgFps).toBeCloseTo(50, 6);
    expect(metrics.p50Ms).toBe(20);
    expect(metrics.p95Ms).toBe(20);
    expect(metrics.spikes.count).toBe(0);
    expect(metrics.sustained.ready).toBe(false);
  });

  it('tracks spike bursts and resets bursts on non-spike frames', () => {
    const metrics = computeFrameMetrics([60, 70, 20, 80, 90, 100, 10, 120], {
      spikeThresholdMs: 50,
    });
    expect(metrics.spikes.thresholdMs).toBe(50);
    expect(metrics.spikes.count).toBe(6);
    expect(metrics.spikes.totalMs).toBe(520);
    expect(metrics.spikes.maxBurstMs).toBe(270);
  });

  it('handles all-spike and no-spike frame sequences', () => {
    const allSpike = computeFrameMetrics([60, 55, 80], { spikeThresholdMs: 50 });
    expect(allSpike.spikes.count).toBe(3);
    expect(allSpike.spikes.maxBurstMs).toBe(195);

    const noSpike = computeFrameMetrics([10, 20, 30], { spikeThresholdMs: 50 });
    expect(noSpike.spikes.count).toBe(0);
    expect(noSpike.spikes.totalMs).toBe(0);
    expect(noSpike.spikes.maxBurstMs).toBe(0);
  });

  it('evaluates sustained windows for short duration, threshold boundary, and worst-window selection', () => {
    const notReady = computeFrameMetrics([100, 80, 50], { sustainedWindowMs: 100 });
    expect(notReady.sustained.windowMs).toBe(250);
    expect(notReady.sustained.ready).toBe(false);
    expect(notReady.sustained.windowSampleCount).toBe(3);

    const exactThreshold = computeFrameMetrics([100, 100, 50], { sustainedWindowMs: 250 });
    expect(exactThreshold.sustained.windowMs).toBe(250);
    expect(exactThreshold.sustained.ready).toBe(true);
    expect(exactThreshold.sustained.windowSampleCount).toBe(3);
    expect(exactThreshold.sustained.worstAvgMs).toBeCloseTo((100 + 100 + 50) / 3, 6);

    const worstWindow = computeFrameMetrics([40, 40, 40, 100, 100, 100, 40, 40], {
      sustainedWindowMs: 250,
    });
    expect(worstWindow.sustained.ready).toBe(true);
    expect(worstWindow.sustained.windowSampleCount).toBe(3);
    expect(worstWindow.sustained.worstAvgMs).toBe(100);
    expect(worstWindow.sustained.worstFps).toBeCloseTo(10, 6);
  });

  it('falls back to default thresholds when overrides are non-finite', () => {
    const evaluation = evaluateBenchmarkChecks(
      {
        avgFps: 60,
        sustained: { worstFps: 60 },
        spikes: { maxBurstMs: 100 },
      },
      {
        minAverageFps: NaN,
        minSustainedFps: undefined,
        maxSpikeBurstMs: Infinity,
        sustainedWindowMs: 100,
        spikeThresholdMs: 5,
      }
    );

    expect(evaluation.thresholds.minAverageFps).toBe(DEFAULT_BENCHMARK_THRESHOLDS.minAverageFps);
    expect(evaluation.thresholds.minSustainedFps).toBe(DEFAULT_BENCHMARK_THRESHOLDS.minSustainedFps);
    expect(evaluation.thresholds.maxSpikeBurstMs).toBe(DEFAULT_BENCHMARK_THRESHOLDS.maxSpikeBurstMs);
    expect(evaluation.thresholds.sustainedWindowMs).toBe(250);
    expect(evaluation.thresholds.spikeThresholdMs).toBe(10);
  });

  it('evaluates all-pass, all-fail, and mixed benchmark checks', () => {
    const allPass = evaluateBenchmarkChecks({
      avgFps: 60,
      sustained: { worstFps: 58 },
      spikes: { maxBurstMs: 100 },
    });
    expect(allPass.passed).toBe(true);
    expect(allPass.checks.every((check) => check.pass)).toBe(true);

    const allFail = evaluateBenchmarkChecks({
      avgFps: 10,
      sustained: { worstFps: 9 },
      spikes: { maxBurstMs: 5000 },
    });
    expect(allFail.passed).toBe(false);
    expect(allFail.checks.every((check) => !check.pass)).toBe(true);

    const mixed = evaluateBenchmarkChecks({
      avgFps: 52,
      sustained: { worstFps: 30 },
      spikes: { maxBurstMs: 120 },
    });
    expect(mixed.passed).toBe(false);
    expect(mixed.checks.find((check) => check.id === 'avg-fps').pass).toBe(true);
    expect(mixed.checks.find((check) => check.id === 'sustained-fps').pass).toBe(false);
    expect(mixed.checks.find((check) => check.id === 'spike-burst').pass).toBe(true);
  });

  it('computes spread for single, identical, mixed non-finite, and empty inputs', () => {
    const single = computeRelativeSpread([42]);
    expect(single.ready).toBe(false);
    expect(single.count).toBe(1);
    expect(single.deltaRatio).toBe(0);

    const identical = computeRelativeSpread([12, 12, 12]);
    expect(identical.ready).toBe(true);
    expect(identical.count).toBe(3);
    expect(identical.deltaRatio).toBe(0);

    const mixed = computeRelativeSpread([10, NaN, 20, Infinity, 30, -Infinity]);
    expect(mixed.ready).toBe(true);
    expect(mixed.count).toBe(3);
    expect(mixed.min).toBe(10);
    expect(mixed.max).toBe(30);
    expect(mixed.mean).toBe(20);
    expect(mixed.deltaRatio).toBeCloseTo(1, 6);

    const empty = computeRelativeSpread([]);
    expect(empty.ready).toBe(false);
    expect(empty.count).toBe(0);
    expect(empty.deltaRatio).toBe(0);
  });

  it('evaluates repeatability for not-ready, within-tolerance, and over-tolerance inputs', () => {
    const notReady = evaluateRepeatability([100], { maxDeltaRatio: 0.01 });
    expect(notReady.pass).toBe(true);
    expect(notReady.actual).toBe(0);

    const withinTolerance = evaluateRepeatability([100, 105, 95], { maxDeltaRatio: 0.12 });
    expect(withinTolerance.pass).toBe(true);

    const exceedsTolerance = evaluateRepeatability([100, 130, 70], { maxDeltaRatio: 0.12 });
    expect(exceedsTolerance.pass).toBe(false);
  });
});
