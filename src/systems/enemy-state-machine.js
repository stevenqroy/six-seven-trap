const LIFECYCLE_STATE_LIST = Object.freeze([
  'spawn',
  'windup',
  'active',
  'recover',
  'idle',
  'dead',
  'despawned',
]);

export const ENEMY_LIFECYCLE_STATES = Object.freeze(
  LIFECYCLE_STATE_LIST.reduce((acc, state) => {
    acc[state.toUpperCase()] = state;
    return acc;
  }, {})
);

const DEFAULT_STAGE_DURATIONS_MS = Object.freeze({
  spawnMs: 0,
  windupMs: 320,
  activeMs: 220,
  recoverMs: 420,
  idleMs: 1100,
});

const DEFAULT_STATE_TIMEOUTS_MS = Object.freeze({
  spawn: 1200,
  windup: 5000,
  active: 5000,
  recover: 5000,
  idle: 6500,
  dead: 1000,
  despawned: 0,
});

const DEFAULT_TRANSITIONS = Object.freeze({
  spawn: Object.freeze(['windup', 'recover', 'dead', 'despawned']),
  windup: Object.freeze(['active', 'recover', 'dead', 'despawned']),
  active: Object.freeze(['recover', 'dead', 'despawned']),
  recover: Object.freeze(['idle', 'windup', 'dead', 'despawned']),
  idle: Object.freeze(['windup', 'dead', 'despawned']),
  dead: Object.freeze(['despawned']),
  despawned: Object.freeze([]),
});

function nowMs() {
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

export function isEnemyLifecycleState(value) {
  if (typeof value !== 'string') return false;
  return LIFECYCLE_STATE_LIST.includes(value);
}

function normalizeLifecycleState(value, fallback = ENEMY_LIFECYCLE_STATES.SPAWN) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  return isEnemyLifecycleState(trimmed) ? trimmed : fallback;
}

function resolveAutoNextState(currentState, lifecycle) {
  switch (currentState) {
    case ENEMY_LIFECYCLE_STATES.SPAWN:
      return ENEMY_LIFECYCLE_STATES.WINDUP;
    case ENEMY_LIFECYCLE_STATES.WINDUP:
      return ENEMY_LIFECYCLE_STATES.ACTIVE;
    case ENEMY_LIFECYCLE_STATES.ACTIVE:
      return ENEMY_LIFECYCLE_STATES.RECOVER;
    case ENEMY_LIFECYCLE_STATES.RECOVER:
      return ENEMY_LIFECYCLE_STATES.IDLE;
    case ENEMY_LIFECYCLE_STATES.IDLE:
      return lifecycle.idleMs > 0 ? ENEMY_LIFECYCLE_STATES.WINDUP : null;
    case ENEMY_LIFECYCLE_STATES.DEAD:
      return ENEMY_LIFECYCLE_STATES.DESPAWNED;
    default:
      return null;
  }
}

function resolveAutoStateDuration(state, lifecycle, stateTimeouts) {
  switch (state) {
    case ENEMY_LIFECYCLE_STATES.SPAWN:
      return lifecycle.spawnMs;
    case ENEMY_LIFECYCLE_STATES.WINDUP:
      return lifecycle.windupMs;
    case ENEMY_LIFECYCLE_STATES.ACTIVE:
      return lifecycle.activeMs;
    case ENEMY_LIFECYCLE_STATES.RECOVER:
      return lifecycle.recoverMs;
    case ENEMY_LIFECYCLE_STATES.IDLE:
      return lifecycle.idleMs;
    case ENEMY_LIFECYCLE_STATES.DEAD:
      return stateTimeouts.dead;
    default:
      return 0;
  }
}

function buildLifecycle(profile = {}, defaultIdleMs = DEFAULT_STAGE_DURATIONS_MS.idleMs) {
  return {
    spawnMs: toNonNegativeFinite(profile.spawnMs, DEFAULT_STAGE_DURATIONS_MS.spawnMs),
    windupMs: toNonNegativeFinite(profile.windupMs, DEFAULT_STAGE_DURATIONS_MS.windupMs),
    activeMs: toNonNegativeFinite(profile.activeMs, DEFAULT_STAGE_DURATIONS_MS.activeMs),
    recoverMs: toNonNegativeFinite(profile.recoverMs, DEFAULT_STAGE_DURATIONS_MS.recoverMs),
    idleMs: toNonNegativeFinite(profile.idleMs, defaultIdleMs),
  };
}

