import S from '../state.js';
import { getFlag } from '../config/flags.js';
import { loadDefaultEnemyRegistry } from '../systems/enemy-registry.js';
import {
  createEnemyStateMachineRuntime,
  ENEMY_LIFECYCLE_STATES,
} from '../systems/enemy-state-machine.js';

export const id = 'skimmer';

const DEFAULT_PROFILE = Object.freeze({
  hp: 24,
  widthPx: 66,
  heightPx: 28,
  yRatio: 0.28,
  dashSpeedPxPerSec: 760,
  dashAccelPxPerSec2: 2800,
  windupSpeedPxPerSec: 120,
  idleSpeedPxPerSec: 180,
  recoverDampingPer60Hz: 0.84,
  edgePaddingPx: 18,
  maxTrailPoints: 14,
  trailFadePerSecond: 3.2,
  maxLifetimeMs: 22000,
  lifecycle: Object.freeze({
    spawnMs: 1,
    windupMs: 320,
    activeMs: 180,
    recoverMs: 460,
    idleMs: 1100,
  }),
  stateTimeouts: Object.freeze({
    spawn: 1200,
    windup: 5000,
    active: 5000,
    recover: 5000,
    idle: 6500,
    dead: 1000,
  }),
});

const instance = {
  context: null,
  runtime: null,
  runtimeNowMs: 0,
  runtimeEntityId: null,
  lifecycleState: ENEMY_LIFECYCLE_STATES.DESPAWNED,
  previousLifecycleState: ENEMY_LIFECYCLE_STATES.DESPAWNED,
  hp: 0,
  profile: DEFAULT_PROFILE,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  dashDirection: 1,
  initializedForArena: false,
  strafingRuns: 0,
  trail: [],
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

function normalizeDirection(value, fallback = 1) {
  if (value === 0) return fallback;
  return value < 0 ? -1 : 1;
}

function readSkimmerDefinition() {
  try {
    const registry = loadDefaultEnemyRegistry();
    if (!registry || typeof registry.getById !== 'function') return null;
    return registry.getById(id);
  } catch (error) {
    console.warn('[Skimmer] Failed to load default registry entry:', error);
    return null;
  }
}

function getMinimumAbilityCooldownMs(definition) {
  const abilities = Array.isArray(definition?.abilities) ? definition.abilities : [];
  let minCooldown = Number.POSITIVE_INFINITY;
  for (let i = 0; i < abilities.length; i++) {
    const cooldownMs = abilities[i]?.cooldownMs;
    if (Number.isFinite(cooldownMs) && cooldownMs >= 0) {
      minCooldown = Math.min(minCooldown, cooldownMs);
    }
  }
  return Number.isFinite(minCooldown) ? minCooldown : DEFAULT_PROFILE.lifecycle.idleMs;
}

function buildProfile(definition, context) {
  const telegraph = definition?.telegraphProfile || {};
  const abilityCooldownMs = getMinimumAbilityCooldownMs(definition);
  const speedScale = Math.max(0.35, toNonNegativeFinite(definition?.stats?.speed, 1));
  const sizeScale = Math.max(0.45, toNonNegativeFinite(definition?.stats?.size, 1));
  const lifecycle = {
    spawnMs: DEFAULT_PROFILE.lifecycle.spawnMs,
    windupMs: toNonNegativeFinite(telegraph.windupMs, DEFAULT_PROFILE.lifecycle.windupMs),
    activeMs: toNonNegativeFinite(telegraph.activeMs, DEFAULT_PROFILE.lifecycle.activeMs),
    recoverMs: toNonNegativeFinite(telegraph.recoverMs, DEFAULT_PROFILE.lifecycle.recoverMs),
    idleMs: toNonNegativeFinite(abilityCooldownMs, DEFAULT_PROFILE.lifecycle.idleMs),
  };
  const stateTimeouts = {
    spawn: Math.max(350, lifecycle.spawnMs + 1200),
    windup: Math.max(600, lifecycle.windupMs + 1200),
    active: Math.max(600, lifecycle.activeMs + 1200),
    recover: Math.max(600, lifecycle.recoverMs + 1200),
    idle: Math.max(900, lifecycle.idleMs + 1400),
    dead: DEFAULT_PROFILE.stateTimeouts.dead,
  };

  return {
    hp: Math.max(1, Math.round(toNonNegativeFinite(definition?.stats?.hp, DEFAULT_PROFILE.hp))),
    widthPx: Math.round(DEFAULT_PROFILE.widthPx * sizeScale),
    heightPx: Math.round(DEFAULT_PROFILE.heightPx * sizeScale),
    yRatio: clamp(toNonNegativeFinite(context?.yRatio, DEFAULT_PROFILE.yRatio), 0.08, 0.62),
    dashSpeedPxPerSec: Math.max(
      240,
      toNonNegativeFinite(
        context?.dashSpeedPxPerSec,
        DEFAULT_PROFILE.dashSpeedPxPerSec * speedScale
      )
    ),
    dashAccelPxPerSec2: Math.max(
      600,
      toNonNegativeFinite(context?.dashAccelPxPerSec2, DEFAULT_PROFILE.dashAccelPxPerSec2)
    ),
    windupSpeedPxPerSec: Math.max(
      40,
      toNonNegativeFinite(context?.windupSpeedPxPerSec, DEFAULT_PROFILE.windupSpeedPxPerSec)
    ),
    idleSpeedPxPerSec: Math.max(
      60,
      toNonNegativeFinite(context?.idleSpeedPxPerSec, DEFAULT_PROFILE.idleSpeedPxPerSec)
    ),
    recoverDampingPer60Hz: clamp(
      toNonNegativeFinite(context?.recoverDampingPer60Hz, DEFAULT_PROFILE.recoverDampingPer60Hz),
      0.1,
      0.99
    ),
    edgePaddingPx: Math.max(
      0,
      toNonNegativeFinite(context?.edgePaddingPx, DEFAULT_PROFILE.edgePaddingPx)
    ),
    maxTrailPoints: Math.max(
      0,
      Math.round(toNonNegativeFinite(context?.maxTrailPoints, DEFAULT_PROFILE.maxTrailPoints))
    ),
    trailFadePerSecond: Math.max(
      0.4,
      toNonNegativeFinite(context?.trailFadePerSecond, DEFAULT_PROFILE.trailFadePerSecond)
    ),
    maxLifetimeMs: Math.max(
      2500,
      toNonNegativeFinite(context?.maxLifetimeMs, DEFAULT_PROFILE.maxLifetimeMs)
    ),
    lifecycle,
    stateTimeouts,
  };
}

function resolveArena(state) {
  const width = Math.max(220, toNonNegativeFinite(state?.wCSS, 800));
  const height = Math.max(180, toNonNegativeFinite(state?.hCSS, 600));
  const left = instance.profile.edgePaddingPx;
  const right = Math.max(left, width - instance.profile.edgePaddingPx - instance.profile.widthPx);
  const minY = Math.max(40, height * 0.08);
  const maxY = Math.max(minY, height * 0.62 - instance.profile.heightPx);
  const defaultY = clamp(height * instance.profile.yRatio, minY, maxY);

  return { width, height, left, right, minY, maxY, defaultY };
}

function clearTrail() {
  instance.trail.length = 0;
}

function initializePositionForArena(state) {
  if (instance.initializedForArena) return;
  const arena = resolveArena(state);
  const context = instance.context || {};
  const direction = normalizeDirection(context.direction, 1);
  instance.dashDirection = direction;
  instance.x = Number.isFinite(context.x) ? context.x : direction > 0 ? arena.left : arena.right;
  instance.y = Number.isFinite(context.y) ? context.y : arena.defaultY;
  instance.x = clamp(instance.x, arena.left, arena.right);
  instance.y = clamp(instance.y, arena.minY, arena.maxY);
  instance.initializedForArena = true;
}

function spawnRuntimeEntity() {
  if (!instance.runtime) return null;

  const spawned = instance.runtime.spawnEnemy({
    enemyId: id,
    atMs: instance.runtimeNowMs,
    source: 'v1-skimmer',
    lifecycle: instance.profile.lifecycle,
    stateTimeouts: instance.profile.stateTimeouts,
    metadata: {
      dashSpeedPxPerSec: instance.profile.dashSpeedPxPerSec,
    },
  });

  instance.runtimeEntityId = spawned?.runtimeId ?? null;
  instance.lifecycleState = spawned?.state ?? ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.previousLifecycleState = instance.lifecycleState;
  return spawned;
}

function resolveRuntimeEntity() {
  if (!instance.runtime) return null;

  const entities = instance.runtime.getEntities(instance.runtimeNowMs);
  if (!entities.length) {
    instance.runtimeEntityId = null;
    return null;
  }

  let selected = null;
  if (instance.runtimeEntityId) {
    selected = entities.find((entity) => entity.runtimeId === instance.runtimeEntityId) || null;
  }
  if (!selected) selected = entities[0];
  instance.runtimeEntityId = selected.runtimeId;
  return selected;
}

function applyLifecycleTransition(nextState) {
  if (nextState === instance.previousLifecycleState) return;

  if (nextState === ENEMY_LIFECYCLE_STATES.ACTIVE) {
    instance.vx =
      normalizeDirection(instance.dashDirection, 1) * instance.profile.dashSpeedPxPerSec * 0.68;
    instance.strafingRuns += 1;
  }

  instance.previousLifecycleState = nextState;
}

function applyMovement(dtSeconds, state) {
  const dt = Math.max(0, dtSeconds);
  const arena = resolveArena(state);
  const accelStep = instance.profile.dashAccelPxPerSec2 * dt;

  switch (instance.lifecycleState) {
    case ENEMY_LIFECYCLE_STATES.WINDUP: {
      const target = -instance.dashDirection * instance.profile.windupSpeedPxPerSec;
      if (Math.abs(target - instance.vx) <= accelStep) {
        instance.vx = target;
      } else {
        instance.vx += Math.sign(target - instance.vx) * accelStep;
      }
      break;
    }
    case ENEMY_LIFECYCLE_STATES.ACTIVE: {
      const target = instance.dashDirection * instance.profile.dashSpeedPxPerSec;
      if (Math.abs(target - instance.vx) <= accelStep) {
        instance.vx = target;
      } else {
        instance.vx += Math.sign(target - instance.vx) * accelStep;
      }
      break;
    }
    case ENEMY_LIFECYCLE_STATES.RECOVER: {
      const damping = Math.pow(instance.profile.recoverDampingPer60Hz, dt * 60);
      instance.vx *= damping;
      instance.vy *= damping;
      break;
    }
    case ENEMY_LIFECYCLE_STATES.IDLE: {
      const target = instance.dashDirection * instance.profile.idleSpeedPxPerSec;
      const slowStep = accelStep * 0.45;
      if (Math.abs(target - instance.vx) <= slowStep) {
        instance.vx = target;
      } else {
        instance.vx += Math.sign(target - instance.vx) * slowStep;
      }
      break;
    }
    case ENEMY_LIFECYCLE_STATES.DEAD:
    case ENEMY_LIFECYCLE_STATES.DESPAWNED: {
      instance.vx = 0;
      instance.vy = 0;
      break;
    }
    default: {
      instance.vx *= 0.9;
      instance.vy *= 0.9;
      break;
    }
  }

  instance.x += instance.vx * dt;
  instance.y += instance.vy * dt;

  if (instance.x <= arena.left) {
    instance.x = arena.left;
    instance.dashDirection = 1;
    instance.vx = Math.abs(instance.vx);
  } else if (instance.x >= arena.right) {
    instance.x = arena.right;
    instance.dashDirection = -1;
    instance.vx = -Math.abs(instance.vx);
  }

  instance.y = clamp(instance.y, arena.minY, arena.maxY);
}

function updateTrail(dtSeconds) {
  const decay = dtSeconds * instance.profile.trailFadePerSecond;
  for (let i = instance.trail.length - 1; i >= 0; i--) {
    const particle = instance.trail[i];
    particle.life -= decay;
    if (particle.life <= 0) {
      instance.trail.splice(i, 1);
    }
  }
}

function addTrailMarker() {
  if (instance.profile.maxTrailPoints <= 0) return;
  if (instance.lifecycleState !== ENEMY_LIFECYCLE_STATES.ACTIVE) return;

  instance.trail.push({
    x: instance.x + instance.profile.widthPx * 0.5,
    y: instance.y + instance.profile.heightPx * 0.5,
    life: 1,
  });

  if (instance.trail.length > instance.profile.maxTrailPoints) {
    instance.trail.splice(0, instance.trail.length - instance.profile.maxTrailPoints);
  }
}

export function spawn(ctx = {}) {
  destroy();

  instance.context = ctx && typeof ctx === 'object' ? { ...ctx } : {};
  const definition = readSkimmerDefinition();
  instance.profile = buildProfile(definition, instance.context);
  instance.hp = instance.profile.hp;
  instance.runtimeNowMs = 0;
  instance.lifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.previousLifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.strafingRuns = 0;

  if (!getFlag('enemySkimmer')) {
    return serializeDebug();
  }

  instance.runtime = createEnemyStateMachineRuntime({
    enabled: () => getFlag('enemySkimmer'),
    now: () => instance.runtimeNowMs,
    maxLifetimeMs: instance.profile.maxLifetimeMs,
  });

  spawnRuntimeEntity();
  return serializeDebug();
}

export function update(dt, state = S) {
  const safeState = state && typeof state === 'object' ? state : S;
  const dtSeconds = toNonNegativeFinite(dt, 0);

  if (!getFlag('enemySkimmer')) {
    clearTrail();
    instance.lifecycleState = 'disabled';
    return serializeDebug();
  }

  if (!instance.runtime) {
    spawn(instance.context || {});
  }

  if (!instance.runtime) return serializeDebug();

  initializePositionForArena(safeState);

  const frameMs = dtSeconds * 1000;
  instance.runtimeNowMs += frameMs;
  instance.runtime.onFrame(frameMs, instance.runtimeNowMs);

  let runtimeEntity = resolveRuntimeEntity();
  if (!runtimeEntity && instance.hp > 0) {
    runtimeEntity = spawnRuntimeEntity();
  }
  instance.lifecycleState = runtimeEntity?.state ?? ENEMY_LIFECYCLE_STATES.DESPAWNED;
  applyLifecycleTransition(instance.lifecycleState);

  updateTrail(dtSeconds);
  if (instance.hp > 0 && instance.lifecycleState !== ENEMY_LIFECYCLE_STATES.DESPAWNED) {
    applyMovement(dtSeconds, safeState);
    addTrailMarker();
  }

  return serializeDebug();
}

function getBodyColor() {
  switch (instance.lifecycleState) {
    case ENEMY_LIFECYCLE_STATES.SPAWN:
      return '#ffd86b';
    case ENEMY_LIFECYCLE_STATES.WINDUP:
      return '#ff9f43';
    case ENEMY_LIFECYCLE_STATES.ACTIVE:
      return '#ff4d6d';
    case ENEMY_LIFECYCLE_STATES.RECOVER:
      return '#8f95ff';
    case ENEMY_LIFECYCLE_STATES.DEAD:
      return '#8d8d8d';
    default:
      return '#74e8ff';
  }
}

export function draw(ctx) {
  if (!getFlag('enemySkimmer')) return;
  if (!ctx || typeof ctx.save !== 'function') return;
  if (!instance.initializedForArena) return;

  ctx.save();

  for (let i = 0; i < instance.trail.length; i++) {
    const marker = instance.trail[i];
    const alpha = clamp(marker.life, 0, 1) * 0.42;
    ctx.fillStyle = `rgba(116, 232, 255, ${alpha})`;
    ctx.fillRect(
      marker.x - instance.profile.widthPx * 0.33,
      marker.y - instance.profile.heightPx * 0.22,
      instance.profile.widthPx * 0.66,
      instance.profile.heightPx * 0.44
    );
  }

  ctx.fillStyle = getBodyColor();
  ctx.fillRect(instance.x, instance.y, instance.profile.widthPx, instance.profile.heightPx);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.fillRect(
    instance.x + instance.profile.widthPx * 0.24,
    instance.y + instance.profile.heightPx * 0.25,
    instance.profile.widthPx * 0.52,
    instance.profile.heightPx * 0.28
  );

  if (instance.lifecycleState === ENEMY_LIFECYCLE_STATES.ACTIVE) {
    ctx.strokeStyle = 'rgba(255, 142, 167, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      instance.x + (instance.dashDirection > 0 ? instance.profile.widthPx : 0),
      instance.y + instance.profile.heightPx * 0.5
    );
    ctx.lineTo(
      instance.x + (instance.dashDirection > 0 ? instance.profile.widthPx + 14 : -14),
      instance.y + instance.profile.heightPx * 0.5
    );
    ctx.stroke();
  }

  ctx.restore();
}

