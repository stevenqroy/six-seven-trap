const DEFAULT_SUSTAINED_WINDOW_MS = 2000;
const DEFAULT_SPIKE_THRESHOLD_MS = 50;

export const DEFAULT_BENCHMARK_THRESHOLDS = Object.freeze({
  minAverageFps: 45,
  minSustainedFps: 45,
  maxSpikeBurstMs: 2000,
  sustainedWindowMs: DEFAULT_SUSTAINED_WINDOW_MS,
  spikeThresholdMs: DEFAULT_SPIKE_THRESHOLD_MS,
});

export const DEFAULT_REPEATABILITY_MAX_DELTA = 0.12;

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function percentileNearestRank(sortedValues, percentile) {
  if (!sortedValues.length) return 0;
  const p = Math.max(0, Math.min(1, percentile));
  const rank = Math.ceil(p * sortedValues.length);
  const index = Math.max(0, Math.min(sortedValues.length - 1, rank - 1));
  return sortedValues[index];
}

function sanitizeFrameSamples(frameSamplesMs) {
  if (!Array.isArray(frameSamplesMs)) return [];
  const samples = [];
  for (let i = 0; i < frameSamplesMs.length; i++) {
    const ms = toFinite(frameSamplesMs[i], 0);
    if (ms > 0) samples.push(ms);
  }
  return samples;
}

function computeSpikeStats(samples, spikeThresholdMs) {
  let count = 0;
  let totalMs = 0;
  let maxBurstMs = 0;
  let currentBurstMs = 0;

  for (let i = 0; i < samples.length; i++) {
    const ms = samples[i];
    if (ms > spikeThresholdMs) {
      count += 1;
      totalMs += ms;
      currentBurstMs += ms;
      if (currentBurstMs > maxBurstMs) maxBurstMs = currentBurstMs;
    } else {
      currentBurstMs = 0;
    }
  }

  return {
    thresholdMs: spikeThresholdMs,
    count,
    totalMs,
    maxBurstMs,
  };
}

function computeWorstSustainedWindow(samples, sustainedWindowMs) {
  const safeWindowMs = Math.max(250, toFinite(sustainedWindowMs, DEFAULT_SUSTAINED_WINDOW_MS));
  if (!samples.length) {
    return {
      windowMs: safeWindowMs,
      ready: false,
      worstAvgMs: 0,
      worstFps: 0,
      windowSampleCount: 0,
    };
  }

  let start = 0;
  let windowDurationMs = 0;
  let windowTotalMs = 0;
  let worstAvgMs = Number.NEGATIVE_INFINITY;
  let worstSampleCount = 0;
  let hasReadyWindow = false;

  for (let end = 0; end < samples.length; end++) {
    const ms = samples[end];
    windowDurationMs += ms;
    windowTotalMs += ms;

    while (start < end && windowDurationMs - samples[start] >= safeWindowMs) {
      windowDurationMs -= samples[start];
      windowTotalMs -= samples[start];
      start += 1;
    }

    if (windowDurationMs >= safeWindowMs) {
      hasReadyWindow = true;
      const sampleCount = end - start + 1;
      const avgMs = windowTotalMs / sampleCount;
      if (avgMs > worstAvgMs) {
        worstAvgMs = avgMs;
        worstSampleCount = sampleCount;
      }
    }
  }

  if (!hasReadyWindow) {
    let totalMs = 0;
    for (let i = 0; i < samples.length; i++) totalMs += samples[i];
    const avgMs = totalMs / samples.length;
    return {
      windowMs: safeWindowMs,
      ready: false,
      worstAvgMs: avgMs,
      worstFps: avgMs > 0 ? 1000 / avgMs : 0,
      windowSampleCount: samples.length,
    };
  }

  return {
    windowMs: safeWindowMs,
    ready: true,
    worstAvgMs,
    worstFps: worstAvgMs > 0 ? 1000 / worstAvgMs : 0,
    windowSampleCount: worstSampleCount,
  };
}

