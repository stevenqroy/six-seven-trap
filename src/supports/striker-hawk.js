
import S from '../state.js';
import { getFlag } from '../config/flags.js';
import * as harvester from '../enemies/harvester.js';
import * as skimmer from '../enemies/skimmer.js';

export const id = 'strikerHawk';

const LIFECYCLE_STATES = {
  IDLE: 'idle',
  TARGETING: 'targeting',
  DIVING: 'diving',
  RECOVER: 'recover',
};

const DEFAULT_PROFILE = Object.freeze({
  cooldownMs: 4000,
  orbitRadius: 100,
  orbitSpeed: 1.5,
  diveSpeed: 800,
  damage: 5,
});

const instance = {
  lifecycleState: LIFECYCLE_STATES.IDLE,
  stateEnteredAtMs: 0,
  x: 0,
  y: 0,
  orbitAngle: 0,
  target: null,
  cooldownUntil: 0,
  trail: [],
};

function toNonNegativeFinite(value, fallback = 0) {
  const next = Number.isFinite(value) ? value : fallback;
  return next < 0 ? fallback : next;
}

function selectTarget() {
  const harvesterState = harvester.serializeDebug();
  const skimmerState = skimmer.serializeDebug();

  const targets = [];

  if (harvesterState.enabled && harvesterState.hp > 0) {
    targets.push({ id: 'harvester', threat: 3, state: harvesterState });
  }
  if (skimmerState.enabled && skimmerState.hp > 0) {
    targets.push({ id: 'skimmer', threat: 2, state: skimmerState });
  }
  // No "other" enemies are accessible this way.

  if (targets.length === 0) {
    return null;
  }

  targets.sort((a, b) => b.threat - a.threat);
  return targets[0];
}

function setState(nextState) {
  if (instance.lifecycleState === nextState) return;
  instance.lifecycleState = nextState;
  instance.stateEnteredAtMs = performance.now();
}

export function spawn() {
  destroy();
  if (!getFlag('supportStrikerHawk')) return;

  instance.x = S.wCSS / 2;
  instance.y = -DEFAULT_PROFILE.orbitRadius;
  instance.cooldownUntil = performance.now() + 1000; // Initial cooldown
}

export function update(dt) {
  if (!getFlag('supportStrikerHawk')) {
    destroy();
    return;
  }

  const now = performance.now();
  const dtSeconds = toNonNegativeFinite(dt, 0);

  switch (instance.lifecycleState) {
    case LIFECYCLE_STATES.IDLE: {
      instance.orbitAngle += DEFAULT_PROFILE.orbitSpeed * dtSeconds;
      instance.x = S.wCSS / 2 + Math.cos(instance.orbitAngle) * DEFAULT_PROFILE.orbitRadius;
      instance.y = -DEFAULT_PROFILE.orbitRadius + Math.sin(instance.orbitAngle) * DEFAULT_PROFILE.orbitRadius * 0.5;

      if (now >= instance.cooldownUntil) {
        const target = selectTarget();
        if (target) {
          instance.target = target;
          setState(LIFECYCLE_STATES.TARGETING);
        }
      }
      break;
    }
    case LIFECYCLE_STATES.TARGETING: {
      // Simple lock-on, then dive
      setState(LIFECYCLE_STATES.DIVING);
      break;
    }
    case LIFECYCLE_STATES.DIVING: {
      if (!instance.target) {
        setState(LIFECYCLE_STATES.RECOVER);
        break;
      }
      const targetState = instance.target.id === 'harvester' ? harvester.serializeDebug() : skimmer.serializeDebug();
      if (!targetState.enabled || targetState.hp <= 0) {
        setState(LIFECYCLE_STATES.RECOVER);
        break;
      }
      
      const targetX = targetState.x + (targetState.w / 2 || 0);
      const targetY = targetState.y + (targetState.h / 2 || 0);

      const dx = targetX - instance.x;
      const dy = targetY - instance.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 50) {
        if (instance.target.id === 'harvester') {
          harvester.onHit({ damage: DEFAULT_PROFILE.damage, interrupt: true });
        } else if (instance.target.id === 'skimmer') {
          skimmer.onHit({ damage: DEFAULT_PROFILE.damage, interrupt: true });
        }
        setState(LIFECYCLE_STATES.RECOVER);
      } else {
        const moveX = (dx / dist) * DEFAULT_PROFILE.diveSpeed * dtSeconds;
        const moveY = (dy / dist) * DEFAULT_PROFILE.diveSpeed * dtSeconds;
        instance.x += moveX;
        instance.y += moveY;
      }
      break;
    }
    case LIFECYCLE_STATES.RECOVER: {
      const orbitY = -DEFAULT_PROFILE.orbitRadius;
      const returnDx = S.wCSS / 2 - instance.x;
      const returnDy = orbitY - instance.y;
      const returnDist = Math.hypot(returnDx, returnDy);

      if (returnDist < 10) {
        setState(LIFECYCLE_STATES.IDLE);
        instance.cooldownUntil = now + DEFAULT_PROFILE.cooldownMs;
        instance.target = null;
      } else {
        const moveX = (returnDx / returnDist) * DEFAULT_PROFILE.diveSpeed * 0.5 * dtSeconds;
        const moveY = (returnDy / returnDist) * DEFAULT_PROFILE.diveSpeed * 0.5 * dtSeconds;
        instance.x += moveX;
        instance.y += moveY;
      }
      break;
    }
  }
}

export function draw(ctx) {
  if (!getFlag('supportStrikerHawk')) return;

  ctx.save();
  ctx.translate(instance.x, instance.y);

  // Simple triangle shape for the hawk
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
  instance.lifecycleState = LIFECYCLE_STATES.IDLE;
  instance.target = null;
  instance.trail = [];
  instance.cooldownUntil = 0;
  instance.x = 0;
  instance.y = 0;
}

export function serializeDebug() {
  return {
    id,
    enabled: getFlag('supportStrikerHawk'),
    ...instance,
  };
}
