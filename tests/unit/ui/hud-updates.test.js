import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LIVES, POLISH } from '../../../src/constants.js';

const progressionMock = vi.hoisted(() => ({
  getShipHPRatio: vi.fn(() => 1),
}));

const powerMock = vi.hoisted(() => ({
  getPowerRatio: vi.fn(() => 0),
}));

vi.mock('../../../src/systems/progression.js', () => ({
  getShipHPRatio: progressionMock.getShipHPRatio,
}));

vi.mock('../../../src/systems/power.js', () => ({
  getPowerRatio: powerMock.getPowerRatio,
}));

import { createHudUpdater } from '../../../src/ui/hud-updates.js';

function createHudElements() {
  const root = document.createElement('div');
  const livesEl = document.createElement('div');
  const shipHpFill = document.createElement('div');
  const shipHpText = document.createElement('div');
  const powerFill = document.createElement('div');
  const powerText = document.createElement('div');
  const powerBar = document.createElement('div');
  const highScoreEl = document.createElement('div');
  const titleBest = document.createElement('div');
  const hudEl = document.createElement('div');
  const shipHpBar = document.createElement('div');

  root.append(
    livesEl,
    shipHpFill,
    shipHpText,
    powerFill,
    powerText,
    powerBar,
    highScoreEl,
    titleBest,
    hudEl,
    shipHpBar
  );
  document.body.appendChild(root);

  return {
    root,
    livesEl,
    shipHpFill,
    shipHpText,
    powerFill,
    powerText,
    powerBar,
    highScoreEl,
    titleBest,
    hudEl,
    shipHpBar,
  };
}

