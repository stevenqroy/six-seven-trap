#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

import { createDeterministicRng, normalizeSeed } from '../src/utils/rng.js';
import {
  DEFAULT_BENCHMARK_THRESHOLDS,
  DEFAULT_REPEATABILITY_MAX_DELTA,
  computeFrameMetrics,
  evaluateBenchmarkChecks,
  evaluateRepeatability,
} from '../src/systems/mobile-benchmark.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT_PATH = 'test-results/benchmarks/mobile-benchmark-summary.json';
const TICKET_ID = 'S7R-010';

const DEFAULT_OPTIONS = Object.freeze({
  seed: 2026,
  iterations: 2,
  warmupMs: 3000,
  durationMs: 15000,
  stepMs: 16,
  sweepPeriodMs: 2800,
  width: 390,
  height: 844,
  host: '127.0.0.1',
  port: 4173,
  output: DEFAULT_OUTPUT_PATH,
  dryRun: false,
  baseUrl: '',
  maxRepeatabilityDelta: DEFAULT_REPEATABILITY_MAX_DELTA,
  thresholds: DEFAULT_BENCHMARK_THRESHOLDS,
});

const HELP_TEXT = `
Usage: node scripts/mobile-benchmark.mjs [options]

Options:
  --seed <int>                    Deterministic run seed (default: 2026)
  --iterations <int>              Number of benchmark runs (default: 2)
  --warmup-ms <int>               Warmup duration per run (default: 3000)
  --duration-ms <int>             Measurement duration per run (default: 15000)
  --step-ms <int>                 Input loop step interval (default: 16)
  --sweep-period-ms <int>         Horizontal sweep period (default: 2800)
  --width <int>                   Mobile viewport width (default: 390)
  --height <int>                  Mobile viewport height (default: 844)
  --host <host>                   Local host for vite server (default: 127.0.0.1)
  --port <int>                    Preferred vite port when auto-starting (default: 4173)
  --base-url <url>                Reuse an existing server URL instead of auto-starting vite
  --output <path>                 JSON summary output path (default: ${DEFAULT_OUTPUT_PATH})
  --dry-run                       Use deterministic synthetic samples (no browser launch)
  --max-repeatability-delta <n>   Maximum spread ratio across runs (default: 0.12)
  --min-average-fps <n>           Threshold override (default: 45)
  --min-sustained-fps <n>         Threshold override (default: 45)
  --max-spike-burst-ms <n>        Threshold override (default: 2000)
  --sustained-window-ms <n>       Threshold override (default: 2000)
  --spike-threshold-ms <n>        Threshold override (default: 50)
  --help                          Show this help text
`;

function parseNumber(raw, fallback, { min = null, integer = false } = {}) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  let next = integer ? Math.floor(parsed) : parsed;
  if (min !== null) next = Math.max(min, next);
  return next;
}

