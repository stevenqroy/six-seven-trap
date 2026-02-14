const ABILITY_KEYS = ['shield', 'projectile', 'magnet', 'slam', 'ultimate'];
const SHIP_DAMAGE_SOURCE_KEYS = ['bounce', 'projectile', 'ultimate', 'beam-eruption', 'unknown'];

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function cloneAbilityCounts(base = null) {
  const counts = {};
  for (let i = 0; i < ABILITY_KEYS.length; i++) {
    const key = ABILITY_KEYS[i];
    counts[key] = base && Number.isFinite(base[key]) ? base[key] : 0;
  }
  return counts;
}

function cloneShipDamageBySource(base = null) {
  const counts = {};
  for (let i = 0; i < SHIP_DAMAGE_SOURCE_KEYS.length; i++) {
    const key = SHIP_DAMAGE_SOURCE_KEYS[i];
    counts[key] = base && Number.isFinite(base[key]) ? base[key] : 0;
  }
  return counts;
}

function percentileNearestRank(sortedValues, percentile) {
  if (!sortedValues.length) return 0;
  const p = Math.max(0, Math.min(1, percentile));
  const rank = Math.ceil(p * sortedValues.length);
  const idx = Math.max(0, Math.min(sortedValues.length - 1, rank - 1));
  return sortedValues[idx];
}

export function computeFrameStats(frameSampleMs, frameCount, frameTotalMs, minMs, maxMs, over16ms, over33ms) {
  const count = Math.max(0, toFinite(frameCount, 0));
  const totalMs = Math.max(0, toFinite(frameTotalMs, 0));
  const safeMin = count > 0 ? toFinite(minMs, 0) : 0;
  const safeMax = count > 0 ? toFinite(maxMs, 0) : 0;
  const sorted = frameSampleMs.length ? [...frameSampleMs].sort((a, b) => a - b) : [];

  return {
    frames: count,
    totalMs,
    avgMs: count > 0 ? totalMs / count : 0,
    minMs: safeMin,
    maxMs: safeMax,
    p50Ms: percentileNearestRank(sorted, 0.5),
    p90Ms: percentileNearestRank(sorted, 0.9),
    p95Ms: percentileNearestRank(sorted, 0.95),
    p99Ms: percentileNearestRank(sorted, 0.99),
    over16ms,
    over33ms,
    over16Ratio: count > 0 ? over16ms / count : 0,
    over33Ratio: count > 0 ? over33ms / count : 0,
  };
}

export function createRunMetrics({
  seed = null,
  deterministic = false,
  startedAtMs = nowMs(),
  sampleCap = 12000,
  reason = 'run-start',
} = {}) {
  return {
    reason,
    seed: Number.isFinite(seed) ? seed : null,
    deterministic: Boolean(deterministic),
    startedAtMs: toFinite(startedAtMs, nowMs()),
    endedAtMs: 0,
    elapsedMs: 0,
    outcome: 'running',
    score: 0,
    bestCombo: 0,
    rngDraws: 0,
    livesLost: 0,
    livesGained: 0,
    remainingLives: null,
    abilityUses: cloneAbilityCounts(),
    shipDamageTotal: 0,
    shipDamageEvents: 0,
    shipDamageBySource: cloneShipDamageBySource(),
    phaseTransitions: [],
    qualityTransitions: [],
    frameRaw: {
      sampleCap: Math.max(60, Math.floor(toFinite(sampleCap, 12000))),
      count: 0,
      totalMs: 0,
      minMs: Infinity,
      maxMs: 0,
      over16ms: 0,
      over33ms: 0,
      sampleMs: [],
    },
  };
}

function compactMetrics(metrics) {
  const frameRaw = metrics.frameRaw;
  return {
    reason: metrics.reason,
    seed: metrics.seed,
    deterministic: metrics.deterministic,
    startedAtMs: metrics.startedAtMs,
    endedAtMs: metrics.endedAtMs,
    elapsedMs: metrics.elapsedMs,
    outcome: metrics.outcome,
    score: metrics.score,
    bestCombo: metrics.bestCombo,
    rngDraws: metrics.rngDraws,
    livesLost: metrics.livesLost,
    livesGained: metrics.livesGained,
    remainingLives: metrics.remainingLives,
    abilityUses: cloneAbilityCounts(metrics.abilityUses),
    shipDamageTotal: metrics.shipDamageTotal,
    shipDamageEvents: metrics.shipDamageEvents,
    shipDamageBySource: cloneShipDamageBySource(metrics.shipDamageBySource),
    phaseTransitions: metrics.phaseTransitions.map((item) => ({ ...item })),
    qualityTransitions: metrics.qualityTransitions.map((item) => ({ ...item })),
    frame: computeFrameStats(
      frameRaw.sampleMs,
      frameRaw.count,
      frameRaw.totalMs,
      frameRaw.minMs,
      frameRaw.maxMs,
      frameRaw.over16ms,
      frameRaw.over33ms
    ),
  };
}

function toOutcomeLabel(reason) {
  if (reason === 'victory') return 'victory';
  if (reason === 'game-over') return 'game-over';
  return 'reset';
}

function normalizeAbilityName(name) {
  if (ABILITY_KEYS.includes(name)) return name;
  return null;
}

function normalizeDamageSource(source) {
  if (SHIP_DAMAGE_SOURCE_KEYS.includes(source)) return source;
  return 'unknown';
}

