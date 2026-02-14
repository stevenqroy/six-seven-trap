import { getFlag } from '../config/flags.js';

const SUPPORT_STATE_LIST = Object.freeze([
  'spawning',
  'active',
  'expiring',
  'despawned',
]);

export const SUPPORT_LIFECYCLE_STATES = Object.freeze(
  SUPPORT_STATE_LIST.reduce((acc, state) => {
    acc[state.toUpperCase()] = state;
    return acc;
  }, {})
);

const SPAWNING_DURATION_MS = 120;
const EXPIRING_WINDOW_MS = 600;

function defaultNowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function toNonNegativeFinite(value, fallback = 0) {
  const next = toFinite(value, fallback);
  return next < 0 ? fallback : next;
}

function toSupportId(value) {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  return trimmed ? trimmed : 'unknown';
}

function resolveLifecycleState(ageMs, lifetimeMs) {
  if (ageMs >= lifetimeMs) return SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  if (ageMs < SPAWNING_DURATION_MS) return SUPPORT_LIFECYCLE_STATES.SPAWNING;
  const expiringAtMs = Math.max(SPAWNING_DURATION_MS, lifetimeMs - EXPIRING_WINDOW_MS);
  if (ageMs >= expiringAtMs) return SUPPORT_LIFECYCLE_STATES.EXPIRING;
  return SUPPORT_LIFECYCLE_STATES.ACTIVE;
}

function buildEmptyMetrics(atMs) {
  return {
    totalSpawned: 0,
    totalTransitions: 0,
    totalDespawns: 0,
    totalCleanups: 0,
    maxConcurrentUnits: 0,
    lastTickAtMs: toFinite(atMs, 0),
  };
}

function buildStateCounts(units) {
  const counts = {};
  for (let i = 0; i < SUPPORT_STATE_LIST.length; i++) {
    counts[SUPPORT_STATE_LIST[i]] = 0;
  }
  for (let i = 0; i < units.length; i++) {
    const state = units[i].state;
    if (typeof counts[state] !== 'number') counts[state] = 0;
    counts[state] += 1;
  }
  return counts;
}

function copyUnitPublic(unit, atMs) {
  const nowMs = toFinite(atMs, unit.spawnedAtMs);
  const lifetimeMs = Math.max(0, nowMs - unit.spawnedAtMs);
  return {
    runtimeId: unit.runtimeId,
    unitId: unit.unitId,
    state: unit.state,
    spawnedAtMs: unit.spawnedAtMs,
    stateEnteredAtMs: unit.stateEnteredAtMs,
    lifetimeMs,
    lifetimeRemainingMs: Math.max(0, unit.maxLifetimeMs - lifetimeMs),
    maxLifetimeMs: unit.maxLifetimeMs,
    metadata: { ...unit.metadata },
    source: unit.source,
  };
}

function shouldEnableRuntime(configEnabled) {
  return Boolean(configEnabled) && getFlag('supportRuntime');
}

