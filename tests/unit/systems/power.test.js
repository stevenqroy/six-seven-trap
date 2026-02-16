import { describe, expect, it } from 'vitest';
import { POWER } from '../../../src/constants.js';
import {
  canAfford,
  chargePower,
  drainPower,
  getPowerRatio,
  resetPower,
  spendPower,
} from '../../../src/systems/power.js';

function createState({
  power = 0,
  powerFlash = 0,
} = {}) {
  return {
    power,
    powerFlash,
  };
}

describe('power system (S7R-078)', () => {
  it('resetPower sets power state back to zero', () => {
    const state = createState({
      power: 42,
      powerFlash: 1,
    });

    resetPower(state);

    expect(state.power).toBe(0);
    expect(state.powerFlash).toBe(0);
  });

  it('chargePower increases power and enables flash', () => {
    const state = createState({ power: 10 });

    const charged = chargePower(state, POWER.PER_BOUNCE);

    expect(charged).toBe(10 + POWER.PER_BOUNCE);
    expect(state.power).toBe(10 + POWER.PER_BOUNCE);
    expect(state.powerFlash).toBe(1);
  });

  it('chargePower caps at POWER.MAX when overfilled', () => {
    const state = createState({ power: POWER.MAX - 2 });

    const charged = chargePower(state, 9);

    expect(charged).toBe(POWER.MAX);
    expect(state.power).toBe(POWER.MAX);
  });

  it('chargePower ignores non-finite or non-positive amounts', () => {
    const state = createState({
      power: 33,
      powerFlash: 0,
    });

    expect(chargePower(state, Number.NaN)).toBe(33);
    expect(chargePower(state, 0)).toBe(33);
    expect(chargePower(state, -1)).toBe(33);
    expect(state.powerFlash).toBe(0);
  });

  it('spendPower spends when affordable and blocks insufficient spends', () => {
    const state = createState({ power: 50 });

    expect(spendPower(state, 20)).toBe(true);
    expect(state.power).toBe(30);
    expect(spendPower(state, 99)).toBe(false);
    expect(state.power).toBe(30);
  });

  it('spendPower handles zero and negative costs safely', () => {
    const state = createState({ power: 8 });

    expect(spendPower(state, 0)).toBe(true);
    expect(state.power).toBe(8);
    expect(spendPower(state, -5)).toBe(false);
    expect(state.power).toBe(8);
  });

  it('canAfford supports normal and exact-cost checks', () => {
    const state = createState({ power: POWER.SLAM_COST });

    expect(canAfford(state, 10)).toBe(true);
    expect(canAfford(state, POWER.SLAM_COST)).toBe(true);
    expect(canAfford(state, POWER.SLAM_COST + 1)).toBe(false);
  });

  it('canAfford returns false for invalid costs', () => {
    const state = createState({ power: 80 });

    expect(canAfford(state, Number.NaN)).toBe(false);
    expect(canAfford(state, undefined)).toBe(false);
    expect(canAfford(state, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('drainPower drains over time and keeps non-empty meter active', () => {
    const state = createState({ power: 30 });

    const hasPower = drainPower(state, 10, 2);

    expect(state.power).toBe(10);
    expect(hasPower).toBe(true);
  });

  it('drainPower handles large and invalid dt values safely', () => {
    const state = createState({ power: 12 });

    expect(drainPower(state, 20, 2)).toBe(false);
    expect(state.power).toBe(0);

    state.power = 9;
    expect(drainPower(state, 5, 0)).toBe(true);
    expect(drainPower(state, 5, Number.NaN)).toBe(true);
    expect(state.power).toBe(9);
  });

  it('getPowerRatio returns normalized clamped values', () => {
    const state = createState({ power: 0 });

    expect(getPowerRatio(state)).toBe(0);

    state.power = POWER.MAX / 2;
    expect(getPowerRatio(state)).toBeCloseTo(0.5, 6);

    state.power = POWER.MAX;
    expect(getPowerRatio(state)).toBe(1);

    state.power = POWER.MAX * 2;
    expect(getPowerRatio(state)).toBe(1);

    state.power = -20;
    expect(getPowerRatio(state)).toBe(0);
  });
});