export function createTelemetrySystem({
  enabled = false,
  logger = console,
  sampleCap = 12000,
} = {}) {
  const isEnabled = typeof enabled === 'function' ? enabled : () => Boolean(enabled);
  let currentRun = null;
  let lastCompletedRun = null;

  function beginRun({ seed = null, deterministic = false, startedAtMs = nowMs(), reason = 'run-start' } = {}) {
    if (!isEnabled()) {
      currentRun = null;
      return null;
    }
    currentRun = createRunMetrics({ seed, deterministic, startedAtMs, sampleCap, reason });
    return compactMetrics(currentRun);
  }

  function withRun(handler) {
    if (!isEnabled() || !currentRun) return;
    handler(currentRun);
  }

  function onFrame(frameMs) {
    withRun((run) => {
      const ms = toFinite(frameMs, 0);
      if (ms <= 0) return;

      const frame = run.frameRaw;
      frame.count += 1;
      frame.totalMs += ms;
      frame.minMs = Math.min(frame.minMs, ms);
      frame.maxMs = Math.max(frame.maxMs, ms);
      if (ms > 16.7) frame.over16ms += 1;
      if (ms > 33.3) frame.over33ms += 1;

      if (frame.sampleMs.length < frame.sampleCap) {
        frame.sampleMs.push(ms);
      } else {
        frame.sampleMs[frame.count % frame.sampleCap] = ms;
      }
    });
  }

  function onLifeLost(remainingLives = null) {
    withRun((run) => {
      run.livesLost += 1;
      run.remainingLives = Number.isFinite(remainingLives) ? remainingLives : run.remainingLives;
    });
  }

  function onLifeGained(remainingLives = null) {
    withRun((run) => {
      run.livesGained += 1;
      run.remainingLives = Number.isFinite(remainingLives) ? remainingLives : run.remainingLives;
    });
  }

  function onAbilityUsed(name) {
    withRun((run) => {
      const normalized = normalizeAbilityName(name);
      if (!normalized) return;
      run.abilityUses[normalized] += 1;
    });
  }

  function onShipDamage(amount, source = 'unknown') {
    withRun((run) => {
      const damage = toFinite(amount, 0);
      if (damage <= 0) return;
      const normalizedSource = normalizeDamageSource(source);
      run.shipDamageTotal += damage;
      run.shipDamageEvents += 1;
      run.shipDamageBySource[normalizedSource] += damage;
    });
  }

  function onPhaseTransition(oldPhase, newPhase, atMs = nowMs()) {
    withRun((run) => {
      run.phaseTransitions.push({
        oldPhase: toFinite(oldPhase, 0),
        newPhase: toFinite(newPhase, 0),
        atMs: toFinite(atMs, nowMs()),
      });
    });
  }

  function setRngDraws(draws) {
    withRun((run) => {
      run.rngDraws = Math.max(0, Math.floor(toFinite(draws, 0)));
    });
  }

  function onQualityTierChange({
    oldTier = null,
    newTier = null,
    atMs = nowMs(),
    reason = 'unknown',
    triggerAvgMs = null,
    triggerWindowMs = null,
    sampleCount = null,
  } = {}) {
    withRun((run) => {
      if (typeof oldTier !== 'string' || typeof newTier !== 'string' || oldTier === newTier) return;
      run.qualityTransitions.push({
        oldTier,
        newTier,
        atMs: toFinite(atMs, nowMs()),
        reason: typeof reason === 'string' ? reason : 'unknown',
        triggerAvgMs: Number.isFinite(triggerAvgMs) ? triggerAvgMs : null,
        triggerWindowMs: Number.isFinite(triggerWindowMs) ? triggerWindowMs : null,
        sampleCount: Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : null,
      });
    });
  }

  function finalizeRun({
    reason = 'reset',
    endedAtMs = nowMs(),
    score = 0,
    bestCombo = 0,
    rngDraws = null,
  } = {}) {
    if (!isEnabled() || !currentRun) return null;

    currentRun.endedAtMs = toFinite(endedAtMs, nowMs());
    currentRun.elapsedMs = Math.max(0, currentRun.endedAtMs - currentRun.startedAtMs);
    currentRun.outcome = toOutcomeLabel(reason);
    currentRun.score = Math.max(0, Math.floor(toFinite(score, 0)));
    currentRun.bestCombo = Math.max(0, Math.floor(toFinite(bestCombo, 0)));
    if (Number.isFinite(rngDraws)) {
      currentRun.rngDraws = Math.max(0, Math.floor(rngDraws));
    }

    lastCompletedRun = compactMetrics(currentRun);
    currentRun = null;
    return lastCompletedRun;
  }

  function dumpRun(runMetrics) {
    if (!runMetrics) return false;
    try {
      logger.log('[S7R:TELEMETRY]', runMetrics);
      return true;
    } catch {
      return false;
    }
  }

  function getCurrentRun() {
    if (!currentRun) return null;
    return compactMetrics(currentRun);
  }

  function getLastCompletedRun() {
    return lastCompletedRun ? { ...lastCompletedRun } : null;
  }

  function destroy() {
    currentRun = null;
    lastCompletedRun = null;
  }

  return {
    beginRun,
    onFrame,
    onLifeLost,
    onLifeGained,
    onAbilityUsed,
    onShipDamage,
    onPhaseTransition,
    onQualityTierChange,
    setRngDraws,
    finalizeRun,
    dumpRun,
    getCurrentRun,
    getLastCompletedRun,
    destroy,
  };
}
