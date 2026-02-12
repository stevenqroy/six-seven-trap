import S from '../state.js';
import { MAX_LIVES } from '../constants.js';
import { getFlag } from '../config/flags.js';
import {
  createSupportRuntime,
  SUPPORT_LIFECYCLE_STATES,
} from '../systems/support-runtime.js';

export const id = 'medicFirefly';

const DEFAULT_PROFILE = Object.freeze({
  orbitRadiusPx: 38,
  orbitSpeedRadPerSec: 2.4,
  orbitFollowPerSec: 10,
  healIntervalMs: 3000,
  healAmount: 0.34,
  pulseDurationMs: 460,
  pulseBaseRadiusPx: 9,
  pulseGrowthPx: 34,
  maxLifetimeMs: 14000,
  maxUnits: 1,
});

const instance = {
  context: null,
  boundState: S,
  runtime: null,
  runtimeNowMs: 0,
  runtimeUnitId: null,
  lifecycleState: SUPPORT_LIFECYCLE_STATES.DESPAWNED,
  profile: DEFAULT_PROFILE,
  x: 0,
  y: 0,
  orbitAngle: 0,
  healCooldownMs: 0,
  pulseAgeMs: DEFAULT_PROFILE.pulseDurationMs,
  pulseCount: 0,
  lastPulseAtMs: -Infinity,
  totalHealedLives: 0,
};

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function toNonNegativeFinite(value, fallback = 0) {
  const next = toFinite(value, fallback);
  return next < 0 ? fallback : next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeState(state) {
  return state && typeof state === 'object' ? state : S;
}

function normalizeAngle(value) {
  if (!Number.isFinite(value)) return 0;
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
}

function buildProfile(context = {}) {
  const healAmount = clamp(
    toNonNegativeFinite(context.healAmount, DEFAULT_PROFILE.healAmount),
    0.01,
    1
  );

  return {
    orbitRadiusPx: Math.max(
      8,
      toNonNegativeFinite(context.orbitRadiusPx, DEFAULT_PROFILE.orbitRadiusPx)
    ),
    orbitSpeedRadPerSec: Math.max(
      0.2,
      toNonNegativeFinite(context.orbitSpeedRadPerSec, DEFAULT_PROFILE.orbitSpeedRadPerSec)
    ),
    orbitFollowPerSec: Math.max(
      1,
      toNonNegativeFinite(context.orbitFollowPerSec, DEFAULT_PROFILE.orbitFollowPerSec)
    ),
    healIntervalMs: Math.max(
      250,
      toNonNegativeFinite(context.healIntervalMs, DEFAULT_PROFILE.healIntervalMs)
    ),
    healAmount,
    pulseDurationMs: Math.max(
      120,
      toNonNegativeFinite(context.pulseDurationMs, DEFAULT_PROFILE.pulseDurationMs)
    ),
    pulseBaseRadiusPx: Math.max(
      2,
      toNonNegativeFinite(context.pulseBaseRadiusPx, DEFAULT_PROFILE.pulseBaseRadiusPx)
    ),
    pulseGrowthPx: Math.max(
      4,
      toNonNegativeFinite(context.pulseGrowthPx, DEFAULT_PROFILE.pulseGrowthPx)
    ),
    maxLifetimeMs: Math.max(
      500,
      toNonNegativeFinite(context.maxLifetimeMs, DEFAULT_PROFILE.maxLifetimeMs)
    ),
    maxUnits: Math.max(1, Math.round(toNonNegativeFinite(context.maxUnits, DEFAULT_PROFILE.maxUnits))),
  };
}

function ensureHealingState(state) {
  const safeState = normalizeState(state);
  safeState.lives = Math.max(0, Math.round(toNonNegativeFinite(safeState.lives, 0)));
  safeState.healProgress = clamp(toNonNegativeFinite(safeState.healProgress, 0), 0, 1);

  if (safeState.lives >= MAX_LIVES) {
    safeState.lives = MAX_LIVES;
    safeState.healProgress = 0;
  }
}

function resolveGuardianPosition(state) {
  const safeState = normalizeState(state);

  if (instance.context && typeof instance.context.getGuardianPosition === 'function') {
    const resolved = instance.context.getGuardianPosition(safeState);
    if (Number.isFinite(resolved?.x) && Number.isFinite(resolved?.y)) {
      return { x: resolved.x, y: resolved.y };
    }
  }

  const width = Math.max(160, toNonNegativeFinite(safeState.wCSS, 800));
  const height = Math.max(160, toNonNegativeFinite(safeState.hCSS, 600));
  return {
    x: clamp(toFinite(safeState.touchX, width * 0.5), 0, width),
    y: toFinite(safeState.guardianAnchorY, height * 0.8),
  };
}

function positionNearGuardian(state) {
  const guardian = resolveGuardianPosition(state);
  const radius = instance.profile.orbitRadiusPx;
  instance.x = guardian.x + Math.cos(instance.orbitAngle) * radius;
  instance.y = guardian.y + Math.sin(instance.orbitAngle) * radius * 0.55 - radius * 0.3;
}

function updateOrbit(dtSeconds, state) {
  const safeDt = Math.max(0, dtSeconds);
  const guardian = resolveGuardianPosition(state);
  const radius = instance.profile.orbitRadiusPx;

  instance.orbitAngle = normalizeAngle(
    instance.orbitAngle + safeDt * instance.profile.orbitSpeedRadPerSec
  );

  const targetX = guardian.x + Math.cos(instance.orbitAngle) * radius;
  const targetY = guardian.y + Math.sin(instance.orbitAngle) * radius * 0.55 - radius * 0.3;
  const lerp = 1 - Math.exp(-instance.profile.orbitFollowPerSec * safeDt);

  instance.x += (targetX - instance.x) * lerp;
  instance.y += (targetY - instance.y) * lerp;
}

function spawnRuntimeUnit() {
  if (!instance.runtime) return null;

  const spawned = instance.runtime.spawnUnit({
    unitId: id,
    atMs: instance.runtimeNowMs,
    lifetime: instance.profile.maxLifetimeMs,
    metadata: {
      healIntervalMs: instance.profile.healIntervalMs,
      healAmount: instance.profile.healAmount,
    },
    source: 'v1-medic-firefly',
  });

  instance.runtimeUnitId = spawned?.runtimeId ?? null;
  instance.lifecycleState = spawned?.state ?? SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  return spawned;
}

function resolveRuntimeUnit() {
  if (!instance.runtime) return null;

  const activeUnits = instance.runtime.getActiveUnits(instance.runtimeNowMs);
  if (!activeUnits.length) {
    instance.runtimeUnitId = null;
    return null;
  }

  let selected = null;
  if (instance.runtimeUnitId) {
    selected = activeUnits.find((unit) => unit.runtimeId === instance.runtimeUnitId) || null;
  }
  if (!selected) selected = activeUnits[0];
  instance.runtimeUnitId = selected.runtimeId;
  return selected;
}

function applyHealPulse(state) {
  const safeState = normalizeState(state);
  instance.pulseAgeMs = 0;
  instance.pulseCount += 1;
  instance.lastPulseAtMs = instance.runtimeNowMs;

  if (safeState.lives >= MAX_LIVES) {
    safeState.lives = MAX_LIVES;
    safeState.healProgress = 0;
    return;
  }

  let progress = toNonNegativeFinite(safeState.healProgress, 0) + instance.profile.healAmount;
  let awardedLives = 0;

  while (progress >= 1 && safeState.lives < MAX_LIVES) {
    safeState.lives += 1;
    progress -= 1;
    awardedLives += 1;
  }

  if (safeState.lives >= MAX_LIVES) {
    safeState.lives = MAX_LIVES;
    progress = 0;
  }

  safeState.healProgress = clamp(progress, 0, 1);
  instance.totalHealedLives += awardedLives;
}

function updatePulseVisual(frameMs) {
  if (instance.pulseAgeMs >= instance.profile.pulseDurationMs) return;
  instance.pulseAgeMs = Math.min(instance.profile.pulseDurationMs, instance.pulseAgeMs + frameMs);
}

export function spawn(ctx = {}) {
  destroy();

  instance.context = ctx && typeof ctx === 'object' ? { ...ctx } : {};
  instance.boundState = normalizeState(instance.context.state);
  instance.profile = buildProfile(instance.context);
  instance.runtimeNowMs = 0;
  instance.runtimeUnitId = null;
  instance.lifecycleState = SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  instance.orbitAngle = normalizeAngle(toFinite(instance.context.startAngle, 0));
  instance.healCooldownMs = instance.profile.healIntervalMs;
  instance.pulseAgeMs = instance.profile.pulseDurationMs;
  instance.pulseCount = 0;
  instance.lastPulseAtMs = -Infinity;
  instance.totalHealedLives = 0;

  ensureHealingState(instance.boundState);
  positionNearGuardian(instance.boundState);

  if (!getFlag('supportMedicFirefly')) {
    return serializeDebug();
  }

  instance.runtime = createSupportRuntime({
    enabled: () => getFlag('supportMedicFirefly'),
    now: () => instance.runtimeNowMs,
    maxUnits: instance.profile.maxUnits,
    maxLifetimeMs: instance.profile.maxLifetimeMs,
  });

  spawnRuntimeUnit();
  return serializeDebug();
}

export function update(dt, state = S) {
  const safeState = normalizeState(state);
  const dtSeconds = toNonNegativeFinite(dt, 0);
  instance.boundState = safeState;

  if (!getFlag('supportMedicFirefly')) {
    instance.lifecycleState = 'disabled';
    return serializeDebug();
  }

  if (!instance.runtime) {
    spawn({
      ...(instance.context || {}),
      state: safeState,
    });
  }

  if (!instance.runtime) return serializeDebug();

  ensureHealingState(safeState);
  const frameMs = dtSeconds * 1000;
  instance.runtimeNowMs += frameMs;
  instance.runtime.onFrame(frameMs, instance.runtimeNowMs);

  const runtimeUnit = resolveRuntimeUnit();
  instance.lifecycleState = runtimeUnit?.state ?? SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  updateOrbit(dtSeconds, safeState);
  updatePulseVisual(frameMs);

  if (!runtimeUnit) return serializeDebug();
  if (instance.lifecycleState !== SUPPORT_LIFECYCLE_STATES.ACTIVE) return serializeDebug();

  instance.healCooldownMs -= frameMs;
  while (instance.healCooldownMs <= 0) {
    applyHealPulse(safeState);
    instance.healCooldownMs += instance.profile.healIntervalMs;
  }

  return serializeDebug();
}

export function draw(ctx) {
  if (!getFlag('supportMedicFirefly')) return;
  if (!ctx || typeof ctx.save !== 'function') return;
  if (instance.lifecycleState === SUPPORT_LIFECYCLE_STATES.DESPAWNED || instance.lifecycleState === 'disabled') {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(153, 255, 206, 0.34)';
  ctx.beginPath();
  ctx.arc(instance.x, instance.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(191, 255, 225, 0.95)';
  ctx.beginPath();
  ctx.arc(instance.x, instance.y, 4, 0, Math.PI * 2);
  ctx.fill();

  if (instance.pulseAgeMs < instance.profile.pulseDurationMs) {
    const pulseT = clamp(instance.pulseAgeMs / instance.profile.pulseDurationMs, 0, 1);
    const radius = instance.profile.pulseBaseRadiusPx + pulseT * instance.profile.pulseGrowthPx;
    const alpha = (1 - pulseT) * 0.72;
    ctx.strokeStyle = `rgba(170, 255, 210, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(instance.x, instance.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function destroy() {
  if (instance.runtime) {
    instance.runtime.reset({ atMs: instance.runtimeNowMs });
  }

  instance.context = null;
  instance.boundState = S;
  instance.runtime = null;
  instance.runtimeNowMs = 0;
  instance.runtimeUnitId = null;
  instance.lifecycleState = SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  instance.profile = DEFAULT_PROFILE;
  instance.x = 0;
  instance.y = 0;
  instance.orbitAngle = 0;
  instance.healCooldownMs = 0;
  instance.pulseAgeMs = DEFAULT_PROFILE.pulseDurationMs;
  instance.pulseCount = 0;
  instance.lastPulseAtMs = -Infinity;
  instance.totalHealedLives = 0;
}

export function serializeDebug() {
  const safeState = normalizeState(instance.boundState);
  const lives = Math.max(0, Math.round(toNonNegativeFinite(safeState.lives, 0)));
  const healProgress = clamp(toNonNegativeFinite(safeState.healProgress, 0), 0, 1);

  return {
    id,
    enabled: getFlag('supportMedicFirefly'),
    lifecycleState: instance.lifecycleState,
    runtimeUnitId: instance.runtimeUnitId,
    x: instance.x,
    y: instance.y,
    orbitAngle: instance.orbitAngle,
    healCooldownMs: Math.max(0, instance.healCooldownMs),
    pulseCount: instance.pulseCount,
    lastPulseAtMs: instance.lastPulseAtMs,
    totalHealedLives: instance.totalHealedLives,
    healProgress,
    lives,
    runtime: instance.runtime ? instance.runtime.getDebugState(instance.runtimeNowMs) : null,
  };
}