function parseArgs(argv) {
  const options = {
    ...DEFAULT_OPTIONS,
    thresholds: { ...DEFAULT_OPTIONS.thresholds },
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextValue = () => {
      const value = argv[i + 1];
      i += 1;
      return value;
    };

    if (arg === '--help' || arg === '-h') {
      return { options, help: true };
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--seed') {
      options.seed = normalizeSeed(parseNumber(nextValue(), options.seed, { integer: true }));
      continue;
    }
    if (arg.startsWith('--seed=')) {
      options.seed = normalizeSeed(parseNumber(arg.slice('--seed='.length), options.seed, { integer: true }));
      continue;
    }

    if (arg === '--iterations') {
      options.iterations = parseNumber(nextValue(), options.iterations, { min: 1, integer: true });
      continue;
    }
    if (arg.startsWith('--iterations=')) {
      options.iterations = parseNumber(arg.slice('--iterations='.length), options.iterations, {
        min: 1,
        integer: true,
      });
      continue;
    }

    if (arg === '--warmup-ms') {
      options.warmupMs = parseNumber(nextValue(), options.warmupMs, { min: 0, integer: true });
      continue;
    }
    if (arg.startsWith('--warmup-ms=')) {
      options.warmupMs = parseNumber(arg.slice('--warmup-ms='.length), options.warmupMs, {
        min: 0,
        integer: true,
      });
      continue;
    }

    if (arg === '--duration-ms') {
      options.durationMs = parseNumber(nextValue(), options.durationMs, { min: 500, integer: true });
      continue;
    }
    if (arg.startsWith('--duration-ms=')) {
      options.durationMs = parseNumber(arg.slice('--duration-ms='.length), options.durationMs, {
        min: 500,
        integer: true,
      });
      continue;
    }

    if (arg === '--step-ms') {
      options.stepMs = parseNumber(nextValue(), options.stepMs, { min: 4, integer: true });
      continue;
    }
    if (arg.startsWith('--step-ms=')) {
      options.stepMs = parseNumber(arg.slice('--step-ms='.length), options.stepMs, {
        min: 4,
        integer: true,
      });
      continue;
    }

    if (arg === '--sweep-period-ms') {
      options.sweepPeriodMs = parseNumber(nextValue(), options.sweepPeriodMs, { min: 400, integer: true });
      continue;
    }
    if (arg.startsWith('--sweep-period-ms=')) {
      options.sweepPeriodMs = parseNumber(arg.slice('--sweep-period-ms='.length), options.sweepPeriodMs, {
        min: 400,
        integer: true,
      });
      continue;
    }

    if (arg === '--width') {
      options.width = parseNumber(nextValue(), options.width, { min: 240, integer: true });
      continue;
    }
    if (arg.startsWith('--width=')) {
      options.width = parseNumber(arg.slice('--width='.length), options.width, { min: 240, integer: true });
      continue;
    }

    if (arg === '--height') {
      options.height = parseNumber(nextValue(), options.height, { min: 320, integer: true });
      continue;
    }
    if (arg.startsWith('--height=')) {
      options.height = parseNumber(arg.slice('--height='.length), options.height, { min: 320, integer: true });
      continue;
    }

    if (arg === '--host') {
      options.host = String(nextValue() || options.host);
      continue;
    }
    if (arg.startsWith('--host=')) {
      options.host = String(arg.slice('--host='.length) || options.host);
      continue;
    }

    if (arg === '--port') {
      options.port = parseNumber(nextValue(), options.port, { min: 1, integer: true });
      continue;
    }
    if (arg.startsWith('--port=')) {
      options.port = parseNumber(arg.slice('--port='.length), options.port, { min: 1, integer: true });
      continue;
    }

    if (arg === '--base-url') {
      options.baseUrl = String(nextValue() || '').trim();
      continue;
    }
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = String(arg.slice('--base-url='.length) || '').trim();
      continue;
    }

    if (arg === '--output') {
      options.output = String(nextValue() || options.output);
      continue;
    }
    if (arg.startsWith('--output=')) {
      options.output = String(arg.slice('--output='.length) || options.output);
      continue;
    }

    if (arg === '--max-repeatability-delta') {
      options.maxRepeatabilityDelta = parseNumber(nextValue(), options.maxRepeatabilityDelta, { min: 0 });
      continue;
    }
    if (arg.startsWith('--max-repeatability-delta=')) {
      options.maxRepeatabilityDelta = parseNumber(
        arg.slice('--max-repeatability-delta='.length),
        options.maxRepeatabilityDelta,
        { min: 0 }
      );
      continue;
    }

    if (arg === '--min-average-fps') {
      options.thresholds.minAverageFps = parseNumber(nextValue(), options.thresholds.minAverageFps, { min: 1 });
      continue;
    }
    if (arg.startsWith('--min-average-fps=')) {
      options.thresholds.minAverageFps = parseNumber(
        arg.slice('--min-average-fps='.length),
        options.thresholds.minAverageFps,
        { min: 1 }
      );
      continue;
    }

    if (arg === '--min-sustained-fps') {
      options.thresholds.minSustainedFps = parseNumber(nextValue(), options.thresholds.minSustainedFps, { min: 1 });
      continue;
    }
    if (arg.startsWith('--min-sustained-fps=')) {
      options.thresholds.minSustainedFps = parseNumber(
        arg.slice('--min-sustained-fps='.length),
        options.thresholds.minSustainedFps,
        { min: 1 }
      );
      continue;
    }

    if (arg === '--max-spike-burst-ms') {
      options.thresholds.maxSpikeBurstMs = parseNumber(nextValue(), options.thresholds.maxSpikeBurstMs, { min: 1 });
      continue;
    }
    if (arg.startsWith('--max-spike-burst-ms=')) {
      options.thresholds.maxSpikeBurstMs = parseNumber(
        arg.slice('--max-spike-burst-ms='.length),
        options.thresholds.maxSpikeBurstMs,
        { min: 1 }
      );
      continue;
    }

    if (arg === '--sustained-window-ms') {
      options.thresholds.sustainedWindowMs = parseNumber(
        nextValue(),
        options.thresholds.sustainedWindowMs,
        { min: 250, integer: true }
      );
      continue;
    }
    if (arg.startsWith('--sustained-window-ms=')) {
      options.thresholds.sustainedWindowMs = parseNumber(
        arg.slice('--sustained-window-ms='.length),
        options.thresholds.sustainedWindowMs,
        { min: 250, integer: true }
      );
      continue;
    }

    if (arg === '--spike-threshold-ms') {
      options.thresholds.spikeThresholdMs = parseNumber(
        nextValue(),
        options.thresholds.spikeThresholdMs,
        { min: 1 }
      );
      continue;
    }
    if (arg.startsWith('--spike-threshold-ms=')) {
      options.thresholds.spikeThresholdMs = parseNumber(
        arg.slice('--spike-threshold-ms='.length),
        options.thresholds.spikeThresholdMs,
        { min: 1 }
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { options, help: false };
}

function buildOutputPath(outputPath) {
  if (!outputPath) return path.join(ROOT_DIR, DEFAULT_OUTPUT_PATH);
  return path.isAbsolute(outputPath) ? outputPath : path.join(ROOT_DIR, outputPath);
}

function buildBenchmarkUrl(baseUrl, seed) {
  const params = new URLSearchParams();
  params.set('seed', String(seed));
  params.set('flags', 'deterministicRNG:true,telemetry:true,adaptiveQuality:true,enemyRegistry:true');
  return `${baseUrl.replace(/\/$/, '')}/?${params.toString()}`;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function formatMetrics(metrics) {
  return {
    ...metrics,
    totalMs: round(metrics.totalMs, 3),
    avgMs: round(metrics.avgMs, 4),
    avgFps: round(metrics.avgFps, 4),
    minMs: round(metrics.minMs, 4),
    maxMs: round(metrics.maxMs, 4),
    p50Ms: round(metrics.p50Ms, 4),
    p90Ms: round(metrics.p90Ms, 4),
    p95Ms: round(metrics.p95Ms, 4),
    p99Ms: round(metrics.p99Ms, 4),
    over16Ratio: round(metrics.over16Ratio, 6),
    over33Ratio: round(metrics.over33Ratio, 6),
    spikes: {
      ...metrics.spikes,
      totalMs: round(metrics.spikes.totalMs, 3),
      maxBurstMs: round(metrics.spikes.maxBurstMs, 3),
    },
    sustained: {
      ...metrics.sustained,
      worstAvgMs: round(metrics.sustained.worstAvgMs, 4),
      worstFps: round(metrics.sustained.worstFps, 4),
    },
  };
}

function formatCheck(check) {
  return {
    ...check,
    actual: round(check.actual, 6),
    expected: round(check.expected, 6),
  };
}

function createDryRunSamples(seed, durationMs) {
  const rng = createDeterministicRng(seed);
  const samples = [];
  let elapsedMs = 0;

  while (elapsedMs < durationMs) {
    let frameMs = 16.2 + (rng() - 0.5) * 2.4;
    if (rng() < 0.018) frameMs += 10 + rng() * 5;
    if (rng() < 0.004) frameMs = 44 + rng() * 4;
    samples.push(frameMs);
    elapsedMs += frameMs;
  }

  return samples;
}

async function startViteServer(options) {
  const server = await createViteServer({
    root: ROOT_DIR,
    logLevel: 'error',
    server: {
      host: options.host,
      port: options.port,
      strictPort: false,
    },
  });

  await server.listen();
  const address = server.httpServer?.address();
  const port = address && typeof address === 'object' ? address.port : options.port;
  const baseUrl = `http://${options.host}:${port}`;
  return { server, baseUrl };
}

async function installTelemetryCapture(page) {
  await page.addInitScript(() => {
    window.__s7rBench = {
      telemetryLogs: [],
    };

    const originalLog = console.log.bind(console);
    console.log = (...args) => {
      try {
        if (
          args.length >= 2 &&
          args[0] === '[S7R:TELEMETRY]' &&
          args[1] &&
          typeof args[1] === 'object'
        ) {
          const clone = JSON.parse(JSON.stringify(args[1]));
          window.__s7rBench.telemetryLogs.push(clone);
        }
      } catch {
        // Benchmark capture should never interfere with game logging.
      }
      originalLog(...args);
    };
  });
}

async function clearTelemetryLogs(page) {
  await page.evaluate(() => {
    if (!window.__s7rBench) return;
    window.__s7rBench.telemetryLogs.length = 0;
  });
}

async function getLatestTelemetry(page) {
  return page.evaluate(() => {
    if (!window.__s7rBench || !Array.isArray(window.__s7rBench.telemetryLogs)) return null;
    if (!window.__s7rBench.telemetryLogs.length) return null;
    return window.__s7rBench.telemetryLogs[window.__s7rBench.telemetryLogs.length - 1];
  });
}

async function recoverGameplayState(page) {
  const restartButton = page.locator('#restartBigBtn');
  if (await restartButton.isVisible()) {
    await restartButton.click();
    await page.waitForTimeout(80);
  }

  const victoryButton = page.locator('#victoryPlayAgain');
  if (await victoryButton.isVisible()) {
    await victoryButton.click();
    await page.waitForTimeout(80);
  }

  const startButton = page.locator('#startGameBtn');
  if (await startButton.isVisible()) {
    await startButton.click();
    await page.waitForTimeout(100);
  }
}

async function tap(page, x, y) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(35);
  await page.mouse.up();
}

async function doubleTap(page, x, y) {
  await tap(page, x, y);
  await page.waitForTimeout(110);
  await tap(page, x, y);
}

async function hold(page, x, y, holdMs = 520) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

async function swipeUp(page, x, startY, endY) {
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, endY, { steps: 10 });
  await page.waitForTimeout(35);
  await page.mouse.up();
}

async function captureFrameSamples(page, { warmupMs, durationMs }) {
  return page.evaluate(
    async ({ warmupMs: nextWarmupMs, durationMs: nextDurationMs }) => {
      const warmup = Math.max(0, Number(nextWarmupMs) || 0);
      const duration = Math.max(0, Number(nextDurationMs) || 0);
      const total = warmup + duration;
      const samples = [];

      return new Promise((resolve) => {
        const startedAt = performance.now();
        let lastAt = startedAt;

        function step(now) {
          const frameMs = now - lastAt;
          lastAt = now;
          const elapsed = now - startedAt;
          if (elapsed >= warmup && elapsed <= total) {
            samples.push(frameMs);
          }
          if (elapsed >= total) {
            resolve(samples);
            return;
          }
          requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
      });
    },
    { warmupMs, durationMs }
  );
}

async function runStressScenario(page, options) {
  const totalMs = options.durationMs + options.warmupMs;
  const width = options.width;
  const height = options.height;
  const minX = Math.round(width * 0.08);
  const maxX = Math.round(width * 0.92);
  const sweepY = Math.round(height * 0.84);
  const swipeEndY = Math.round(height * 0.56);

  const startedAt = Date.now();
  let nextTapAt = startedAt + 1100;
  let nextDoubleTapAt = startedAt + 2400;
  let nextHoldAt = startedAt + 4600;
  let nextSwipeAt = startedAt + 7000;
  let nextRecoverAt = startedAt + 450;

  while (Date.now() - startedAt < totalMs) {
    const now = Date.now();
    const elapsed = now - startedAt;
    const phase = (elapsed % options.sweepPeriodMs) / options.sweepPeriodMs;
    const x = Math.round(minX + ((Math.sin(phase * Math.PI * 2) + 1) * 0.5) * (maxX - minX));

    await page.mouse.move(x, sweepY);

    if (now >= nextTapAt) {
      await tap(page, x, sweepY);
      nextTapAt += 1700;
    }

    if (now >= nextDoubleTapAt) {
      await doubleTap(page, x, sweepY);
      nextDoubleTapAt += 4800;
    }

    if (now >= nextHoldAt) {
      await hold(page, x, sweepY, 520);
      nextHoldAt += 7600;
    }

    if (now >= nextSwipeAt) {
      await swipeUp(page, x, sweepY, swipeEndY);
      nextSwipeAt += 9200;
    }

    if (now >= nextRecoverAt) {
      await recoverGameplayState(page);
      nextRecoverAt += 500;
    }

    await page.waitForTimeout(options.stepMs);
  }
}

function buildRunResult({
  iteration,
  mode,
  seed,
  metrics,
  evaluation,
  telemetry,
}) {
  return {
    iteration,
    mode,
    seed,
    metrics: formatMetrics(metrics),
    checks: evaluation.checks.map(formatCheck),
    passed: evaluation.passed,
    telemetry,
  };
}

function summarizeRunSeries(runs, options) {
  const avgMsValues = runs.map((run) => run.metrics.avgMs);
  const p95MsValues = runs.map((run) => run.metrics.p95Ms);
  const avgFpsValues = runs.map((run) => run.metrics.avgFps);

  const repeatabilityChecks = [
    evaluateRepeatability(avgMsValues, {
      id: 'repeatability-avg-ms',
      label: 'Average frame-time repeatability',
      maxDeltaRatio: options.maxRepeatabilityDelta,
    }),
    evaluateRepeatability(p95MsValues, {
      id: 'repeatability-p95-ms',
      label: 'P95 frame-time repeatability',
      maxDeltaRatio: options.maxRepeatabilityDelta,
    }),
  ].map(formatCheck);

  const allRunsPass = runs.every((run) => run.passed);
  const allRunsCheck = formatCheck({
    id: 'all-runs-thresholds',
    label: 'All benchmark iterations pass thresholds',
    pass: allRunsPass,
    actual: runs.filter((run) => run.passed).length,
    expected: runs.length,
    operator: '==',
  });

  const summaryChecks = [allRunsCheck, ...repeatabilityChecks];
  const passed = summaryChecks.every((check) => check.pass);

  const aggregate = {
    iterations: runs.length,
    avgOfAvgFps: round(avgFpsValues.reduce((sum, value) => sum + value, 0) / Math.max(1, avgFpsValues.length), 4),
    avgOfAvgMs: round(avgMsValues.reduce((sum, value) => sum + value, 0) / Math.max(1, avgMsValues.length), 4),
    avgOfP95Ms: round(p95MsValues.reduce((sum, value) => sum + value, 0) / Math.max(1, p95MsValues.length), 4),
    worstAvgFps: round(Math.min(...avgFpsValues), 4),
    worstP95Ms: round(Math.max(...p95MsValues), 4),
  };

  return {
    passed,
    checks: summaryChecks,
    aggregate,
  };
}

async function runDryBenchmark(options) {
  const runs = [];
  for (let i = 0; i < options.iterations; i++) {
    const samples = createDryRunSamples(options.seed, options.durationMs);
    const metrics = computeFrameMetrics(samples, {
      sustainedWindowMs: options.thresholds.sustainedWindowMs,
      spikeThresholdMs: options.thresholds.spikeThresholdMs,
    });
    const evaluation = evaluateBenchmarkChecks(metrics, options.thresholds);
    runs.push(
      buildRunResult({
        iteration: i + 1,
        mode: 'dry-run',
        seed: options.seed,
        metrics,
        evaluation,
        telemetry: null,
      })
    );
  }
  return runs;
}

async function runRealBenchmark(options, baseUrl) {
  const benchmarkUrl = buildBenchmarkUrl(baseUrl, options.seed);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: options.width,
      height: options.height,
    },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });

  const page = await context.newPage();
  await installTelemetryCapture(page);
  await page.goto(benchmarkUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#startGameBtn', { state: 'visible', timeout: 120000 });
  await recoverGameplayState(page);
  await page.waitForTimeout(150);

  const runs = [];
  for (let i = 0; i < options.iterations; i++) {
    await clearTelemetryLogs(page);
    await recoverGameplayState(page);

    const frameSamplesPromise = captureFrameSamples(page, {
      warmupMs: options.warmupMs,
      durationMs: options.durationMs,
    });
    await runStressScenario(page, options);
    const frameSamples = await frameSamplesPromise;

    const resetButton = page.locator('#resetBtn');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(120);
    }

    const telemetry = await getLatestTelemetry(page);
    const metrics = computeFrameMetrics(frameSamples, {
      sustainedWindowMs: options.thresholds.sustainedWindowMs,
      spikeThresholdMs: options.thresholds.spikeThresholdMs,
    });
    const evaluation = evaluateBenchmarkChecks(metrics, options.thresholds);

    runs.push(
      buildRunResult({
        iteration: i + 1,
        mode: 'real',
        seed: options.seed,
        metrics,
        evaluation,
        telemetry,
      })
    );
  }

  await context.close();
  await browser.close();
  return runs;
}

