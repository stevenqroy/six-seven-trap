// Boss phase progression system.
// Manages ship HP, phase transitions, and the effects/behaviors each phase enables.

import { SHIP_MAX_HP, PHASE_THRESHOLDS } from '../constants.js';

/**
 * Reset ship HP and phase for a new game.
 */
export function resetShip(state) {
  state.shipHP = SHIP_MAX_HP;
  state.bossPhase = 1;
  state.isVictory = false;
  state.shipDamageFlash = 0;
}

/**
 * Deal damage to the ship. Returns the new HP.
 */
export function damageShip(state, amount) {
  if (state.shipHP <= 0 || state.isVictory) return state.shipHP;
  state.shipHP = Math.max(0, state.shipHP - amount);
  state.shipDamageFlash = 1;
  return state.shipHP;
}

/**
 * Determine the current boss phase based on HP.
 * Returns the phase number (1-4) or 0 if defeated.
 */
export function getPhaseForHP(hp) {
  if (hp <= 0) return 0;
  // Thresholds are sorted descending by HP. Find the last one where hp <= threshold.
  let phase = 1;
  for (let i = PHASE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (hp <= PHASE_THRESHOLDS[i].hp) {
      phase = PHASE_THRESHOLDS[i].phase;
      break;
    }
  }
  return phase;
}

/**
 * Update the boss phase based on current HP.
 * Returns an object describing what changed, so the caller can
 * activate/deactivate effects accordingly.
 *
 * @returns {{ phaseChanged: boolean, oldPhase: number, newPhase: number, defeated: boolean }}
 */
export function updateBossPhase(state) {
  const oldPhase = state.bossPhase;

  if (state.shipHP <= 0) {
    state.bossPhase = 0;
    const defeated = oldPhase !== 0;
    if (defeated) state.isVictory = true;
    return { phaseChanged: defeated, oldPhase, newPhase: 0, defeated };
  }

  const newPhase = getPhaseForHP(state.shipHP);
  state.bossPhase = newPhase;
  return {
    phaseChanged: newPhase !== oldPhase,
    oldPhase,
    newPhase,
    defeated: false,
  };
}

/**
 * Get ship HP as a ratio (0-1) for the HP bar display.
 */
export function getShipHPRatio(state) {
  return Math.max(0, state.shipHP / SHIP_MAX_HP);
}

/**
 * Get phase-specific flight speed multiplier.
 * Ship gets faster and more erratic in later phases.
 */
export function getPhaseSpeedMultiplier(phase) {
  switch (phase) {
    case 1: return 1.0;
    case 2: return 1.3;
    case 3: return 1.6;
    case 4: return 2.0;
    default: return 1.0;
  }
}

/**
 * Get phase-specific spawn interval multiplier.
 * Traps spawn faster in later phases.
 */
export function getPhaseSpawnMultiplier(phase) {
  switch (phase) {
    case 1: return 1.0;
    case 2: return 0.8;
    case 3: return 0.65;
    case 4: return 0.45;
    default: return 1.0;
  }
}

/**
 * Get phase-specific trap chance boost.
 * More traps in later phases.
 */
export function getPhaseTrapChanceBoost(phase) {
  switch (phase) {
    case 1: return 0;
    case 2: return 0.05;
    case 3: return 0.1;
    case 4: return 0.18;
    default: return 0;
  }
}

/**
 * Determine which effects should be active for a given phase.
 */
export function getPhaseEffects(phase) {
  return {
    dangerBeam: phase >= 1,         // Tractor beam always on (it's the core mechanic)
    beamHarvest: phase >= 2,        // Portal starts trying to capture 6/7s
    laserStorm: phase >= 3,         // Laser beams from ship
    dangerMode: phase >= 3,         // Red strobe, scowl overlay
    wideDangerBeam: phase >= 4,     // Beam gets wider in phase 4
  };
}
