import { describe, expect, it } from 'vitest';
import { PHASE_THRESHOLDS, SHIP_MAX_HP } from '../../../src/constants.js';
import {
  damageShip,
  getPhaseEffects,
  getPhaseForHP,
  getPhaseSpawnMultiplier,
  getPhaseSpeedMultiplier,
  getPhaseTrapChanceBoost,
  getShipHPRatio,
  resetShip,
  updateBossPhase,
} from '../../../src/systems/progression.js';

function createState(overrides = {}) {
  return {
    shipHP: SHIP_MAX_HP,
    bossPhase: 1,
    isVictory: false,
    shipDamageFlash: 0,
    ...overrides,
  };
}

describe('progression system (S7R-077)', () => {
  it('resetShip restores default ship state', () => {
    const state = createState({
      shipHP: 12,
      bossPhase: 4,
      isVictory: true,
      shipDamageFlash: 0.35,
    });

    resetShip(state);

    expect(state.shipHP).toBe(SHIP_MAX_HP);
    expect(state.bossPhase).toBe(1);
    expect(state.isVictory).toBe(false);
    expect(state.shipDamageFlash).toBe(0);
  });

  it('damageShip applies damage and does not drop below zero', () => {
    const state = createState();

    expect(damageShip(state, 25)).toBe(SHIP_MAX_HP - 25);
    expect(state.shipHP).toBe(SHIP_MAX_HP - 25);
    expect(state.shipDamageFlash).toBe(1);

    expect(damageShip(state, SHIP_MAX_HP * 10)).toBe(0);
    expect(state.shipHP).toBe(0);
    expect(state.shipDamageFlash).toBe(1);
  });

  it('damageShip ignores further damage when defeated or already victorious', () => {
    const defeatedState = createState({
      shipHP: 0,
      shipDamageFlash: 0.25,
    });
    const victoryState = createState({
      shipHP: 45,
      isVictory: true,
      shipDamageFlash: 0.4,
    });

    expect(damageShip(defeatedState, 5)).toBe(0);
    expect(defeatedState.shipDamageFlash).toBe(0.25);

    expect(damageShip(victoryState, 5)).toBe(45);
    expect(victoryState.shipDamageFlash).toBe(0.4);
  });

  it('getPhaseForHP resolves every threshold boundary', () => {
    for (let i = 0; i < PHASE_THRESHOLDS.length; i += 1) {
      const { hp, phase } = PHASE_THRESHOLDS[i];
      const expectedAbove = i === 0 ? 1 : PHASE_THRESHOLDS[i - 1].phase;

      expect(getPhaseForHP(hp)).toBe(phase);
      expect(getPhaseForHP(hp + 1)).toBe(expectedAbove);
      expect(getPhaseForHP(hp - 1)).toBe(phase);
    }
  });

  it('getPhaseForHP returns 0 for zero or negative HP', () => {
    expect(getPhaseForHP(0)).toBe(0);
    expect(getPhaseForHP(-10)).toBe(0);
  });

  it('updateBossPhase handles normal phase transitions', () => {
    const state = createState({
      shipHP: 69,
      bossPhase: 1,
    });

    const result = updateBossPhase(state);

    expect(result).toEqual({
      phaseChanged: true,
      oldPhase: 1,
      newPhase: 2,
      defeated: false,
    });
    expect(state.bossPhase).toBe(2);
    expect(state.isVictory).toBe(false);
  });

  it('updateBossPhase is idempotent after first defeat and victory trigger', () => {
    const state = createState({
      shipHP: 0,
      bossPhase: 3,
      isVictory: false,
    });

    const first = updateBossPhase(state);
    const second = updateBossPhase(state);

    expect(first).toEqual({
      phaseChanged: true,
      oldPhase: 3,
      newPhase: 0,
      defeated: true,
    });
    expect(second).toEqual({
      phaseChanged: false,
      oldPhase: 0,
      newPhase: 0,
      defeated: false,
    });
    expect(state.bossPhase).toBe(0);
    expect(state.isVictory).toBe(true);
  });

  it('getShipHPRatio clamps negative values and reflects normal/overflow HP', () => {
    const normalState = createState({ shipHP: 50 });
    const negativeState = createState({ shipHP: -25 });
    const overflowState = createState({ shipHP: SHIP_MAX_HP + 25 });

    expect(getShipHPRatio(normalState)).toBeCloseTo(0.5, 5);
    expect(getShipHPRatio(negativeState)).toBe(0);
    expect(getShipHPRatio(overflowState)).toBeCloseTo(1.25, 5);
  });

  it('phase multipliers return expected values for each phase', () => {
    const expectedByPhase = {
      1: { speed: 1.0, spawn: 1.0, trapBoost: 0 },
      2: { speed: 1.3, spawn: 0.8, trapBoost: 0.05 },
      3: { speed: 1.6, spawn: 0.65, trapBoost: 0.1 },
      4: { speed: 2.0, spawn: 0.45, trapBoost: 0.18 },
    };

    for (const [phaseKey, expected] of Object.entries(expectedByPhase)) {
      const phase = Number(phaseKey);
      expect(getPhaseSpeedMultiplier(phase)).toBeCloseTo(expected.speed, 5);
      expect(getPhaseSpawnMultiplier(phase)).toBeCloseTo(expected.spawn, 5);
      expect(getPhaseTrapChanceBoost(phase)).toBeCloseTo(expected.trapBoost, 5);
    }
  });

  it('phase multiplier fallbacks use safe defaults for unknown phases', () => {
    expect(getPhaseSpeedMultiplier(0)).toBe(1.0);
    expect(getPhaseSpeedMultiplier(99)).toBe(1.0);
    expect(getPhaseSpawnMultiplier(0)).toBe(1.0);
    expect(getPhaseSpawnMultiplier(99)).toBe(1.0);
    expect(getPhaseTrapChanceBoost(0)).toBe(0);
    expect(getPhaseTrapChanceBoost(99)).toBe(0);
  });

  it('getPhaseEffects enables the correct systems per phase', () => {
    expect(getPhaseEffects(1)).toEqual({
      dangerBeam: true,
      beamHarvest: false,
      laserStorm: false,
      dangerMode: false,
      wideDangerBeam: false,
    });
    expect(getPhaseEffects(2)).toEqual({
      dangerBeam: true,
      beamHarvest: true,
      laserStorm: false,
      dangerMode: false,
      wideDangerBeam: false,
    });
    expect(getPhaseEffects(3)).toEqual({
      dangerBeam: true,
      beamHarvest: true,
      laserStorm: true,
      dangerMode: true,
      wideDangerBeam: false,
    });
    expect(getPhaseEffects(4)).toEqual({
      dangerBeam: true,
      beamHarvest: true,
      laserStorm: true,
      dangerMode: true,
      wideDangerBeam: true,
    });
  });
});
