# S7R-010 Mobile Benchmark Harness

This benchmark harness provides deterministic stress profiling for mobile runtime performance.

## Command

```bash
# Real browser benchmark (Playwright + vite)
npm run benchmark:mobile

# Fast deterministic smoke mode (no browser launch)
npm run benchmark:mobile -- --dry-run
```

## Output

Default output file:

`test-results/benchmarks/mobile-benchmark-summary.json`

Summary JSON includes:

1. Run config (`seed`, durations, viewport, thresholds)
2. Per-run frame metrics (FPS, percentiles, spike burst)
3. Per-run threshold checks (`pass`/`fail`)
4. Repeatability checks across seeded runs
5. Overall pass/fail status

## Thresholds

Defaults map to Phase 1 performance budgets:

1. `minAverageFps = 45`
2. `minSustainedFps = 45` (worst rolling `2000ms` window)
3. `maxSpikeBurstMs = 2000` for frames above `50ms`

Overrides are available via CLI:

```bash
npm run benchmark:mobile -- \
  --min-average-fps 50 \
  --min-sustained-fps 45 \
  --max-spike-burst-ms 1500
```

## Determinism

All runs use the same seeded URL (`?seed=<value>`) and deterministic stress input choreography to support repeatable performance comparisons.