export function destroy() {
  clearTrail();
  if (instance.runtime) {
    instance.runtime.reset({ atMs: instance.runtimeNowMs });
  }
  instance.context = null;
  instance.runtime = null;
  instance.runtimeNowMs = 0;
  instance.runtimeEntityId = null;
  instance.lifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.previousLifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.hp = 0;
  instance.profile = DEFAULT_PROFILE;
  instance.x = 0;
  instance.y = 0;
  instance.vx = 0;
  instance.vy = 0;
  instance.dashDirection = 1;
  instance.initializedForArena = false;
  instance.strafingRuns = 0;
}

export function onHit(payload = {}) {
  if (!instance.runtime) return false;
  const runtimeEntity = resolveRuntimeEntity();
  if (!runtimeEntity) return false;

  const hitPayload = payload && typeof payload === 'object' ? payload : {};
  const interrupt = hitPayload.interrupt === true;
  const damage = toNonNegativeFinite(hitPayload.damage, 0);

  if (interrupt) {
    instance.runtime.transition(runtimeEntity.runtimeId, ENEMY_LIFECYCLE_STATES.RECOVER, {
      atMs: instance.runtimeNowMs,
      reason: 'interrupt',
    });
  }

  if (damage > 0) {
    instance.hp = Math.max(0, instance.hp - damage);
    if (instance.hp === 0) {
      instance.runtime.markDead(runtimeEntity.runtimeId, {
        atMs: instance.runtimeNowMs,
        reason: 'destroyed',
      });
    }
  }

  const nextEntity = resolveRuntimeEntity();
  instance.lifecycleState = nextEntity?.state ?? ENEMY_LIFECYCLE_STATES.DESPAWNED;
  return true;
}

export function serializeDebug() {
  return {
    id,
    enabled: getFlag('enemySkimmer'),
    hp: instance.hp,
    lifecycleState: instance.lifecycleState,
    runtimeEntityId: instance.runtimeEntityId,
    x: instance.x,
    y: instance.y,
    vx: instance.vx,
    vy: instance.vy,
    dashDirection: instance.dashDirection,
    strafingRuns: instance.strafingRuns,
    trailCount: instance.trail.length,
    runtime: instance.runtime ? instance.runtime.getDebugState(instance.runtimeNowMs) : null,
  };
}
