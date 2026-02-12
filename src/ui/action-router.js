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
  const readActionBar =
    typeof getActionBar === 'function'
      ? getActionBar
      : () => actionBar;

  function handleShield() {
    const now = performance.now();
    if (typeof activateShield !== 'function' || !activateShield(S, now)) return false;
    if (telemetry && typeof telemetry.onAbilityUsed === 'function') {
      telemetry.onAbilityUsed('shield');
    }
    setButtonCooldown(readActionBar, 'shield', SHIELD.COOLDOWN_MS / 1000);
    return true;
  }

  function handleProjectile() {
    if (typeof fireProjectile !== 'function' || typeof getGuardianPose !== 'function') return false;
    const pose = getGuardianPose();
    if (!isFiniteNumber(pose?.cx) || !isFiniteNumber(pose?.anchorY)) return false;
    const fired = fireProjectile(S, pose.cx, pose.anchorY - PROJECTILE_Y_OFFSET_PX);
    if (!fired) return false;
    if (telemetry && typeof telemetry.onAbilityUsed === 'function') {
      telemetry.onAbilityUsed('projectile');
    }
    return true;
  }

  function handleSlam() {
    if (typeof getGuardianPose !== 'function' || typeof usePower !== 'function') return false;
    const pose = getGuardianPose();
    if (!isFiniteNumber(pose?.cx) || !isFiniteNumber(pose?.anchorY)) return false;
    if (!usePower(SLAM_POWER_COST)) return false;

    const now = performance.now();
    if (!S.slam || typeof S.slam !== 'object') S.slam = {};
    S.slam.shockwave = {
      x: pose.cx,
      y: pose.anchorY,
      startedAt: now,
      startTime: now,
      radius: 10,
      maxRadius: SLAM_SHOCKWAVE_MAX_RADIUS_PX,
      duration: SLAM_SHOCKWAVE_DURATION_MS,
      flash: 1,
    };

    if (telemetry && typeof telemetry.onAbilityUsed === 'function') {
      telemetry.onAbilityUsed('slam');
    }
    setButtonCooldown(readActionBar, 'slam', SLAM_COOLDOWN_SECONDS);
    return true;
  }

  function handleActivation(buttonId) {
    if (!getFlag('buttonMappedPowers')) return false;
    if (!S || typeof S !== 'object') return false;
    if (!canUseButtons(S)) return false;

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

  return {
    handleActivation,
  };
}
