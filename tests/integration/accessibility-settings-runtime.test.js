import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFlags, getFlag, setFlag, resetFlags } from '../../src/config/flags.js';
import { createAccessibilitySettingsController } from '../../src/config/accessibility-settings.js';
import { createSettingsPanel } from '../../src/ui/settings-panel.js';

describe('Accessibility Settings Runtime Integration (S7R-007)', () => {
  let originalLocation;

  beforeEach(() => {
    originalLocation = window.location;
    delete window.location;
    window.location = {
      origin: 'http://localhost',
      pathname: '/',
      search: '',
    };
    window.dispatchEvent = vi.fn();
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();

    const store = {};
    global.localStorage = {
      getItem: vi.fn((key) => (key in store ? store[key] : null)),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    document.body.innerHTML = `
      <button id="settingsBtn" hidden>Settings</button>
      <button id="pauseSettingsBtn" hidden>Pause Settings</button>
      <div id="settingsOverlay" aria-hidden="true">
        <div id="settingsBox">
          <input type="checkbox" id="settingReducedMotion" />
          <input type="checkbox" id="settingLowGraphics" />
          <input type="checkbox" id="settingHighContrast" />
          <input type="radio" name="settingControlScale" value="normal" checked />
          <input type="radio" name="settingControlScale" value="large" />
          <input type="radio" name="settingControlScale" value="xlarge" />
          <button id="settingsCloseBtn">Close</button>
        </div>
      </div>
    `;

    resetFlags();
  });

  afterEach(() => {
    window.location = originalLocation;
    resetFlags();
  });

  it('keeps panel hidden by default and enables it via accessibilitySettings flag', () => {
    initFlags();
    expect(getFlag('accessibilitySettings')).toBe(false);

    const controller = createAccessibilitySettingsController({
      enabled: getFlag('accessibilitySettings'),
    });
    const panel = createSettingsPanel({
      controller,
      enabled: getFlag('accessibilitySettings'),
      beforeOpen: () => true,
      afterClose: () => {},
    });

    const settingsBtn = document.getElementById('settingsBtn');
    expect(settingsBtn.hidden).toBe(true);

    setFlag('accessibilitySettings', true);
    controller.setEnabled(getFlag('accessibilitySettings'));
    panel.setEnabled(getFlag('accessibilitySettings'));

    expect(settingsBtn.hidden).toBe(false);
  });

  it('applies setting changes live through panel controls', () => {
    window.location.search = '?flags=accessibilitySettings:true';
    initFlags();
    expect(getFlag('accessibilitySettings')).toBe(true);

    const controller = createAccessibilitySettingsController({
      enabled: getFlag('accessibilitySettings'),
    });
    const panel = createSettingsPanel({
      controller,
      enabled: true,
      beforeOpen: () => true,
      afterClose: () => {},
    });

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const lowGraphicsInput = document.getElementById('settingLowGraphics');
    const reducedMotionInput = document.getElementById('settingReducedMotion');
    const largeScaleRadio = document.querySelector(
      'input[name="settingControlScale"][value="large"]'
    );

    settingsBtn.click();
    expect(settingsOverlay.classList.contains('active')).toBe(true);

    lowGraphicsInput.checked = true;
    lowGraphicsInput.dispatchEvent(new Event('change', { bubbles: true }));

    reducedMotionInput.checked = true;
    reducedMotionInput.dispatchEvent(new Event('change', { bubbles: true }));

    largeScaleRadio.checked = true;
    largeScaleRadio.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.documentElement.classList.contains('a11y-low-graphics')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--s7r-touch-target-min')).toBe('52px');
    expect(global.localStorage.setItem).toHaveBeenCalled();

    panel.close();
    expect(settingsOverlay.classList.contains('active')).toBe(false);
  });
});