describe('hud updates (S7R-085)', () => {
  const fixtures = [];

  beforeEach(() => {
    progressionMock.getShipHPRatio.mockReset();
    progressionMock.getShipHPRatio.mockReturnValue(1);
    powerMock.getPowerRatio.mockReset();
    powerMock.getPowerRatio.mockReturnValue(0);
  });

  afterEach(() => {
    while (fixtures.length > 0) {
      fixtures.pop().remove();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createFixtureUpdater() {
    const elements = createHudElements();
    fixtures.push(elements.root);
    const updater = createHudUpdater(elements);
    return { updater, elements };
  }

  it('creates updater methods and keeps separate instances isolated', () => {
    const first = createFixtureUpdater();
    const second = createFixtureUpdater();

    expect(first.updater.updateLivesDisplay).toBeTypeOf('function');
    expect(first.updater.triggerLifeGainPulse).toBeTypeOf('function');
    expect(first.updater.updateShipHpBar).toBeTypeOf('function');
    expect(first.updater.updatePowerBar).toBeTypeOf('function');
    expect(first.updater.syncBestDisplays).toBeTypeOf('function');
    expect(first.updater.setGameplayUiVisible).toBeTypeOf('function');
    expect(first.updater.destroy).toBeTypeOf('function');

    first.updater.updateLivesDisplay({ lives: 1 });
    second.updater.updateLivesDisplay({ lives: MAX_LIVES });

    expect(first.elements.livesEl.textContent).toBe('❤️'.repeat(1) + '🖤'.repeat(MAX_LIVES - 1));
    expect(second.elements.livesEl.textContent).toBe('❤️'.repeat(MAX_LIVES));
  });

  it('updates lives display for multiple life counts', () => {
    const { updater, elements } = createFixtureUpdater();

    updater.updateLivesDisplay({ lives: 0 });
    expect(elements.livesEl.textContent).toBe('🖤'.repeat(MAX_LIVES));

    updater.updateLivesDisplay({ lives: 3 });
    expect(elements.livesEl.textContent).toBe('❤️'.repeat(3) + '🖤'.repeat(MAX_LIVES - 3));

    updater.updateLivesDisplay({ lives: MAX_LIVES });
    expect(elements.livesEl.textContent).toBe('❤️'.repeat(MAX_LIVES));
  });

  it('triggers the life gain pulse class toggle with timer mocks enabled', () => {
    vi.useFakeTimers();
    const { updater, elements } = createFixtureUpdater();
    elements.livesEl.classList.add('gain');

    updater.triggerLifeGainPulse();
    expect(elements.livesEl.classList.contains('gain')).toBe(true);

    vi.runOnlyPendingTimers();
    expect(elements.livesEl.classList.contains('gain')).toBe(true);
  });

  it('updates ship hp width, color, and label across boundary values', () => {
    const { updater, elements } = createFixtureUpdater();

    progressionMock.getShipHPRatio
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0);

    updater.updateShipHpBar({ shipHP: 100 });
    expect(elements.shipHpFill.style.width).toBe('80%');
    expect(elements.shipHpFill.style.background).toContain('#44ff88');
    expect(elements.shipHpText.textContent).toBe('ALIEN SHIP 80%');

    updater.updateShipHpBar({ shipHP: 100 });
    expect(elements.shipHpFill.style.width).toBe('60%');
    expect(elements.shipHpFill.style.background).toContain('#ffaa22');
    expect(elements.shipHpText.textContent).toBe('ALIEN SHIP 60%');

    updater.updateShipHpBar({ shipHP: 100 });
    expect(elements.shipHpFill.style.width).toBe('30%');
    expect(elements.shipHpFill.style.background).toContain('#ff2222');
    expect(elements.shipHpText.textContent).toBe('ALIEN SHIP 30%');

    updater.updateShipHpBar({ shipHP: 0 });
    expect(elements.shipHpFill.style.width).toBe('0%');
    expect(elements.shipHpText.textContent).toBe('DEFEATED');
  });

  it('updates power bar height/text and near-full visual state', () => {
    const { updater, elements } = createFixtureUpdater();

    powerMock.getPowerRatio
      .mockReturnValueOnce(0.42)
      .mockReturnValueOnce(POLISH.NEAR_FULL_POWER_RATIO)
      .mockReturnValueOnce(1);

    updater.updatePowerBar({ power: 42 });
    expect(elements.powerFill.style.height).toBe('42%');
    expect(elements.powerText.textContent).toBe('POWER 42%');
    expect(elements.powerBar.classList.contains('near-full')).toBe(false);

    updater.updatePowerBar({ power: 99 });
    expect(elements.powerBar.classList.contains('near-full')).toBe(true);

    updater.updatePowerBar({ power: 100 });
    expect(elements.powerFill.style.height).toBe('100%');
    expect(elements.powerBar.classList.contains('near-full')).toBe(false);
  });

  it('syncs best displays and toggles gameplay ui visibility', () => {
    const { updater, elements } = createFixtureUpdater();

    updater.syncBestDisplays({ highScore: 12345 });
    expect(elements.highScoreEl.textContent).toBe('Best: 12345');
    expect(elements.titleBest.textContent).toBe('Best: 12345');

    updater.setGameplayUiVisible(false);
    expect(elements.hudEl.style.display).toBe('none');
    expect(elements.shipHpBar.style.display).toBe('none');
    expect(elements.powerBar.style.display).toBe('none');

    updater.setGameplayUiVisible(true);
    expect(elements.hudEl.style.display).toBe('');
    expect(elements.shipHpBar.style.display).toBe('');
    expect(elements.powerBar.style.display).toBe('');
  });

  it('falls back to no-op methods when required elements are missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const partialElements = {
      livesEl: document.createElement('div'),
    };
    const updater = createHudUpdater(partialElements);

    expect(warnSpy).toHaveBeenCalledWith('[HudUpdater] Missing required DOM elements; HUD updates disabled.');
    expect(() => updater.updateLivesDisplay({ lives: 2 })).not.toThrow();
    expect(() => updater.triggerLifeGainPulse()).not.toThrow();
    expect(() => updater.updateShipHpBar({ shipHP: 50 })).not.toThrow();
    expect(() => updater.updatePowerBar({ power: 50 })).not.toThrow();
    expect(() => updater.syncBestDisplays({ highScore: 999 })).not.toThrow();
    expect(() => updater.setGameplayUiVisible(false)).not.toThrow();
    expect(() => updater.destroy()).not.toThrow();
  });

  it('destroy clears references so subsequent updates are safe no-ops', () => {
    const { updater, elements } = createFixtureUpdater();
    updater.updateLivesDisplay({ lives: 4 });
    expect(elements.livesEl.textContent).toBe('❤️'.repeat(4) + '🖤'.repeat(MAX_LIVES - 4));

    updater.destroy();

    expect(() => updater.updateLivesDisplay({ lives: 1 })).not.toThrow();
    expect(() => updater.triggerLifeGainPulse()).not.toThrow();
    expect(() => updater.updateShipHpBar({ shipHP: 10 })).not.toThrow();
    expect(() => updater.updatePowerBar({ power: 10 })).not.toThrow();
    expect(() => updater.syncBestDisplays({ highScore: 10 })).not.toThrow();
    expect(() => updater.setGameplayUiVisible(false)).not.toThrow();
  });
});
