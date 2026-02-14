import { SHIELD } from '../constants.js';
import { getFlag } from '../config/flags.js';

const SLAM_POWER_COST = 50;
const PROJECTILE_Y_OFFSET_PX = 50;
const SLAM_SHOCKWAVE_MAX_RADIUS_PX = 200;
const SLAM_SHOCKWAVE_DURATION_MS = 600;
const SLAM_COOLDOWN_SECONDS = SLAM_SHOCKWAVE_DURATION_MS / 1000;

function canUseButtons(state) {
  return !state.isTitleScreen && !state.isPaused && !state.isGameOver;
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function setButtonCooldown(readActionBar, buttonId, cooldownSeconds) {
  if (!isFiniteNumber(cooldownSeconds) || cooldownSeconds <= 0) return;
  const actionBar = readActionBar();
  if (!actionBar || typeof actionBar.updateButton !== 'function') return;
  actionBar.updateButton(buttonId, {
    cooldownRemaining: cooldownSeconds,
    cooldownTotal: cooldownSeconds,
  });
}

/**
 * Create centralized action routing for action bar button activations.
 */
export function createActionRouter({
  S,
  actionBar = null,
  getActionBar = null,
  activateShield,
  fireProjectile,
  getGuardianPose,
  telemetry,
  usePower,
} = {}) {
  let stateRef = S;
  let actionBarRef = actionBar;
  let getActionBarRef = getActionBar;
  let activateShieldRef = activateShield;
  let fireProjectileRef = fireProjectile;
  let getGuardianPoseRef = getGuardianPose;
  let telemetryRef = telemetry;
  let usePowerRef = usePower;

  function readActionBar() {
    if (typeof getActionBarRef === 'function') return getActionBarRef();
    return actionBarRef;
  }

  function handleShield() {
    const now = performance.now();
    if (typeof activateShieldRef !== 'function' || !activateShieldRef(stateRef, now)) return false;
    if (telemetryRef && typeof telemetryRef.onAbilityUsed === 'function') {
      telemetryRef.onAbilityUsed('shield');
    }
    setButtonCooldown(readActionBar, 'shield', SHIELD.COOLDOWN_MS / 1000);
    return true;
  }

  function handleProjectile() {
    if (typeof fireProjectileRef !== 'function' || typeof getGuardianPoseRef !== 'function') return false;
    const pose = getGuardianPoseRef();
    if (!isFiniteNumber(pose?.cx) || !isFiniteNumber(pose?.anchorY)) return false;
    const fired = fireProjectileRef(stateRef, pose.cx, pose.anchorY - PROJECTILE_Y_OFFSET_PX);
    if (!fired) return false;
    if (telemetryRef && typeof telemetryRef.onAbilityUsed === 'function') {
      telemetryRef.onAbilityUsed('projectile');
    }
    setButtonCooldown(readActionBar, 'projectile', 1.2);
    return true;
  }

  function handleSlam() {
    if (typeof getGuardianPoseRef !== 'function' || typeof usePowerRef !== 'function') return false;
    const pose = getGuardianPoseRef();
    if (!isFiniteNumber(pose?.cx) || !isFiniteNumber(pose?.anchorY)) return false;
    if (!usePowerRef(SLAM_POWER_COST)) return false;

    const now = performance.now();
    if (!stateRef.slam || typeof stateRef.slam !== 'object') stateRef.slam = {};
    stateRef.slam.shockwave = {
      x: pose.cx,
      y: pose.anchorY,
      startedAt: now,
      startTime: now,
      radius: 10,
      maxRadius: SLAM_SHOCKWAVE_MAX_RADIUS_PX,
      duration: SLAM_SHOCKWAVE_DURATION_MS,
      flash: 1,
    };

    if (telemetryRef && typeof telemetryRef.onAbilityUsed === 'function') {
      telemetryRef.onAbilityUsed('slam');
    }
    setButtonCooldown(readActionBar, 'slam', SLAM_COOLDOWN_SECONDS);
    return true;
  }

  function handleActivation(buttonId) {
    if (!getFlag('buttonMappedPowers')) return false;
    if (!stateRef || typeof stateRef !== 'object') return false;
    if (!canUseButtons(stateRef)) return false;

    switch (buttonId) {
      case 'shield':
        return handleShield();
      case 'projectile':
        return handleProjectile();
      case 'slam':
        return handleSlam();
      default:
        return false;
    }
  }

  function destroy() {
    stateRef = null;
    actionBarRef = null;
    getActionBarRef = null;
    activateShieldRef = null;
    fireProjectileRef = null;
    getGuardianPoseRef = null;
    telemetryRef = null;
    usePowerRef = null;
  }

  return {
    handleActivation,
    destroy,
  };
}