function createSummary({ options, runs, mode, baseUrl }) {
  const series = summarizeRunSeries(runs, options);
  return {
    ticket: TICKET_ID,
    mode,
    generatedAt: new Date().toISOString(),
    passed: series.passed,
    benchmarkUrl: mode === 'real' ? buildBenchmarkUrl(baseUrl, options.seed) : null,
    config: {
      seed: options.seed,
      iterations: options.iterations,
      warmupMs: options.warmupMs,
      durationMs: options.durationMs,
      stepMs: options.stepMs,
      sweepPeriodMs: options.sweepPeriodMs,
      viewport: {
        width: options.width,
        height: options.height,
      },
      thresholds: options.thresholds,
      maxRepeatabilityDelta: options.maxRepeatabilityDelta,
    },
    aggregate: series.aggregate,
    checks: series.checks,
    runs,
  };
}

async function writeSummaryFile(summary, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function logSummary(summary, outputPath) {
  console.log(`[${TICKET_ID}] Mode: ${summary.mode}`);
  for (let i = 0; i < summary.runs.length; i++) {
    const run = summary.runs[i];
    console.log(
      `[${TICKET_ID}] Run ${run.iteration}: avgFps=${run.metrics.avgFps.toFixed(2)} ` +
        `avgMs=${run.metrics.avgMs.toFixed(2)} p95Ms=${run.metrics.p95Ms.toFixed(2)} ` +
        `spikeBurstMs=${run.metrics.spikes.maxBurstMs.toFixed(2)} pass=${run.passed}`
    );
  }
  console.log(`[${TICKET_ID}] Overall pass=${summary.passed}`);
  console.log(`[${TICKET_ID}] Wrote summary: ${outputPath}`);
}

async function runBenchmark(options) {
  if (options.dryRun) {
    const runs = await runDryBenchmark(options);
    return createSummary({
      options,
      runs,
      mode: 'dry-run',
      baseUrl: '',
    });
  }

  let server = null;
  let baseUrl = options.baseUrl;
  try {
    if (!baseUrl) {
      const serverState = await startViteServer(options);
      server = serverState.server;
      baseUrl = serverState.baseUrl;
    }
    const runs = await runRealBenchmark(options, baseUrl);
    return createSummary({
      options,
      runs,
      mode: 'real',
      baseUrl,
    });
  } finally {
    if (server) {
      await server.close();
    }
  }
}

async function main() {
  const { options, help } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const summary = await runBenchmark(options);
  const outputPath = buildOutputPath(options.output);
  await writeSummaryFile(summary, outputPath);
  logSummary(summary, outputPath);

  if (!summary.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[${TICKET_ID}] Benchmark failed.`);
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