function buildStateTimeouts(_lifecycle, customTimeouts = {}) {
  return {
    spawn: Math.max(250, toNonNegativeFinite(customTimeouts.spawn, DEFAULT_STATE_TIMEOUTS_MS.spawn)),
    windup: Math.max(250, toNonNegativeFinite(customTimeouts.windup, DEFAULT_STATE_TIMEOUTS_MS.windup)),
    active: Math.max(250, toNonNegativeFinite(customTimeouts.active, DEFAULT_STATE_TIMEOUTS_MS.active)),
    recover: Math.max(250, toNonNegativeFinite(customTimeouts.recover, DEFAULT_STATE_TIMEOUTS_MS.recover)),
    idle: Math.max(250, toNonNegativeFinite(customTimeouts.idle, DEFAULT_STATE_TIMEOUTS_MS.idle)),
    dead: Math.max(
      DEFAULT_STATE_TIMEOUTS_MS.dead,
      toNonNegativeFinite(customTimeouts.dead, DEFAULT_STATE_TIMEOUTS_MS.dead)
    ),
    despawned: 0,
  };
}

function buildEmptyMetrics(atMs) {
  return {
    totalSpawned: 0,
    totalTransitions: 0,
    totalDespawns: 0,
    totalCleanups: 0,
    forcedRecoveries: 0,
    forcedDespawns: 0,
    invalidStateRecoveries: 0,
    invalidTransitions: 0,
    deadStateCleanups: 0,
    maxConcurrentEntities: 0,
    lastTickAtMs: toFinite(atMs, 0),
  };
}

function copyEntityPublic(entity, atMs) {
  const now = toFinite(atMs, entity.stateEnteredAtMs);
  return {
    runtimeId: entity.runtimeId,
    enemyId: entity.enemyId,
    state: entity.state,
    spawnedAtMs: entity.spawnedAtMs,
    stateEnteredAtMs: entity.stateEnteredAtMs,
    lifetimeMs: Math.max(0, now - entity.spawnedAtMs),
    stateAgeMs: Math.max(0, now - entity.stateEnteredAtMs),
    source: entity.source,
    metadata: { ...entity.metadata },
  };
}

function buildStateCounts(entities) {
  const counts = {};
  for (let i = 0; i < LIFECYCLE_STATE_LIST.length; i++) {
    counts[LIFECYCLE_STATE_LIST[i]] = 0;
  }
  for (let i = 0; i < entities.length; i++) {
    const state = entities[i].state;
    if (typeof counts[state] !== 'number') counts[state] = 0;
    counts[state] += 1;
  }
  return counts;
}