export function computeFrameMetrics(
  frameSamplesMs,
  {
    sustainedWindowMs = DEFAULT_SUSTAINED_WINDOW_MS,
    spikeThresholdMs = DEFAULT_SPIKE_THRESHOLD_MS,
  } = {}
) {
  const samples = sanitizeFrameSamples(frameSamplesMs);
  if (!samples.length) {
    return {
      frames: 0,
      totalMs: 0,
      avgMs: 0,
      avgFps: 0,
      minMs: 0,
      maxMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      over16ms: 0,
      over33ms: 0,
      over16Ratio: 0,
      over33Ratio: 0,
      spikes: computeSpikeStats([], spikeThresholdMs),
      sustained: computeWorstSustainedWindow([], sustainedWindowMs),
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  let totalMs = 0;
  let over16ms = 0;
  let over33ms = 0;
  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = 0;

  for (let i = 0; i < samples.length; i++) {
    const ms = samples[i];
    totalMs += ms;
    if (ms < minMs) minMs = ms;
    if (ms > maxMs) maxMs = ms;
    if (ms > 16.7) over16ms += 1;
    if (ms > 33.3) over33ms += 1;
  }

  const avgMs = totalMs / samples.length;
  return {
    frames: samples.length,
    totalMs,
    avgMs,
    avgFps: avgMs > 0 ? 1000 / avgMs : 0,
    minMs,
    maxMs,
    p50Ms: percentileNearestRank(sorted, 0.5),
    p90Ms: percentileNearestRank(sorted, 0.9),
    p95Ms: percentileNearestRank(sorted, 0.95),
    p99Ms: percentileNearestRank(sorted, 0.99),
    over16ms,
    over33ms,
    over16Ratio: over16ms / samples.length,
    over33Ratio: over33ms / samples.length,
    spikes: computeSpikeStats(samples, spikeThresholdMs),
    sustained: computeWorstSustainedWindow(samples, sustainedWindowMs),
  };
}

function makeCheck({
  id,
  label,
  pass,
  actual,
  expected,
  operator,
}) {
  return { id, label, pass, actual, expected, operator };
}

export function evaluateBenchmarkChecks(metrics, thresholds = {}) {
  const safeThresholds = {
    minAverageFps: toFinite(thresholds.minAverageFps, DEFAULT_BENCHMARK_THRESHOLDS.minAverageFps),
    minSustainedFps: toFinite(
      thresholds.minSustainedFps,
      DEFAULT_BENCHMARK_THRESHOLDS.minSustainedFps
    ),
    maxSpikeBurstMs: toFinite(
      thresholds.maxSpikeBurstMs,
      DEFAULT_BENCHMARK_THRESHOLDS.maxSpikeBurstMs
    ),
    sustainedWindowMs: Math.max(
      250,
      toFinite(thresholds.sustainedWindowMs, DEFAULT_BENCHMARK_THRESHOLDS.sustainedWindowMs)
    ),
    spikeThresholdMs: Math.max(
      10,
      toFinite(thresholds.spikeThresholdMs, DEFAULT_BENCHMARK_THRESHOLDS.spikeThresholdMs)
    ),
  };

  const checks = [
    makeCheck({
      id: 'avg-fps',
      label: 'Average FPS meets stress floor',
      pass: metrics.avgFps >= safeThresholds.minAverageFps,
      actual: metrics.avgFps,
      expected: safeThresholds.minAverageFps,
      operator: '>=',
    }),
    makeCheck({
      id: 'sustained-fps',
      label: 'Sustained FPS meets stress floor',
      pass: metrics.sustained.worstFps >= safeThresholds.minSustainedFps,
      actual: metrics.sustained.worstFps,
      expected: safeThresholds.minSustainedFps,
      operator: '>=',
    }),
    makeCheck({
      id: 'spike-burst',
      label: 'Frame-time spikes stay below max burst budget',
      pass: metrics.spikes.maxBurstMs <= safeThresholds.maxSpikeBurstMs,
      actual: metrics.spikes.maxBurstMs,
      expected: safeThresholds.maxSpikeBurstMs,
      operator: '<=',
    }),
  ];

  return {
    thresholds: safeThresholds,
    checks,
    passed: checks.every((check) => check.pass),
  };
}

export function computeRelativeSpread(values) {
  const safeValues = Array.isArray(values) ? values.filter((value) => Number.isFinite(value)) : [];
  if (!safeValues.length) {
    return {
      ready: false,
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      deltaRatio: 0,
    };
  }

  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < safeValues.length; i++) {
    const value = safeValues[i];
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const mean = sum / safeValues.length;
  const delta = max - min;
  const base = Math.max(0.000001, Math.abs(mean));

  return {
    ready: safeValues.length > 1,
    count: safeValues.length,
    min,
    max,
    mean,
    deltaRatio: delta / base,
  };
}

export function evaluateRepeatability(
  values,
  {
    id = 'repeatability',
    label = 'Repeatability delta within tolerance',
    maxDeltaRatio = DEFAULT_REPEATABILITY_MAX_DELTA,
  } = {}
) {
  const spread = computeRelativeSpread(values);
  if (!spread.ready) {
    return makeCheck({
      id,
      label,
      pass: true,
      actual: spread.deltaRatio,
      expected: maxDeltaRatio,
      operator: '<=',
    });
  }

  return makeCheck({
    id,
    label,
    pass: spread.deltaRatio <= maxDeltaRatio,
    actual: spread.deltaRatio,
    expected: maxDeltaRatio,
    operator: '<=',
  });
}
