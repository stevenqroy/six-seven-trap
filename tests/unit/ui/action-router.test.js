import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SHIELD } from '../../../src/constants.js';
import { initFlags, resetFlags, setFlag } from '../../../src/config/flags.js';
import { createActionRouter } from '../../../src/ui/action-router.js';

function createRouterContext(overrides = {}) {
  const S = overrides.S || {
    isTitleScreen: false,
    isPaused: false,
    isGameOver: false,
    slam: { shockwave: null },
  };
  const actionBar = overrides.actionBar || {
    updateButton: vi.fn(),
  };
  const activateShield = overrides.activateShield || vi.fn(() => true);
  const fireProjectile = overrides.fireProjectile || vi.fn(() => true);
  const getGuardianPose = overrides.getGuardianPose || vi.fn(() => ({ cx: 220, anchorY: 300 }));
  const usePower = overrides.usePower || vi.fn(() => true);
  const telemetry = overrides.telemetry || { onAbilityUsed: vi.fn() };

  const router = createActionRouter({
    S,
    actionBar,
    activateShield,
    fireProjectile,
    getGuardianPose,
    telemetry,
    usePower,
  });

  return {
    router,
    S,
    actionBar,
    activateShield,
    fireProjectile,
    getGuardianPose,
    usePower,
    telemetry,
  };
}

describe('Action Router (S7R-048)', () => {
  beforeEach(() => {
    if (typeof window.dispatchEvent !== 'function') {
      window.dispatchEvent = () => true;
    }
    resetFlags();
    initFlags();
  });

  afterEach(() => {
    resetFlags();
  });

  it('calls activateShield when shield button is activated', () => {
    setFlag('buttonMappedPowers', true);
    const { router, S, activateShield, telemetry } = createRouterContext();

    const handled = router.handleActivation('shield');

    expect(handled).toBe(true);
    expect(activateShield).toHaveBeenCalledOnce();
    expect(activateShield).toHaveBeenCalledWith(S, expect.any(Number));
    expect(telemetry.onAbilityUsed).toHaveBeenCalledWith('shield');
  });

  it('calls fireProjectile with guardian pose when fire button is activated', () => {
    setFlag('buttonMappedPowers', true);
    const { router, S, fireProjectile, getGuardianPose, telemetry } = createRouterContext();

    const handled = router.handleActivation('projectile');

    expect(handled).toBe(true);
    expect(getGuardianPose).toHaveBeenCalledOnce();
    expect(fireProjectile).toHaveBeenCalledWith(S, 220, 250);
    expect(telemetry.onAbilityUsed).toHaveBeenCalledWith('projectile');
  });

  it('checks usePower(50) before slam and blocks when power is insufficient', () => {
    setFlag('buttonMappedPowers', true);
    const usePower = vi.fn(() => false);
    const { router, S, actionBar } = createRouterContext({ usePower });

    const handled = router.handleActivation('slam');

    expect(handled).toBe(false);
    expect(usePower).toHaveBeenCalledWith(50);
    expect(S.slam.shockwave).toBe(null);
    expect(actionBar.updateButton).not.toHaveBeenCalled();
  });

  it('sets cooldown on button after successful activation', () => {
    setFlag('buttonMappedPowers', true);
    const { router, actionBar } = createRouterContext();

    const handled = router.handleActivation('shield');

    expect(handled).toBe(true);
    expect(actionBar.updateButton).toHaveBeenCalledWith('shield', {
      cooldownRemaining: SHIELD.COOLDOWN_MS / 1000,
      cooldownTotal: SHIELD.COOLDOWN_MS / 1000,
    });
  });

  it('blocks activation during pause, game over, or title screen', () => {
    setFlag('buttonMappedPowers', true);
    const statesToBlock = ['isPaused', 'isGameOver', 'isTitleScreen'];

    for (let i = 0; i < statesToBlock.length; i++) {
      const stateKey = statesToBlock[i];
      const S = {
        isTitleScreen: false,
        isPaused: false,
        isGameOver: false,
        slam: { shockwave: null },
      };
      S[stateKey] = true;
      const { router, activateShield } = createRouterContext({ S });
      expect(router.handleActivation('shield')).toBe(false);
      expect(activateShield).not.toHaveBeenCalled();
    }
  });

  it('gates all abilities behind buttonMappedPowers flag', () => {
    setFlag('buttonMappedPowers', false);
    const { router, activateShield, fireProjectile, usePower } = createRouterContext();

    expect(router.handleActivation('shield')).toBe(false);
    expect(router.handleActivation('projectile')).toBe(false);
    expect(router.handleActivation('slam')).toBe(false);

    expect(activateShield).not.toHaveBeenCalled();
    expect(fireProjectile).not.toHaveBeenCalled();
    expect(usePower).not.toHaveBeenCalled();
  });
});
