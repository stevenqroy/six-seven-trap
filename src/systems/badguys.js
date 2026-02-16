import { SCENE, BADGUYS_SPRITE_SHEET } from '../constants.js';
import { clamp, edgeBiasedUnit } from '../utils/math.js';
import { getPhaseSpeedMultiplier } from './progression.js';

/**
 * Badguys flight controller — ship movement, target picking, bounds, sprite state.
 * Extracted from main.js (S7R-081). No rendering side effects.
 */

// ── Bounds ───────────────────────────────────────────────────────

/**
 * Calculate the flight boundary box for the badguys ship.
 * @param {number} drawW   - rendered width of the ship sprite
 * @param {number} drawH   - rendered height of the ship sprite
 * @param {number} viewW   - viewport width (wCSS)
 * @param {number} viewH   - viewport height (hCSS)
 * @param {object} overlay  - badguysOverlay ({ scale, y })
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
export function getBadguysBounds(drawW, drawH, viewW, viewH, overlay) {
  const sidePad = Math.max(SCENE.BADGUYS_SIDE_PAD_MIN, viewW * SCENE.BADGUYS_SIDE_PAD_RATIO);
  const minX = sidePad;
  const maxX = Math.max(minX, viewW - drawW - sidePad);
  const minY = Math.max(SCENE.BADGUYS_MIN_Y_BUFFER, overlay.y);
  const maxY = Math.max(minY, viewH * SCENE.BADGUYS_MAX_Y_RATIO - drawH);
  return { minX, maxX, minY, maxY };
}

// ── Target picking ───────────────────────────────────────────────

/**
 * Pick a new random flight target within bounds.
 * @param {object}   flight - S.badguysFlight state object (mutated)
 * @param {object}   bounds - { minX, maxX, minY, maxY }
 * @param {function} rng    - seeded random()
 */
export function pickBadguysTarget(flight, bounds, rng) {
  const xT = rng() < SCENE.BADGUYS_EDGE_BIAS_X_THRESHOLD
    ? edgeBiasedUnit(SCENE.BADGUYS_EDGE_BIAS_X_POWER, rng)
    : rng();
  const yT = rng() < SCENE.BADGUYS_EDGE_BIAS_Y_THRESHOLD
    ? edgeBiasedUnit(SCENE.BADGUYS_EDGE_BIAS_Y_POWER, rng)
    : rng();
  flight.targetX = bounds.minX + xT * (bounds.maxX - bounds.minX || 1);
  flight.targetY = bounds.minY + yT * (bounds.maxY - bounds.minY || 1);
}

// ── Flight physics ───────────────────────────────────────────────

/**
 * Update badguys flight physics — swooping, bouncing, retargeting.
 * @param {object}   flight    - S.badguysFlight (mutated)
 * @param {number}   now       - current timestamp (ms)
 * @param {number}   dt        - frame delta (seconds)
 * @param {number}   drawW     - rendered width
 * @param {number}   drawH     - rendered height
 * @param {number}   viewW     - viewport width
 * @param {number}   viewH     - viewport height
 * @param {object}   overlay   - badguysOverlay
 * @param {number}   bossPhase - S.bossPhase
 * @param {function} rng       - seeded random()
 */
