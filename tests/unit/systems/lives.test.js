import { describe, expect, it } from 'vitest';
import {
  EXTRA_LIFE_INTERVAL,
  INVINCIBILITY_DURATION,
  MAX_LIVES,
  STARTING_LIVES,
} from '../../../src/constants.js';
import {
  checkExtraLife,
  getInvincibilityAlpha,
  isInvincible,
  loseLife,
  resetLives,
} from '../../../src/systems/lives.js';

function createState({
  lives = STARTING_LIVES,
  invincibleUntil = 0,
  lastExtraLifeScore = 0,
} = {}) {
  return {
    lives,
    invincibleUntil,
    lastExtraLifeScore,
  };
}

describe('lives system (S7R-086)', () => {
  it('resetLives restores initial lives state', () => {
    const state = createState({
      lives: 1,
      invincibleUntil: 7777,
      lastExtraLifeScore: 150,
    });

    resetLives(state);

    expect(state.lives).toBe(STARTING_LIVES);
    expect(state.invincibleUntil).toBe(0);
    expect(state.lastExtraLifeScore).toBe(0);
  });

  it('loseLife decrements lives, sets invincibility window, and reports alive status', () => {
    const state = createState({ lives: 3 });
    const now = 5000;

    const stillAlive = loseLife(state, now);

    expect(stillAlive).toBe(true);
    expect(state.lives).toBe(2);
    expect(state.invincibleUntil).toBe(now + INVINCIBILITY_DURATION);
  });

  it('loseLife handles boundary cases without underflow', () => {
    const oneLifeState = createState({ lives: 1, invincibleUntil: 0 });
    const noLivesState = createState({ lives: 0, invincibleUntil: 1234 });

    expect(loseLife(oneLifeState, 1000)).toBe(false);
    expect(oneLifeState.lives).toBe(0);
    expect(oneLifeState.invincibleUntil).toBe(0);

    expect(loseLife(noLivesState, 2000)).toBe(false);
    expect(noLivesState.lives).toBe(0);
    expect(noLivesState.invincibleUntil).toBe(1234);
  });

  it('checkExtraLife awards only at milestone thresholds and prevents duplicate awards', () => {
    const state = createState({
      lives: 2,
      lastExtraLifeScore: 0,
    });

    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL - 1)).toBe(false);
    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL)).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.lastExtraLifeScore).toBe(EXTRA_LIFE_INTERVAL);

    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL)).toBe(false);
    expect(state.lives).toBe(3);

    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL + 1)).toBe(false);
    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL * 2)).toBe(true);
    expect(state.lives).toBe(4);
    expect(state.lastExtraLifeScore).toBe(EXTRA_LIFE_INTERVAL * 2);
  });

  it('checkExtraLife respects MAX_LIVES cap', () => {
    const state = createState({
      lives: MAX_LIVES,
      lastExtraLifeScore: 0,
    });

    expect(checkExtraLife(state, EXTRA_LIFE_INTERVAL)).toBe(false);
    expect(state.lives).toBe(MAX_LIVES);
  });

  it('isInvincible uses exclusive end boundary for invincibility window', () => {
    const state = createState({
      invincibleUntil: 3000,
    });

    expect(isInvincible(state, 2999)).toBe(true);
    expect(isInvincible(state, 3000)).toBe(false);
  });

  it('getInvincibilityAlpha stays within [0.3, 1] while invincible and returns 1 otherwise', () => {
    const state = createState({
      invincibleUntil: INVINCIBILITY_DURATION,
    });

    for (let now = 0; now < INVINCIBILITY_DURATION; now += 137) {
      const alpha = getInvincibilityAlpha(state, now);
      expect(alpha).toBeGreaterThanOrEqual(0.3 - 1e-6);
      expect(alpha).toBeLessThanOrEqual(1 + 1e-6);
    }

    expect(getInvincibilityAlpha(state, INVINCIBILITY_DURATION)).toBe(1);
    expect(getInvincibilityAlpha(state, INVINCIBILITY_DURATION + 1)).toBe(1);
  });
});
