import { getFlag } from '../config/flags.js';
import {
  createSupportRuntime,
  SUPPORT_LIFECYCLE_STATES,
} from '../systems/support-runtime.js';
import * as harvester from '../enemies/harvester.js';
import * as skimmer from '../enemies/skimmer.js';

export const id = 'strikerHawk';

const BEHAVIOR_STATES = Object.freeze({
  IDLE: 'idle',
  TARGETING: 'targeting',
  DIVING: 'diving',
  RECOVER: 'recover',
});

const DEFAULT_PROFILE = Object.freeze({
  cooldownMs: 4000,
  initialCooldownMs: 1000,
  orbitRadiusPx: 92,
  orbitSpeedRadPerSec: 1.5,
  orbitFollowPerSec: 8,
  diveSpeedPxPerSec: 800,
  recoverSpeedPxPerSec: 420,
  strikeRadiusPx: 50,
  damage: 5,
  maxLifetimeMs: 14000,
  maxUnits: 1,
});

const FALLBACK_STATE = Object.freeze({
  wCSS: 800,
  hCSS: 600,
});

const instance = {
  context: null,
  boundState: FALLBACK_STATE,
  runtime: null,
  runtimeNowMs: 0,
  runtimeUnitId: null,
  lifecycleState: SUPPORT_LIFECYCLE_STATES.DESPAWNED,
  behaviorState: BEHAVIOR_STATES.IDLE,
  stateEnteredAtMs: 0,
  profile: DEFAULT_PROFILE,
  x: 0,
  y: 0,
  orbitAngle: 0,
  target: null,
  strikeCooldownMs: 0,
  strikesCompleted: 0,
  lastStrikeAtMs: -Infinity,
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
  if (state && typeof state === 'object') return state;
  if (instance.boundState && typeof instance.boundState === 'object') return instance.boundState;
  return FALLBACK_STATE;
}

function normalizeAngle(value) {
  if (!Number.isFinite(value)) return 0;
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
}