export function createEnemyStateMachineRuntime({
  enabled = false,
  getRegistry = null,
  now = nowMs,
  maxLifetimeMs = 22000,
  allowedTransitions = DEFAULT_TRANSITIONS,
} = {}) {
  const isEnabled = typeof enabled === 'function' ? enabled : () => Boolean(enabled);
  const readRegistry =
    typeof getRegistry === 'function'
      ? getRegistry
      : () => null;

  const safeMaxLifetimeMs = Math.max(2500, toNonNegativeFinite(maxLifetimeMs, 22000));
  let entities = [];
  let nextRuntimeId = 1;
  let metrics = buildEmptyMetrics(now());

  function canTransition(fromState, toState) {
    const validNext = allowedTransitions[fromState];
    if (!Array.isArray(validNext)) return false;
    return validNext.includes(toState);
  }

  function refreshMaxConcurrent() {
    metrics.maxConcurrentEntities = Math.max(metrics.maxConcurrentEntities, entities.length);
  }

  function setState(entity, nextState, atMs, reason = 'transition') {
    const safeNow = toFinite(atMs, now());
    const fallbackState = entity.state === ENEMY_LIFECYCLE_STATES.DEAD
      ? ENEMY_LIFECYCLE_STATES.DESPAWNED
      : ENEMY_LIFECYCLE_STATES.RECOVER;
    const targetState = isEnemyLifecycleState(nextState) ? nextState : fallbackState;

    if (!canTransition(entity.state, targetState) && entity.state !== targetState) {
      metrics.invalidTransitions += 1;
      const nextFallback = canTransition(entity.state, fallbackState)
        ? fallbackState
        : ENEMY_LIFECYCLE_STATES.DESPAWNED;
      return setState(entity, nextFallback, safeNow, `fail-safe:${reason}`);
    }

    if (entity.state === targetState) return false;
    entity.state = targetState;
    entity.stateEnteredAtMs = safeNow;
    const stateDuration = resolveAutoStateDuration(entity.state, entity.lifecycle, entity.stateTimeouts);
    entity.stateDeadlineAtMs =
      stateDuration > 0 ? safeNow + stateDuration : Number.POSITIVE_INFINITY;
    entity.lastTransitionReason = reason;

    metrics.totalTransitions += 1;
    if (targetState === ENEMY_LIFECYCLE_STATES.DESPAWNED) {
      metrics.totalDespawns += 1;
    }
    return true;
  }

  function buildLifecycleForSpawn({
    lifecycle = null,
    telegraphProfile = null,
    abilityCooldownMs = null,
  } = {}) {
    const idleFallback =
      Number.isFinite(abilityCooldownMs) && abilityCooldownMs >= 0
        ? Math.max(180, abilityCooldownMs)
        : DEFAULT_STAGE_DURATIONS_MS.idleMs;

    if (lifecycle && typeof lifecycle === 'object') {
      return buildLifecycle(lifecycle, idleFallback);
    }

    if (telegraphProfile && typeof telegraphProfile === 'object') {
      return buildLifecycle(
        {
          windupMs: telegraphProfile.windupMs,
          activeMs: telegraphProfile.activeMs,
          recoverMs: telegraphProfile.recoverMs,
          idleMs: idleFallback,
        },
        idleFallback
      );
    }

    return buildLifecycle({}, idleFallback);
  }

  function createRuntimeEntity({
    enemyId = 'unknown',
    initialState = ENEMY_LIFECYCLE_STATES.SPAWN,
    lifecycle = null,
    telegraphProfile = null,
    abilityCooldownMs = null,
    maxEntityLifetimeMs = safeMaxLifetimeMs,
    stateTimeouts = null,
    metadata = null,
    source = 'runtime',
    atMs = now(),
  } = {}) {
    const safeNow = toFinite(atMs, now());
    const resolvedLifecycle = buildLifecycleForSpawn({
      lifecycle,
      telegraphProfile,
      abilityCooldownMs,
    });

    const resolvedStateTimeouts = buildStateTimeouts(resolvedLifecycle, stateTimeouts || {});
    const normalizedInitialState = normalizeLifecycleState(initialState, ENEMY_LIFECYCLE_STATES.SPAWN);

    const entity = {
      runtimeId: `enemy-${nextRuntimeId++}`,
      enemyId: typeof enemyId === 'string' && enemyId.trim() ? enemyId.trim() : 'unknown',
      state: normalizedInitialState,
      source: typeof source === 'string' && source.trim() ? source.trim() : 'runtime',
      spawnedAtMs: safeNow,
      stateEnteredAtMs: safeNow,
      stateDeadlineAtMs: Number.POSITIVE_INFINITY,
      maxLifetimeMs: Math.max(2500, toNonNegativeFinite(maxEntityLifetimeMs, safeMaxLifetimeMs)),
      lifecycle: resolvedLifecycle,
      stateTimeouts: resolvedStateTimeouts,
      metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {},
      lastTransitionReason: 'spawn',
    };

    const initialDuration = resolveAutoStateDuration(
      entity.state,
      entity.lifecycle,
      entity.stateTimeouts
    );
    if (initialDuration > 0) {
      entity.stateDeadlineAtMs = safeNow + initialDuration;
    }

    return entity;
  }

  function spawnEnemy(options = {}) {
    if (!isEnabled()) return null;
    const entity = createRuntimeEntity(options);
    entities.push(entity);
    metrics.totalSpawned += 1;
    refreshMaxConcurrent();
    return copyEntityPublic(entity, options.atMs);
  }

  function spawnFromRegistry(enemyId, {
    atMs = now(),
    source = 'registry',
    metadata = null,
    maxEntityLifetimeMs = safeMaxLifetimeMs,
    stateTimeouts = null,
  } = {}) {
    if (!isEnabled()) return null;
    const registry = readRegistry();
    if (!registry || typeof registry.getById !== 'function') return null;
    const entry = registry.getById(enemyId);
    if (!entry) return null;

    const abilities = Array.isArray(entry.abilities) ? entry.abilities : [];
    let minCooldown = Number.POSITIVE_INFINITY;
    for (let i = 0; i < abilities.length; i++) {
      const cooldownMs = abilities[i]?.cooldownMs;
      if (Number.isFinite(cooldownMs) && cooldownMs >= 0) {
        minCooldown = Math.min(minCooldown, cooldownMs);
      }
    }

    return spawnEnemy({
      enemyId: entry.id,
      telegraphProfile: entry.telegraphProfile || null,
      abilityCooldownMs: Number.isFinite(minCooldown) ? minCooldown : null,
      maxEntityLifetimeMs,
      stateTimeouts,
      source,
      metadata,
      atMs,
    });
  }

  function markDead(runtimeId, { atMs = now(), reason = 'mark-dead' } = {}) {
    const entity = entities.find((item) => item.runtimeId === runtimeId);
    if (!entity) return false;
    if (entity.state === ENEMY_LIFECYCLE_STATES.DESPAWNED) return false;
    if (entity.state === ENEMY_LIFECYCLE_STATES.DEAD) return true;
    return setState(entity, ENEMY_LIFECYCLE_STATES.DEAD, atMs, reason);
  }

  function transition(runtimeId, nextState, { atMs = now(), reason = 'manual-transition' } = {}) {
    const entity = entities.find((item) => item.runtimeId === runtimeId);
    if (!entity) return false;
    return setState(entity, normalizeLifecycleState(nextState, nextState), atMs, reason);
  }

  function reset({ atMs = now() } = {}) {
    const safeNow = toFinite(atMs, now());
    entities = [];
    nextRuntimeId = 1;
    metrics = buildEmptyMetrics(safeNow);
    return getDebugState(safeNow);
  }

  function destroy({ atMs = now() } = {}) {
    const snapshot = reset({ atMs });
    entities = [];
    metrics = buildEmptyMetrics(toFinite(atMs, now()));
    return snapshot;
  }

  function onFrame(frameMs = 0, atMs = now()) {
    const safeNow = toFinite(atMs, now());
    const safeFrameMs = toNonNegativeFinite(frameMs, 0);

    if (!isEnabled()) {
      if (entities.length) {
        reset({ atMs: safeNow });
      } else {
        metrics.lastTickAtMs = safeNow;
      }
      return {
        frameMs: safeFrameMs,
        transitions: 0,
        forcedRecoveries: 0,
        forcedDespawns: 0,
        cleanups: 0,
        activeCount: entities.length,
      };
    }

    let transitions = 0;
    let forcedRecoveries = 0;
    let forcedDespawns = 0;
    let cleanups = 0;
    const nextEntities = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      if (!isEnemyLifecycleState(entity.state)) {
        metrics.invalidStateRecoveries += 1;
        if (setState(entity, ENEMY_LIFECYCLE_STATES.RECOVER, safeNow, 'invalid-state')) {
          transitions += 1;
        }
      }

      const lifetimeMs = safeNow - entity.spawnedAtMs;
      if (lifetimeMs > entity.maxLifetimeMs) {
        metrics.forcedDespawns += 1;
        forcedDespawns += 1;
        if (setState(entity, ENEMY_LIFECYCLE_STATES.DESPAWNED, safeNow, 'max-lifetime-timeout')) {
          transitions += 1;
        }
      } else {
        const stateAgeMs = safeNow - entity.stateEnteredAtMs;
        const timeoutLimit = entity.stateTimeouts[entity.state];
        if (Number.isFinite(timeoutLimit) && timeoutLimit > 0 && stateAgeMs > timeoutLimit) {
          if (entity.state === ENEMY_LIFECYCLE_STATES.DEAD) {
            metrics.deadStateCleanups += 1;
            if (setState(entity, ENEMY_LIFECYCLE_STATES.DESPAWNED, safeNow, 'dead-timeout-cleanup')) {
              transitions += 1;
            }
          } else {
            const fallback = canTransition(entity.state, ENEMY_LIFECYCLE_STATES.RECOVER)
              ? ENEMY_LIFECYCLE_STATES.RECOVER
              : ENEMY_LIFECYCLE_STATES.DESPAWNED;
            if (fallback === ENEMY_LIFECYCLE_STATES.RECOVER) {
              metrics.forcedRecoveries += 1;
              forcedRecoveries += 1;
            } else {
              metrics.forcedDespawns += 1;
              forcedDespawns += 1;
            }
            if (setState(entity, fallback, safeNow, 'state-timeout-fail-safe')) {
              transitions += 1;
            }
          }
        }
      }

      if (safeNow >= entity.stateDeadlineAtMs) {
        const autoNext = resolveAutoNextState(entity.state, entity.lifecycle);
        if (autoNext) {
          if (entity.state === ENEMY_LIFECYCLE_STATES.DEAD && autoNext === ENEMY_LIFECYCLE_STATES.DESPAWNED) {
            metrics.deadStateCleanups += 1;
          }
          if (setState(entity, autoNext, safeNow, 'timed-transition')) {
            transitions += 1;
          }
        }
      }

      if (entity.state === ENEMY_LIFECYCLE_STATES.DESPAWNED) {
        cleanups += 1;
        metrics.totalCleanups += 1;
        continue;
      }

      nextEntities.push(entity);
    }

    entities = nextEntities;
    metrics.lastTickAtMs = safeNow;
    refreshMaxConcurrent();

    return {
      frameMs: safeFrameMs,
      transitions,
      forcedRecoveries,
      forcedDespawns,
      cleanups,
      activeCount: entities.length,
    };
  }

  function getEntities(atMs = now()) {
    const safeNow = toFinite(atMs, now());
    return entities.map((entity) => copyEntityPublic(entity, safeNow));
  }

  function getDebugState(atMs = now()) {
    const safeNow = toFinite(atMs, now());
    let oldestStateAgeMs = 0;
    let oldestLifetimeMs = 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      oldestStateAgeMs = Math.max(oldestStateAgeMs, safeNow - entity.stateEnteredAtMs);
      oldestLifetimeMs = Math.max(oldestLifetimeMs, safeNow - entity.spawnedAtMs);
    }

    return {
      enabled: Boolean(isEnabled()),
      activeCount: entities.length,
      byState: buildStateCounts(entities),
      oldestStateAgeMs,
      oldestLifetimeMs,
      totalSpawned: metrics.totalSpawned,
      totalTransitions: metrics.totalTransitions,
      totalDespawns: metrics.totalDespawns,
      totalCleanups: metrics.totalCleanups,
      forcedRecoveries: metrics.forcedRecoveries,
      forcedDespawns: metrics.forcedDespawns,
      invalidStateRecoveries: metrics.invalidStateRecoveries,
      invalidTransitions: metrics.invalidTransitions,
      deadStateCleanups: metrics.deadStateCleanups,
      maxConcurrentEntities: metrics.maxConcurrentEntities,
      lastTickAtMs: metrics.lastTickAtMs,
    };
  }

  reset({ atMs: now() });

  return {
    reset,
    destroy,
    onFrame,
    spawnEnemy,
    spawnFromRegistry,
    markDead,
    transition,
    getEntities,
    getDebugState,
  };
}
