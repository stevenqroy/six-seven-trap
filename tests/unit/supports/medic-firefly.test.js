import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_LIVES } from '../../../src/constants.js';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import * as medicFirefly from '../../../src/supports/medic-firefly.js';

function createState({
  lives = 3,
  healProgress = 0,
  touchX = 300,
  guardianAnchorY = 260,
  wCSS = 600,
  hCSS = 360,
} = {}) {
  return {
    lives,
    healProgress,
    touchX,
    guardianAnchorY,
    wCSS,
    hCSS,
  };
}

describe('medic firefly support (S7R-051)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
    setFlag('supportRuntime', true);
    setFlag('supportMedicFirefly', true);
    medicFirefly.destroy();
  });

  afterEach(() => {
    medicFirefly.destroy();
    resetFlags();
  });

  it('fires heal pulses on the configured interval', () => {
    const state = createState();
    medicFirefly.spawn({
      state,
      healIntervalMs: 3000,
      healAmount: 0.34,
      getGuardianPosition: () => ({ x: 300, y: 260 }),
    });

    medicFirefly.update(2.9, state);
    expect(state.healProgress).toBe(0);

    medicFirefly.update(0.11, state);
    expect(state.healProgress).toBeCloseTo(0.34, 3);
    expect(medicFirefly.serializeDebug().pulseCount).toBe(1);
  });

  it('respects the MAX_LIVES cap and does not over-heal', () => {
    const state = createState({
      lives: MAX_LIVES,
      healProgress: 0.8,
    });

    medicFirefly.spawn({
      state,
      healIntervalMs: 1000,
      healAmount: 0.34,
      getGuardianPosition: () => ({ x: 300, y: 260 }),
    });

    medicFirefly.update(1.1, state);

    expect(state.lives).toBe(MAX_LIVES);
    expect(state.healProgress).toBe(0);
  });

  it('accumulates fractional healing so 3 pulses grant 1 life', () => {
    const state = createState({
      lives: 3,
      healProgress: 0,
    });

    medicFirefly.spawn({
      state,
      healIntervalMs: 1000,
      healAmount: 0.34,
      getGuardianPosition: () => ({ x: 300, y: 260 }),
    });

    medicFirefly.update(1.05, state);
    medicFirefly.update(1.05, state);
    medicFirefly.update(1.05, state);
    const debug = medicFirefly.serializeDebug();

    expect(state.lives).toBe(4);
    expect(state.healProgress).toBeCloseTo(0.02, 2);
    expect(debug.pulseCount).toBe(3);
    expect(debug.totalHealedLives).toBe(1);
  });

  it('gates healing behind supportMedicFirefly flag', () => {
    setFlag('supportMedicFirefly', false);
    const state = createState({
      lives: 2,
      healProgress: 0,
    });

    medicFirefly.spawn({
      state,
      healIntervalMs: 1000,
      healAmount: 0.34,
    });
    medicFirefly.update(3.2, state);
    const debug = medicFirefly.serializeDebug();

    expect(debug.enabled).toBe(false);
    expect(debug.lifecycleState).toBe('disabled');
    expect(state.lives).toBe(2);
    expect(state.healProgress).toBe(0);
  });

  it('destroy clears runtime and transient support state', () => {
    const state = createState();
    medicFirefly.spawn({
      state,
      healIntervalMs: 900,
      healAmount: 0.34,
    });
    medicFirefly.update(1.1, state);
    expect(medicFirefly.serializeDebug().runtime).not.toBe(null);

    medicFirefly.destroy();
    const debug = medicFirefly.serializeDebug();

    expect(debug.runtime).toBe(null);
    expect(debug.runtimeUnitId).toBe(null);
    expect(debug.lifecycleState).toBe('despawned');
    expect(debug.pulseCount).toBe(0);
    expect(debug.healCooldownMs).toBe(0);
    expect(debug.x).toBe(0);
    expect(debug.y).toBe(0);
  });

  it('serializeDebug returns the expected payload shape', () => {
    const state = createState();
    medicFirefly.spawn({
      state,
      healIntervalMs: 1000,
      healAmount: 0.25,
    });
    medicFirefly.update(0.2, state);

    const debug = medicFirefly.serializeDebug();
    expect(debug).toMatchObject({
      id: 'medicFirefly',
      enabled: true,
    });
    expect(typeof debug.healCooldownMs).toBe('number');
    expect(typeof debug.healProgress).toBe('number');
    expect(typeof debug.lives).toBe('number');
    expect(debug.runtime).toBeTruthy();
    expect(debug.runtime).toHaveProperty('activeCount');
  });
});
