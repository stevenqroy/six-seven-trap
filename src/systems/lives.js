// Lives system — replaces instant death with a lives counter.
// When TEMP_NO_LOSE is true, this system is bypassed (traps are just destroyed).

import {
  STARTING_LIVES,
  MAX_LIVES,
  INVINCIBILITY_DURATION,
  EXTRA_LIFE_INTERVAL,
} from '../constants.js';

/**
 * Reset lives state for a new game.
 */
export function resetLives(state) {
  state.lives = STARTING_LIVES;
  state.invincibleUntil = 0;
  state.lastExtraLifeScore = 0;
}

/**
 * Check if player is currently invincible (post-hit grace period).
 */
export function isInvincible(state, now) {
  return now < state.invincibleUntil;
}

/**
 * Lose a life. Returns true if the player is still alive, false if game over.
 */
export function loseLife(state, now) {
  state.lives = Math.max(0, state.lives - 1);
  if (state.lives > 0) {
    state.invincibleUntil = now + INVINCIBILITY_DURATION;
    return true; // still alive
  }
  return false; // game over
}

/**
 * Check and award an extra life based on score milestones.
 * Call this after the score increments.
 */
export function checkExtraLife(state, score) {
  if (score > 0 && score % EXTRA_LIFE_INTERVAL === 0 && score > state.lastExtraLifeScore) {
    if (state.lives < MAX_LIVES) {
      state.lives++;
      state.lastExtraLifeScore = score;
      return true; // extra life awarded
    }
  }
  return false;
}

/**
 * Get the invincibility flash alpha for visual feedback.
 * Returns 1.0 when not invincible, oscillates 0.3-1.0 when invincible.
 */
export function getInvincibilityAlpha(state, now) {
  if (now >= state.invincibleUntil) return 1.0;
  const remaining = state.invincibleUntil - now;
  const t = remaining / INVINCIBILITY_DURATION;
  // Fast flashing that slows down as invincibility wears off
  const freq = 8 + t * 12; // 20Hz → 8Hz
  return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now * freq * 0.001 * Math.PI * 2));
}
