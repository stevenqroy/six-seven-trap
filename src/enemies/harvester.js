import S from '../state.js';
import { getFlag } from '../config/flags.js';
import { loadDefaultEnemyRegistry } from '../systems/enemy-registry.js';
import {
  createEnemyStateMachineRuntime,
  ENEMY_LIFECYCLE_STATES,
} from '../systems/enemy-state-machine.js';

export const id = 'harvester';

const DEFAULT_PROFILE = Object.freeze({
  hp: 34,
  beamCount: 2,
  pullStrength: 0.2,
  maxPullVelocity: 8,
  snapDistancePx: 26,
  maxLifetimeMs: 22000,
  lifecycle: Object.freeze({
    spawnMs: 1,
    windupMs: 640,
    activeMs: 480,
    recoverMs: 720,
    idleMs: 1650,
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
  hp: 0,
  profile: DEFAULT_PROFILE,
  activeBeams: [],
  activeTargets: [],
};

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function toNonNegativeFinite(value, fallback = 0) {
  const next = toFinite(value, fallback);
  return next < 0 ? fallback : next;
}

function clampAbs(value, maxAbs) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(maxAbs) || maxAbs <= 0) return value;
  return Math.max(-maxAbs, Math.min(maxAbs, value));
}

function clearTargetLocks() {
  for (let i = 0; i < instance.activeTargets.length; i++) {
    const target = instance.activeTargets[i];
    if (!target || typeof target !== 'object') continue;
    target.harvesterPulling = false;
    target.harvesterPullStrength = 0;
  }
  instance.activeTargets.length = 0;
  instance.activeBeams.length = 0;
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

function readHarvesterDefinition() {
  try {
    const registry = loadDefaultEnemyRegistry();
    if (!registry || typeof registry.getById !== 'function') return null;
    return registry.getById(id);
  } catch (error) {
    console.warn('[Harvester] Failed to load default registry entry:', error);
    return null;
  }
}

function buildProfile(definition, context) {
  const telegraph = definition?.telegraphProfile || {};
  const abilityCooldownMs = getMinimumAbilityCooldownMs(definition);
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
    beamCount: Math.max(
      1,
      Math.round(toNonNegativeFinite(context?.beamCount, DEFAULT_PROFILE.beamCount))
    ),
    pullStrength: toNonNegativeFinite(context?.pullStrength, DEFAULT_PROFILE.pullStrength),
    maxPullVelocity: Math.max(
      2,
      toNonNegativeFinite(context?.maxPullVelocity, DEFAULT_PROFILE.maxPullVelocity)
    ),
    snapDistancePx: Math.max(
      8,
      toNonNegativeFinite(context?.snapDistancePx, DEFAULT_PROFILE.snapDistancePx)
    ),
    maxLifetimeMs: Math.max(
      2500,
      toNonNegativeFinite(context?.maxLifetimeMs, DEFAULT_PROFILE.maxLifetimeMs)
    ),
    lifecycle,
    stateTimeouts,
  };
}

function resolveShipPosition(state) {
  if (instance.context && typeof instance.context.getShipPosition === 'function') {
    const fromContext = instance.context.getShipPosition(state);
    if (Number.isFinite(fromContext?.x) && Number.isFinite(fromContext?.y)) {
      return {
        x: fromContext.x,
        y: fromContext.y,
      };
    }
  }

  const render = state?.badguysRender;
  if (
    render?.ready &&
    Number.isFinite(render.x) &&
    Number.isFinite(render.y) &&
    Number.isFinite(render.w) &&
    Number.isFinite(render.h)
  ) {
    return {
      x: render.x + render.w * 0.5,
      y: render.y + render.h * 0.61,
    };
  }

  if (Number.isFinite(state?.shipX) && Number.isFinite(state?.shipY)) {
    return {
      x: state.shipX,
      y: state.shipY,
    };
  }

  return {
    x: Number.isFinite(state?.wCSS) ? state.wCSS * 0.5 : 0,
    y: Number.isFinite(state?.hCSS) ? state.hCSS * 0.25 : 0,
  };
}

function isGoodTarget(numberEntity) {
  if (!numberEntity || typeof numberEntity !== 'object') return false;
  if (numberEntity.isTrap) return false;
  if (numberEntity.txt !== '6' && numberEntity.txt !== '7') return false;
  return Number.isFinite(numberEntity.x) && Number.isFinite(numberEntity.y);
}

function selectTargets(state, shipPosition, beamCount) {
  const numbers = Array.isArray(state?.nums) ? state.nums : [];
  const candidates = [];

  for (let i = 0; i < numbers.length; i++) {
    const candidate = numbers[i];
    if (!isGoodTarget(candidate)) continue;
    const dx = shipPosition.x - candidate.x;
    const dy = shipPosition.y - candidate.y;
    candidates.push({
      candidate,
      distSq: dx * dx + dy * dy,
    });
  }

  candidates.sort((a, b) => a.distSq - b.distSq);
  return candidates.slice(0, beamCount).map((item) => item.candidate);
}

function pullTargetTowardShip(target, shipPosition, dtSeconds) {
  const dx = shipPosition.x - target.x;
  const dy = shipPosition.y - target.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.001) return null;

  const closeness = Math.max(0, 1 - Math.min(1, distance / 320));
  const pullScale = Math.max(0, dtSeconds * 60);
  const impulse = instance.profile.pullStrength * (1 + closeness * 1.6) * pullScale;
  const nx = dx / distance;
  const ny = dy / distance;

  target.dx = clampAbs(toFinite(target.dx, 0) + nx * impulse, instance.profile.maxPullVelocity);
  target.dy = clampAbs(toFinite(target.dy, 0) + ny * impulse, instance.profile.maxPullVelocity);
  target.harvesterPulling = true;
  target.harvesterPullStrength = Math.max(0.2, Math.min(1, 1 - distance / 420));

  if (distance <= instance.profile.snapDistancePx) {
    target.dx *= 0.7;
    target.dy *= 0.7;
  }

  return {
    fromX: shipPosition.x,
    fromY: shipPosition.y,
    toX: target.x,
    toY: target.y,
    strength: target.harvesterPullStrength,
    targetTxt: target.txt,
    distancePx: distance,
  };
}

