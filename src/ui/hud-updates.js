/**
 * HUD Update Utilities (extracted from main.js for S7R-046)
 *
 * Manages live HUD elements:
 * - Lives display with heart icons
 * - Ship HP bar with color gradients
 * - Power bar with near-full indicator
 */

import { getShipHPRatio } from '../systems/progression.js';
import { getPowerRatio } from '../systems/power.js';
import { MAX_LIVES, POLISH } from '../constants.js';

const NOOP = () => {};

/**
 * Create HUD updater with DOM element references
 * @param {Object} options
 * @param {HTMLElement} options.livesEl - Lives display element
 * @param {HTMLElement} options.shipHpFill - Ship HP fill bar
 * @param {HTMLElement} options.shipHpText - Ship HP text label
 * @param {HTMLElement} options.powerFill - Power fill bar
 * @param {HTMLElement} options.powerText - Power text label
 * @param {HTMLElement} [options.powerBar] - Power bar container (optional)
 * @param {HTMLElement} [options.highScoreEl] - High score display element
 * @param {HTMLElement} [options.titleBest] - Title screen best score element
 * @param {HTMLElement} [options.hudEl] - HUD container element
 * @param {HTMLElement} [options.shipHpBar] - Ship HP bar container
 * @returns {Object} HUD updater controller
 */
export function createHudUpdater({
  livesEl,
  shipHpFill,
  shipHpText,
  powerFill,
  powerText,
  powerBar = null,
  highScoreEl = null,
  titleBest = null,
  hudEl = null,
  shipHpBar = null,
} = {}) {
  if (typeof document === 'undefined') {
    return {
      updateLivesDisplay: NOOP,
      triggerLifeGainPulse: NOOP,
      updateShipHpBar: NOOP,
      updatePowerBar: NOOP,
      syncBestDisplays: NOOP,
      setGameplayUiVisible: NOOP,
    };
  }

  // Validate required elements
  const requiredElements = [livesEl, shipHpFill, shipHpText, powerFill, powerText];
  if (requiredElements.some((el) => !el)) {
    console.warn('[HudUpdater] Missing required DOM elements; HUD updates disabled.');
    return {
      updateLivesDisplay: NOOP,
      triggerLifeGainPulse: NOOP,
      updateShipHpBar: NOOP,
      updatePowerBar: NOOP,
      syncBestDisplays: NOOP,
      setGameplayUiVisible: NOOP,
    };
  }

  /**
   * Update lives display with heart icons
   * @param {Object} state - Game state with lives property
   */
  function updateLivesDisplay(state) {
    const full = state.lives;
    livesEl.textContent = '❤️'.repeat(full) + '🖤'.repeat(Math.max(0, MAX_LIVES - full));
  }

  /**
   * Trigger life gain pulse animation
   */
  function triggerLifeGainPulse() {
    livesEl.classList.remove('gain');
    void livesEl.offsetWidth; // Force reflow
    livesEl.classList.add('gain');
  }

  /**
   * Update ship HP bar with color gradient based on HP ratio
   * @param {Object} state - Game state with shipHP
   */
  function updateShipHpBar(state) {
    const ratio = getShipHPRatio(state);
    shipHpFill.style.width = `${ratio * 100}%`;

    // Color shifts: green → yellow → red as HP drops
    if (ratio > 0.6) {
      shipHpFill.style.background = 'linear-gradient(90deg, #44ff88, #88ff44)';
    } else if (ratio > 0.3) {
      shipHpFill.style.background = 'linear-gradient(90deg, #ffaa22, #ffdd44)';
    } else {
      shipHpFill.style.background = 'linear-gradient(90deg, #ff2222, #ff6644)';
    }

    const hpPct = Math.ceil(ratio * 100);
    shipHpText.textContent = state.shipHP > 0 ? `ALIEN SHIP ${hpPct}%` : 'DEFEATED';
  }

  /**
   * Update power bar with near-full indicator
   * @param {Object} state - Game state with power
   */
  function updatePowerBar(state) {
    const ratio = getPowerRatio(state);
    powerFill.style.width = `${ratio * 100}%`;
    powerText.textContent = `POWER ${Math.round(ratio * 100)}%`;

    if (powerBar) {
      powerBar.classList.toggle('near-full', ratio >= POLISH.NEAR_FULL_POWER_RATIO && ratio < 1);
    }
  }

  /**
   * Sync best score displays
   * @param {Object} state - Game state with highScore property
   */
  function syncBestDisplays(state) {
    if (highScoreEl) highScoreEl.textContent = `Best: ${state.highScore}`;
    if (titleBest) titleBest.textContent = `Best: ${state.highScore}`;
  }

  /**
   * Toggle gameplay UI visibility
   * @param {boolean} visible - Show or hide gameplay UI
   */
  function setGameplayUiVisible(visible) {
    const display = visible ? '' : 'none';
    if (hudEl) hudEl.style.display = display;
    if (shipHpBar) shipHpBar.style.display = display;
    if (powerBar) powerBar.style.display = display;
  }

  return {
    updateLivesDisplay,
    triggerLifeGainPulse,
    updateShipHpBar,
    updatePowerBar,
    syncBestDisplays,
    setGameplayUiVisible,
  };
}