function buildProfile(context = {}) {
  return {
    cooldownMs: Math.max(250, toNonNegativeFinite(context.cooldownMs, DEFAULT_PROFILE.cooldownMs)),
    initialCooldownMs: Math.max(
      0,
      toNonNegativeFinite(context.initialCooldownMs, DEFAULT_PROFILE.initialCooldownMs)
    ),
    orbitRadiusPx: Math.max(
      16,
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
    diveSpeedPxPerSec: Math.max(
      80,
      toNonNegativeFinite(context.diveSpeedPxPerSec, DEFAULT_PROFILE.diveSpeedPxPerSec)
    ),
    recoverSpeedPxPerSec: Math.max(
      80,
      toNonNegativeFinite(context.recoverSpeedPxPerSec, DEFAULT_PROFILE.recoverSpeedPxPerSec)
    ),
    strikeRadiusPx: Math.max(
      8,
      toNonNegativeFinite(context.strikeRadiusPx, DEFAULT_PROFILE.strikeRadiusPx)
    ),
    damage: Math.max(0, toNonNegativeFinite(context.damage, DEFAULT_PROFILE.damage)),
    maxLifetimeMs: Math.max(
      1000,
      toNonNegativeFinite(context.maxLifetimeMs, DEFAULT_PROFILE.maxLifetimeMs)
    ),
    maxUnits: Math.max(1, Math.round(toNonNegativeFinite(context.maxUnits, DEFAULT_PROFILE.maxUnits))),
  };
}

function resolveGuardianPosition(state) {
  const safeState = normalizeState(state);

  if (instance.context && typeof instance.context.getGuardianPosition === 'function') {
    const fromContext = instance.context.getGuardianPosition(safeState);
    if (Number.isFinite(fromContext?.x) && Number.isFinite(fromContext?.y)) {
      return {
        x: fromContext.x,
        y: fromContext.y,
      };
    }
  }

  const width = Math.max(160, toNonNegativeFinite(safeState.wCSS, FALLBACK_STATE.wCSS));
  return {
    x: width * 0.5,
    y: -instance.profile.orbitRadiusPx,
  };
}

function positionInOrbit(state) {
  const guardian = resolveGuardianPosition(state);
  const radius = instance.profile.orbitRadiusPx;
  instance.x = guardian.x + Math.cos(instance.orbitAngle) * radius;
  instance.y = guardian.y + Math.sin(instance.orbitAngle) * radius * 0.55;
}

function updateOrbit(dtSeconds, state) {
  const safeDt = Math.max(0, dtSeconds);
  const guardian = resolveGuardianPosition(state);
  const radius = instance.profile.orbitRadiusPx;

  instance.orbitAngle = normalizeAngle(
    instance.orbitAngle + safeDt * instance.profile.orbitSpeedRadPerSec
  );

  const targetX = guardian.x + Math.cos(instance.orbitAngle) * radius;
  const targetY = guardian.y + Math.sin(instance.orbitAngle) * radius * 0.55;
  const lerp = 1 - Math.exp(-instance.profile.orbitFollowPerSec * safeDt);

  instance.x += (targetX - instance.x) * lerp;
  instance.y += (targetY - instance.y) * lerp;
}

function readEnemyDebug(enemyModule) {
  if (!enemyModule || typeof enemyModule.serializeDebug !== 'function') return null;
  try {
    const snapshot = enemyModule.serializeDebug();
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

function isTargetAttackable(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  if (snapshot.enabled !== true) return false;
  return toNonNegativeFinite(snapshot.hp, 0) > 0;
}

function selectTarget() {
  const candidates = [];
  const harvesterSnapshot = readEnemyDebug(harvester);
  const skimmerSnapshot = readEnemyDebug(skimmer);

  if (isTargetAttackable(harvesterSnapshot)) {
    candidates.push({
      id: 'harvester',
      threat: 3,
      module: harvester,
      snapshot: harvesterSnapshot,
    });
  }

  if (isTargetAttackable(skimmerSnapshot)) {
    candidates.push({
      id: 'skimmer',
      threat: 2,
      module: skimmer,
      snapshot: skimmerSnapshot,
    });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.threat - a.threat);
  return candidates[0];
}

function resolveTargetPosition(target, state) {
  const safeState = normalizeState(state);
  const width = Math.max(160, toNonNegativeFinite(safeState.wCSS, FALLBACK_STATE.wCSS));
  const height = Math.max(160, toNonNegativeFinite(safeState.hCSS, FALLBACK_STATE.hCSS));
  const snapshot = target?.snapshot;

  const x = toFinite(snapshot?.x, Number.NaN);
  const y = toFinite(snapshot?.y, Number.NaN);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y };
  }

  const beams = Array.isArray(snapshot?.activeBeams) ? snapshot.activeBeams : [];
  if (beams.length) {
    const firstBeam = beams[0] || {};
    const toX = toFinite(firstBeam.toX, Number.NaN);
    const toY = toFinite(firstBeam.toY, Number.NaN);
    if (Number.isFinite(toX) && Number.isFinite(toY)) {
      return { x: toX, y: toY };
    }

    const fromX = toFinite(firstBeam.fromX, Number.NaN);
    const fromY = toFinite(firstBeam.fromY, Number.NaN);
    if (Number.isFinite(fromX) && Number.isFinite(fromY)) {
      return { x: fromX, y: fromY };
    }
  }

  return {
    x: width * 0.5,
    y: height * 0.35,
  };
}

function refreshTargetSnapshot(target) {
  if (!target?.module) return null;
  const snapshot = readEnemyDebug(target.module);
  if (!isTargetAttackable(snapshot)) return null;
  return {
    ...target,
    snapshot,
  };
}

function setBehaviorState(nextState) {
  if (instance.behaviorState === nextState) return;
  instance.behaviorState = nextState;
  instance.stateEnteredAtMs = instance.runtimeNowMs;
}

function spawnRuntimeUnit() {
  if (!instance.runtime) return null;

  const spawned = instance.runtime.spawnUnit({
    unitId: id,
    atMs: instance.runtimeNowMs,
    lifetime: instance.profile.maxLifetimeMs,
    metadata: {
      cooldownMs: instance.profile.cooldownMs,
      damage: instance.profile.damage,
    },
    source: 'v1-striker-hawk',
  });

  instance.runtimeUnitId = spawned?.runtimeId ?? null;
  instance.lifecycleState = spawned?.state ?? SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  return spawned;
}

function resolveRuntimeUnit() {
  if (!instance.runtime) return null;
  const units = instance.runtime.getActiveUnits(instance.runtimeNowMs);
  if (!units.length) {
    instance.runtimeUnitId = null;
    return null;
  }

  let selected = null;
  if (instance.runtimeUnitId) {
    selected = units.find((unit) => unit.runtimeId === instance.runtimeUnitId) || null;
  }
  if (!selected) selected = units[0];
  instance.runtimeUnitId = selected.runtimeId;
  return selected;
}

function attemptStrike() {
  if (!instance.target?.module || typeof instance.target.module.onHit !== 'function') {
    return false;
  }

  try {
    instance.target.module.onHit({
      damage: instance.profile.damage,
      interrupt: true,
    });
    return true;
  } catch {
    return false;
  }
}

function updateDiveBehavior(dtSeconds, state) {
  switch (instance.behaviorState) {
    case BEHAVIOR_STATES.IDLE: {
      updateOrbit(dtSeconds, state);
      instance.strikeCooldownMs = Math.max(0, instance.strikeCooldownMs - dtSeconds * 1000);
      if (instance.strikeCooldownMs > 0) break;

      const nextTarget = selectTarget();
      if (nextTarget) {
        instance.target = nextTarget;
        setBehaviorState(BEHAVIOR_STATES.TARGETING);
      }
      break;
    }

    case BEHAVIOR_STATES.TARGETING: {
      const refreshed = refreshTargetSnapshot(instance.target);
      if (!refreshed) {
        instance.target = null;
        setBehaviorState(BEHAVIOR_STATES.RECOVER);
        break;
      }
      instance.target = refreshed;
      setBehaviorState(BEHAVIOR_STATES.DIVING);
      break;
    }

    case BEHAVIOR_STATES.DIVING: {
      const refreshed = refreshTargetSnapshot(instance.target);
      if (!refreshed) {
        instance.target = null;
        setBehaviorState(BEHAVIOR_STATES.RECOVER);
        break;
      }
      instance.target = refreshed;
      const targetPosition = resolveTargetPosition(instance.target, state);
      const dx = targetPosition.x - instance.x;
      const dy = targetPosition.y - instance.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= instance.profile.strikeRadiusPx) {
        attemptStrike();
        instance.strikesCompleted += 1;
        instance.lastStrikeAtMs = instance.runtimeNowMs;
        setBehaviorState(BEHAVIOR_STATES.RECOVER);
        break;
      }

      const safeDistance = distance || 1;
      const maxStep = instance.profile.diveSpeedPxPerSec * dtSeconds;
      const travel = Math.min(maxStep, safeDistance);
      instance.x += (dx / safeDistance) * travel;
      instance.y += (dy / safeDistance) * travel;
      break;
    }

    case BEHAVIOR_STATES.RECOVER: {
      const guardian = resolveGuardianPosition(state);
      const returnX = guardian.x + Math.cos(instance.orbitAngle) * instance.profile.orbitRadiusPx;
      const returnY = guardian.y + Math.sin(instance.orbitAngle) * instance.profile.orbitRadiusPx * 0.55;
      const dx = returnX - instance.x;
      const dy = returnY - instance.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= 10) {
        instance.target = null;
        instance.strikeCooldownMs = instance.profile.cooldownMs;
        setBehaviorState(BEHAVIOR_STATES.IDLE);
        break;
      }

      const safeDistance = distance || 1;
      const maxStep = instance.profile.recoverSpeedPxPerSec * dtSeconds;
      const travel = Math.min(maxStep, safeDistance);
      instance.x += (dx / safeDistance) * travel;
      instance.y += (dy / safeDistance) * travel;
      break;
    }
  }
}

