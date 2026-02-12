import { POWER } from '../constants.js';

/**
 * Reset power meter for a new run.
 */
export function resetPower(state) {
  state.power = 0;
  state.powerFlash = 0;
}

/**
 * Add power charge, clamped to max.
 */
export function chargePower(state, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return state.power;
  state.power = Math.min(POWER.MAX, state.power + amount);
  state.powerFlash = 1;
  return state.power;
}

/**
 * Spend power if available.
 */
export function spendPower(state, cost) {
  if (!canAfford(state, cost)) return false;
  state.power = Math.max(0, state.power - cost);
  return true;
}

/**
 * Check if there is enough power to pay cost.
 */
export function canAfford(state, cost) {
  return Number.isFinite(cost) && cost >= 0 && state.power >= cost;
}

/**
 * Drain power continuously while held abilities are active.
 * Returns false once meter is empty.
 */
export function drainPower(state, amountPerSec, dt) {
  if (!Number.isFinite(amountPerSec) || amountPerSec <= 0 || !Number.isFinite(dt) || dt <= 0) {
    return state.power > 0;
  }
  state.power = Math.max(0, state.power - amountPerSec * dt);
  return state.power > 0;
}

/**
 * Get normalized meter value (0-1).
 */
export function getPowerRatio(state) {
  return Math.max(0, Math.min(1, state.power / POWER.MAX));
}