export function updateBadguysFlight(flight, now, dt, drawW, drawH, viewW, viewH, overlay, bossPhase, rng) {
  const bounds = getBadguysBounds(drawW, drawH, viewW, viewH, overlay);

  if (!flight.initialized) {
    flight.x = clamp((viewW - drawW) / 2, bounds.minX, bounds.maxX);
    flight.y = clamp(bounds.minY + SCENE.BADGUYS_INIT_Y_OFFSET, bounds.minY, bounds.maxY);
    flight.vx = 0;
    flight.vy = 0;
    flight.currentSpeed = SCENE.BADGUYS_INITIAL_SPEED;
    flight.targetSpeed = SCENE.BADGUYS_INITIAL_TARGET_SPEED;
    flight.swoopFreq = SCENE.BADGUYS_SWOOP_FREQ_BASE + rng() * SCENE.BADGUYS_SWOOP_FREQ_BASE;
    flight.swoopPhase = rng() * Math.PI * 2;
    flight.swoopForce = SCENE.BADGUYS_SWOOP_FORCE_BASE + rng() * SCENE.BADGUYS_SWOOP_FORCE_RAND;
    pickBadguysTarget(flight, bounds, rng);
    flight.nextRetargetAt = now + SCENE.BADGUYS_RETARGET_MIN_MS + rng() * SCENE.BADGUYS_RETARGET_RAND_MS;
    flight.nextSpeedShiftAt = now + SCENE.BADGUYS_SPEED_SHIFT_MIN_MS + rng() * SCENE.BADGUYS_SPEED_SHIFT_RAND_MS;
    flight.initialized = true;
  }

  if (now >= flight.nextRetargetAt) {
    pickBadguysTarget(flight, bounds, rng);
    flight.nextRetargetAt = now + SCENE.BADGUYS_RETARGET_MIN_MS + rng() * SCENE.BADGUYS_RETARGET_RAND_MS;
  }

  if (now >= flight.nextSpeedShiftAt) {
    const speedMult = getPhaseSpeedMultiplier(bossPhase);
    flight.targetSpeed = (SCENE.BADGUYS_SPEED_SHIFT_BASE + rng() * SCENE.BADGUYS_SPEED_SHIFT_RANGE) * speedMult;
    flight.swoopFreq = (SCENE.BADGUYS_SPEED_SHIFT_SWOOP_FREQ_BASE + rng() * SCENE.BADGUYS_SPEED_SHIFT_SWOOP_FREQ_RAND) * (1 + (speedMult - 1) * 0.5);
    flight.swoopForce = (SCENE.BADGUYS_SPEED_SHIFT_SWOOP_FORCE_BASE + rng() * SCENE.BADGUYS_SPEED_SHIFT_SWOOP_FORCE_RAND) * speedMult;
    flight.nextSpeedShiftAt = now + (SCENE.BADGUYS_SPEED_SHIFT_MIN_MS + rng() * SCENE.BADGUYS_SPEED_SHIFT_RAND_MS_EXTENDED) / speedMult;
  }

  const dx = flight.targetX - flight.x;
  const dy = flight.targetY - flight.y;
  const dist = Math.hypot(dx, dy);

  if (dist < SCENE.BADGUYS_TARGET_ARRIVE_DIST) {
    pickBadguysTarget(flight, bounds, rng);
  }

  const speedRamp = Math.min(1, dt * SCENE.BADGUYS_SPEED_RAMP_FACTOR);
  flight.currentSpeed += (flight.targetSpeed - flight.currentSpeed) * speedRamp;
  const desiredSpeed = Math.min(SCENE.BADGUYS_MAX_SPEED, Math.max(SCENE.BADGUYS_MIN_SPEED, Math.min(dist * SCENE.BADGUYS_DIST_SPEED_FACTOR, flight.currentSpeed)));
  const dirX = dist > 0.001 ? dx / dist : 0;
  const dirY = dist > 0.001 ? dy / dist : 0;
  const desiredVx = dirX * desiredSpeed;
  const desiredVy = dirY * desiredSpeed;
  const smoothFactor = Math.min(1, SCENE.BADGUYS_VELOCITY_SMOOTH_FACTOR * dt);

  flight.vx += (desiredVx - flight.vx) * smoothFactor;
  flight.vy += (desiredVy - flight.vy) * smoothFactor;
  const swoopAccel = Math.sin(now * flight.swoopFreq + flight.swoopPhase) * flight.swoopForce;
  flight.vy += swoopAccel * dt;
  flight.vx += Math.cos(now * flight.swoopFreq * SCENE.BADGUYS_SWOOP_FREQ_HORIZONTAL_RATIO + flight.swoopPhase) * SCENE.BADGUYS_HORIZONTAL_SWOOP_FORCE * dt;

  flight.x += flight.vx * dt;
  flight.y += flight.vy * dt;

  if (flight.x <= bounds.minX || flight.x >= bounds.maxX) {
    const hitLeft = flight.x <= bounds.minX;
    flight.x = clamp(flight.x, bounds.minX, bounds.maxX);
    const bounceBoost = SCENE.BADGUYS_BOUNCE_BOOST_BASE + rng() * SCENE.BADGUYS_BOUNCE_BOOST_RAND;
    const boostedVx = Math.min(SCENE.BADGUYS_BOUNCE_MAX_VX, Math.max(SCENE.BADGUYS_BOUNCE_MIN_VX, Math.abs(flight.vx)) * bounceBoost + SCENE.BADGUYS_BOUNCE_OFFSET);
    flight.vx = hitLeft ? boostedVx : -boostedVx;
    flight.vy += (rng() - 0.5) * SCENE.BADGUYS_BOUNCE_JITTER_Y;
    pickBadguysTarget(flight, bounds, rng);
  }

  if (flight.y <= bounds.minY || flight.y >= bounds.maxY) {
    flight.y = clamp(flight.y, bounds.minY, bounds.maxY);
    flight.vy *= SCENE.BADGUYS_FLOOR_BOUNCE_DAMPING;
    flight.vx += (rng() - 0.5) * SCENE.BADGUYS_FLOOR_BOUNCE_JITTER_X;
    pickBadguysTarget(flight, bounds, rng);
  }
}