export function createSupportRuntime({
  enabled = false,
  now = defaultNowMs,
  maxUnits = 1,
  maxLifetimeMs = 14000,
} = {}) {
  const isConfiguredEnabled = typeof enabled === 'function' ? enabled : () => Boolean(enabled);
  const safeMaxUnits = Math.max(1, Math.round(toNonNegativeFinite(maxUnits, 1)));
  const safeMaxLifetimeMs = Math.max(500, toNonNegativeFinite(maxLifetimeMs, 14000));

  let units = [];
  let nextRuntimeId = 1;
  let metrics = buildEmptyMetrics(now());

  function isRuntimeEnabled() {
    return shouldEnableRuntime(isConfiguredEnabled());
  }

  function refreshMaxConcurrent() {
    metrics.maxConcurrentUnits = Math.max(metrics.maxConcurrentUnits, units.length);
  }

  function setState(unit, nextState, atMs) {
    if (unit.state === nextState) return false;
    unit.state = nextState;
    unit.stateEnteredAtMs = atMs;
    metrics.totalTransitions += 1;
    if (nextState === SUPPORT_LIFECYCLE_STATES.DESPAWNED) {
      metrics.totalDespawns += 1;
    }
    return true;
  }

  function spawnUnit({
    unitId = 'unknown',
    atMs = now(),
    lifetime = safeMaxLifetimeMs,
    metadata = null,
    source = 'runtime',
  } = {}) {
    if (!isRuntimeEnabled()) return null;
    if (units.length >= safeMaxUnits) return null;

    const safeNow = toFinite(atMs, now());
    const safeLifetimeMs = Math.max(
      SPAWNING_DURATION_MS + 1,
      Math.min(safeMaxLifetimeMs, toNonNegativeFinite(lifetime, safeMaxLifetimeMs))
    );

    const unit = {
      runtimeId: `support-${nextRuntimeId++}`,
      unitId: toSupportId(unitId),
      state: SUPPORT_LIFECYCLE_STATES.SPAWNING,
      spawnedAtMs: safeNow,
      stateEnteredAtMs: safeNow,
      maxLifetimeMs: safeLifetimeMs,
      metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {},
      source: typeof source === 'string' && source.trim() ? source.trim() : 'runtime',
      lastTransitionReason: 'spawn',
    };

    units.push(unit);
    metrics.totalSpawned += 1;
    refreshMaxConcurrent();
    return copyUnitPublic(unit, safeNow);
  }

  function despawnUnit(runtimeId, { atMs = now(), reason = 'manual-despawn' } = {}) {
    const index = units.findIndex((unit) => unit.runtimeId === runtimeId);
    if (index < 0) return false;
    const safeNow = toFinite(atMs, now());
    const unit = units[index];
    unit.lastTransitionReason = reason;
    setState(unit, SUPPORT_LIFECYCLE_STATES.DESPAWNED, safeNow);
    units.splice(index, 1);
    metrics.totalCleanups += 1;
    return true;
  }

  function onFrame(deltaMs = 0, nowMs = now()) {
    const safeNow = toFinite(nowMs, now());
    const safeDeltaMs = toNonNegativeFinite(deltaMs, 0);

    if (!isRuntimeEnabled()) {
      if (units.length) {
        reset({ atMs: safeNow });
      } else {
        metrics.lastTickAtMs = safeNow;
      }
      return {
        frameMs: safeDeltaMs,
        transitions: 0,
        despawns: 0,
        cleanups: 0,
        activeCount: units.length,
      };
    }

    let transitions = 0;
    let despawns = 0;
    let cleanups = 0;
    const nextUnits = [];

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const ageMs = Math.max(0, safeNow - unit.spawnedAtMs);
      const nextState = resolveLifecycleState(ageMs, unit.maxLifetimeMs);

      if (nextState === SUPPORT_LIFECYCLE_STATES.DESPAWNED) {
        if (setState(unit, nextState, safeNow)) {
          transitions += 1;
          despawns += 1;
          unit.lastTransitionReason = 'lifetime-expired';
        }
        cleanups += 1;
        metrics.totalCleanups += 1;
        continue;
      }

      if (setState(unit, nextState, safeNow)) {
        transitions += 1;
        unit.lastTransitionReason = 'timed-transition';
      }
      nextUnits.push(unit);
    }

    units = nextUnits;
    metrics.lastTickAtMs = safeNow;
    refreshMaxConcurrent();

    return {
      frameMs: safeDeltaMs,
      transitions,
      despawns,
      cleanups,
      activeCount: units.length,
    };
  }

  function getActiveUnits(nowMs = now()) {
    if (!isRuntimeEnabled()) return [];
    const safeNow = toFinite(nowMs, now());
    return units
      .filter((unit) => unit.state !== SUPPORT_LIFECYCLE_STATES.DESPAWNED)
      .map((unit) => copyUnitPublic(unit, safeNow));
  }

  function reset({ atMs = now() } = {}) {
    const safeNow = toFinite(atMs, now());
    units = [];
    nextRuntimeId = 1;
    metrics = buildEmptyMetrics(safeNow);
    return getDebugState(safeNow);
  }

  function destroy({ atMs = now() } = {}) {
    const snapshot = reset({ atMs });
    units = [];
    metrics = buildEmptyMetrics(toFinite(atMs, now()));
    return snapshot;
  }

  function getDebugState(nowMs = now()) {
    const safeNow = toFinite(nowMs, now());
    let oldestLifetimeMs = 0;
    let oldestStateAgeMs = 0;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      oldestLifetimeMs = Math.max(oldestLifetimeMs, safeNow - unit.spawnedAtMs);
      oldestStateAgeMs = Math.max(oldestStateAgeMs, safeNow - unit.stateEnteredAtMs);
    }

    return {
      enabled: Boolean(isRuntimeEnabled()),
      activeCount: units.length,
      byState: buildStateCounts(units),
      maxUnits: safeMaxUnits,
      maxLifetimeMs: safeMaxLifetimeMs,
      oldestLifetimeMs,
      oldestStateAgeMs,
      totalSpawned: metrics.totalSpawned,
      totalTransitions: metrics.totalTransitions,
      totalDespawns: metrics.totalDespawns,
      totalCleanups: metrics.totalCleanups,
      maxConcurrentUnits: metrics.maxConcurrentUnits,
      lastTickAtMs: metrics.lastTickAtMs,
    };
  }

  reset({ atMs: now() });

  return {
    spawnUnit,
    despawnUnit,
    onFrame,
    getActiveUnits,
    reset,
    destroy,
    getDebugState,
  };
}