export function spawn(ctx = {}) {
  destroy();

  instance.context = ctx && typeof ctx === 'object' ? { ...ctx } : {};
  instance.boundState = normalizeState(instance.context.state);
  instance.profile = buildProfile(instance.context);
  instance.runtimeNowMs = 0;
  instance.runtimeUnitId = null;
  instance.lifecycleState = SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  instance.behaviorState = BEHAVIOR_STATES.IDLE;
  instance.stateEnteredAtMs = 0;
  instance.orbitAngle = normalizeAngle(toFinite(instance.context.startAngle, 0));
  instance.target = null;
  instance.strikeCooldownMs = instance.profile.initialCooldownMs;
  instance.strikesCompleted = 0;
  instance.lastStrikeAtMs = -Infinity;
  positionInOrbit(instance.boundState);

  if (!getFlag('supportStrikerHawk')) {
    return serializeDebug();
  }

  instance.runtime = createSupportRuntime({
    enabled: () => getFlag('supportStrikerHawk'),
    now: () => instance.runtimeNowMs,
    maxUnits: instance.profile.maxUnits,
    maxLifetimeMs: instance.profile.maxLifetimeMs,
  });

  spawnRuntimeUnit();
  return serializeDebug();
}

export function update(dt, state) {
  const safeState = normalizeState(state);
  const dtSeconds = toNonNegativeFinite(dt, 0);
  instance.boundState = safeState;

  if (!getFlag('supportStrikerHawk')) {
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

  const frameMs = dtSeconds * 1000;
  instance.runtimeNowMs += frameMs;
  instance.runtime.onFrame(frameMs, instance.runtimeNowMs);

  const runtimeUnit = resolveRuntimeUnit();
  instance.lifecycleState = runtimeUnit?.state ?? SUPPORT_LIFECYCLE_STATES.DESPAWNED;

  if (!runtimeUnit) {
    instance.target = null;
    setBehaviorState(BEHAVIOR_STATES.IDLE);
    return serializeDebug();
  }

  if (instance.lifecycleState === SUPPORT_LIFECYCLE_STATES.ACTIVE) {
    updateDiveBehavior(dtSeconds, safeState);
  } else {
    instance.target = null;
    setBehaviorState(BEHAVIOR_STATES.IDLE);
    updateOrbit(dtSeconds, safeState);
  }

  return serializeDebug();
}

export function draw(ctx) {
  if (!getFlag('supportStrikerHawk')) return;
  if (!ctx || typeof ctx.save !== 'function') return;
  if (
    instance.lifecycleState === SUPPORT_LIFECYCLE_STATES.DESPAWNED
    || instance.lifecycleState === 'disabled'
  ) {
    return;
  }

  ctx.save();
  ctx.translate(instance.x, instance.y);

  if (instance.behaviorState === BEHAVIOR_STATES.DIVING) {
    ctx.rotate(0.6);
  } else if (instance.behaviorState === BEHAVIOR_STATES.RECOVER) {
    ctx.rotate(-0.35);
  }

  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function destroy() {
  if (instance.runtime) {
    instance.runtime.reset({ atMs: instance.runtimeNowMs });
  }

  instance.context = null;
  instance.boundState = FALLBACK_STATE;
  instance.runtime = null;
  instance.runtimeNowMs = 0;
  instance.runtimeUnitId = null;
  instance.lifecycleState = SUPPORT_LIFECYCLE_STATES.DESPAWNED;
  instance.behaviorState = BEHAVIOR_STATES.IDLE;
  instance.stateEnteredAtMs = 0;
  instance.profile = DEFAULT_PROFILE;
  instance.x = 0;
  instance.y = 0;
  instance.orbitAngle = 0;
  instance.target = null;
  instance.strikeCooldownMs = 0;
  instance.strikesCompleted = 0;
  instance.lastStrikeAtMs = -Infinity;
}

export function serializeDebug() {
  return {
    id,
    enabled: getFlag('supportStrikerHawk'),
    lifecycleState: instance.lifecycleState,
    behaviorState: instance.behaviorState,
    runtimeUnitId: instance.runtimeUnitId,
    stateEnteredAtMs: instance.stateEnteredAtMs,
    x: instance.x,
    y: instance.y,
    orbitAngle: instance.orbitAngle,
    targetId: instance.target?.id ?? null,
    targetThreat: instance.target?.threat ?? null,
    strikeCooldownMs: clamp(instance.strikeCooldownMs, 0, Number.POSITIVE_INFINITY),
    strikesCompleted: instance.strikesCompleted,
    lastStrikeAtMs: instance.lastStrikeAtMs,
    runtime: instance.runtime ? instance.runtime.getDebugState(instance.runtimeNowMs) : null,
  };
}