function spawnRuntimeEntity() {
  if (!instance.runtime) return null;

  const spawned = instance.runtime.spawnEnemy({
    enemyId: id,
    atMs: instance.runtimeNowMs,
    source: 'v1-harvester',
    lifecycle: instance.profile.lifecycle,
    stateTimeouts: instance.profile.stateTimeouts,
    metadata: {
      beamCount: instance.profile.beamCount,
    },
  });

  instance.runtimeEntityId = spawned?.runtimeId ?? null;
  instance.lifecycleState = spawned?.state ?? ENEMY_LIFECYCLE_STATES.DESPAWNED;
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

export function spawn(ctx = {}) {
  destroy();

  instance.context = ctx && typeof ctx === 'object' ? { ...ctx } : {};
  const definition = readHarvesterDefinition();
  instance.profile = buildProfile(definition, instance.context);
  instance.hp = instance.profile.hp;
  instance.runtimeNowMs = 0;
  instance.lifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;

  if (!getFlag('enemyHarvester')) {
    return serializeDebug();
  }

  instance.runtime = createEnemyStateMachineRuntime({
    enabled: () => getFlag('enemyHarvester'),
    now: () => instance.runtimeNowMs,
    maxLifetimeMs: instance.profile.maxLifetimeMs,
  });

  spawnRuntimeEntity();
  return serializeDebug();
}

export function update(dt, state = S) {
  const safeState = state && typeof state === 'object' ? state : S;
  const dtSeconds = toNonNegativeFinite(dt, 0);

  if (!getFlag('enemyHarvester')) {
    clearTargetLocks();
    instance.lifecycleState = 'disabled';
    return serializeDebug();
  }

  if (!instance.runtime) {
    spawn(instance.context || {});
  }

  if (!instance.runtime) return serializeDebug();

  const frameMs = dtSeconds * 1000;
  instance.runtimeNowMs += frameMs;
  instance.runtime.onFrame(frameMs, instance.runtimeNowMs);

  let runtimeEntity = resolveRuntimeEntity();
  if (!runtimeEntity && instance.hp > 0) {
    runtimeEntity = spawnRuntimeEntity();
  }
  instance.lifecycleState = runtimeEntity?.state ?? ENEMY_LIFECYCLE_STATES.DESPAWNED;

  clearTargetLocks();

  if (instance.hp <= 0 || instance.lifecycleState !== ENEMY_LIFECYCLE_STATES.ACTIVE) {
    return serializeDebug();
  }

  const shipPosition = resolveShipPosition(safeState);
  const targets = selectTargets(safeState, shipPosition, instance.profile.beamCount);

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const beam = pullTargetTowardShip(target, shipPosition, dtSeconds);
    if (!beam) continue;
    instance.activeTargets.push(target);
    instance.activeBeams.push(beam);
  }

  return serializeDebug();
}

export function draw(ctx) {
  if (!getFlag('enemyHarvester')) return;
  if (!ctx || typeof ctx.save !== 'function') return;
  if (!instance.activeBeams.length) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < instance.activeBeams.length; i++) {
    const beam = instance.activeBeams[i];
    const strength = toNonNegativeFinite(beam.strength, 0.3);
    ctx.strokeStyle = `rgba(160, 239, 255, ${0.22 + strength * 0.58})`;
    ctx.shadowColor = 'rgba(125, 224, 255, 0.75)';
    ctx.shadowBlur = 10 + strength * 14;
    ctx.lineWidth = 1.6 + strength * 2.3;
    ctx.beginPath();
    ctx.moveTo(beam.fromX, beam.fromY);
    ctx.lineTo(beam.toX, beam.toY);
    ctx.stroke();
  }

  ctx.restore();
}

export function destroy() {
  clearTargetLocks();
  if (instance.runtime) {
    instance.runtime.reset({ atMs: instance.runtimeNowMs });
  }
  instance.context = null;
  instance.runtime = null;
  instance.runtimeNowMs = 0;
  instance.runtimeEntityId = null;
  instance.lifecycleState = ENEMY_LIFECYCLE_STATES.DESPAWNED;
  instance.hp = 0;
  instance.profile = DEFAULT_PROFILE;
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
    enabled: getFlag('enemyHarvester'),
    hp: instance.hp,
    lifecycleState: instance.lifecycleState,
    beamCount: instance.activeBeams.length,
    activeBeams: instance.activeBeams.map((beam) => ({ ...beam })),
    runtime: instance.runtime ? instance.runtime.getDebugState(instance.runtimeNowMs) : null,
  };
}