// ── Orchestrator ─────────────────────────────────────────────────

/**
 * Update badguys state — checks sprite readiness, computes dimensions,
 * runs flight physics, applies recoil.
 * @param {object} flight  - S.badguysFlight (mutated)
 * @param {object} render  - S.badguysRender (mutated)
 * @param {object} params
 * @param {number}   params.now           - current timestamp (ms)
 * @param {number}   params.dt            - frame delta (seconds)
 * @param {object}   params.overlay       - S.badguysOverlay
 * @param {boolean}  params.visible       - S.badguysVisible
 * @param {boolean}  params.motionPaused  - S.badguysMotionPausedForLightSetup
 * @param {number}   params.bossPhase     - S.bossPhase
 * @param {number}   params.recoilX       - S.shipRecoilX
 * @param {number}   params.recoilY       - S.shipRecoilY
 * @param {number}   params.viewW         - wCSS
 * @param {number}   params.viewH         - hCSS
 * @param {function} params.rng           - seeded random()
 * @param {{ complete: boolean, naturalWidth: number }} params.spriteImg
 */
export function updateBadguysState(flight, render, {
  now, dt, overlay, visible, motionPaused, bossPhase,
  recoilX, recoilY, viewW, viewH, rng, spriteImg,
}) {
  if (!(visible && spriteImg.complete && spriteImg.naturalWidth > 0)) {
    render.ready = false;
    return;
  }

  const badguysScale = overlay.scale * BADGUYS_SPRITE_SHEET.scaleMultiplier;
  const badguysW = BADGUYS_SPRITE_SHEET.frameW * badguysScale;
  const badguysH = BADGUYS_SPRITE_SHEET.frameH * badguysScale;

  if (motionPaused) {
    const bounds = getBadguysBounds(badguysW, badguysH, viewW, viewH, overlay);
    flight.x = clamp((viewW - badguysW) / 2, bounds.minX, bounds.maxX);
    flight.y = clamp(bounds.minY + SCENE.BADGUYS_PAUSE_Y_OFFSET, bounds.minY, bounds.maxY);
    flight.vx = 0;
    flight.vy = 0;
  } else {
    updateBadguysFlight(flight, now, dt, badguysW, badguysH, viewW, viewH, overlay, bossPhase, rng);
  }

  render.x = flight.x + recoilX;
  render.y = flight.y + recoilY;
  render.w = badguysW;
  render.h = badguysH;
  render.ready = true;
}
