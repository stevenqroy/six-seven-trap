import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSettingsPanel } from '../../../src/ui/settings-panel.js';

const DEFAULT_SETTINGS = Object.freeze({
  reducedMotion: false,
  lowGraphicsMode: false,
  highContrast: false,
  controlScale: 'normal',
});

function renderSettingsPanelDom({ includeControlScale = true } = {}) {
  document.body.innerHTML = `
    <button id="settingsBtn" type="button">Settings</button>
    <button id="pauseSettingsBtn" type="button">Pause Settings</button>
    <div id="settingsOverlay" aria-hidden="true">
      <div id="settingsCard">
        <button id="settingsCloseBtn" type="button">Close</button>
      </div>
    </div>
    <input id="settingReducedMotion" type="checkbox" />
    <input id="settingLowGraphics" type="checkbox" />
    <input id="settingHighContrast" type="checkbox" />
    ${includeControlScale
      ? `
        <input id="settingControlScaleNormal" type="radio" name="settingControlScale" value="normal" checked />
        <input id="settingControlScaleLarge" type="radio" name="settingControlScale" value="large" />
      `
      : ''}
  `;

  return {
    settingsBtn: document.getElementById('settingsBtn'),
    pauseSettingsBtn: document.getElementById('pauseSettingsBtn'),
    overlay: document.getElementById('settingsOverlay'),
    closeBtn: document.getElementById('settingsCloseBtn'),
    reducedMotionInput: document.getElementById('settingReducedMotion'),
    lowGraphicsInput: document.getElementById('settingLowGraphics'),
    highContrastInput: document.getElementById('settingHighContrast'),
    controlScaleNormal: document.getElementById('settingControlScaleNormal'),
    controlScaleLarge: document.getElementById('settingControlScaleLarge'),
  };
}

function createController(initial = {}) {
  let currentSettings = { ...DEFAULT_SETTINGS, ...initial };
  const subscribers = new Set();
  const unsubscribe = vi.fn(() => {});

  const controller = {
    getSettings: vi.fn(() => ({ ...currentSettings })),
    setSettings: vi.fn((partial) => {
      currentSettings = { ...currentSettings, ...partial };
      for (const callback of subscribers) {
        callback({ ...currentSettings });
      }
      return { ...currentSettings };
    }),
    subscribe: vi.fn((callback) => {
      subscribers.add(callback);
      return vi.fn(() => {
        subscribers.delete(callback);
        unsubscribe();
      });
    }),
  };

  return {
    controller,
    unsubscribe,
    emit(nextSettings) {
      currentSettings = { ...currentSettings, ...nextSettings };
      for (const callback of subscribers) {
        callback({ ...currentSettings });
      }
    },
  };
}

describe('settings panel (S7R-101)', () => {
  const panels = [];

  beforeEach(() => {
    panels.length = 0;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    while (panels.length > 0) {
      const panel = panels.pop();
      panel.destroy();
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('returns a stub API when controller is missing', () => {
    renderSettingsPanelDom();
    const panel = createSettingsPanel();

    expect(panel.open()).toBe(false);
    expect(panel.isOpen()).toBe(false);
    expect(() => panel.close()).not.toThrow();
    expect(() => panel.setEnabled(true)).not.toThrow();
    expect(() => panel.destroy()).not.toThrow();
  });

  it('returns a stub API when required DOM elements are missing', () => {
    const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { controller } = createController();
    renderSettingsPanelDom({ includeControlScale: false });

    const panel = createSettingsPanel({ controller, enabled: true });

    expect(panel.open()).toBe(false);
    expect(panel.isOpen()).toBe(false);
    expect(controller.subscribe).not.toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalledTimes(1);
  });

  it('opens and closes with lifecycle guards and focus restore', () => {
    const { controller } = createController();
    const { overlay } = renderSettingsPanelDom();
    const beforeOpen = vi.fn(() => true);
    const afterClose = vi.fn(() => {});
    const panel = createSettingsPanel({
      controller,
      enabled: true,
      beforeOpen,
      afterClose,
    });
    panels.push(panel);
    const trigger = { focus: vi.fn(() => {}) };

    expect(panel.open(trigger)).toBe(true);
    expect(panel.isOpen()).toBe(true);
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    expect(panel.open(trigger)).toBe(false);

    panel.close();
    expect(panel.isOpen()).toBe(false);
    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.focus).toHaveBeenCalledTimes(1);
    expect(afterClose).toHaveBeenCalledTimes(1);

    beforeOpen.mockReturnValue(false);
    expect(panel.open(trigger)).toBe(false);
    expect(panel.isOpen()).toBe(false);
  });

  it('open returns false when the panel is disabled', () => {
    const { controller } = createController();
    renderSettingsPanelDom();
    const panel = createSettingsPanel({
      controller,
      enabled: false,
    });
    panels.push(panel);

    expect(panel.open()).toBe(false);
    panel.setEnabled(true);
    expect(panel.open()).toBe(true);
  });

  it('setEnabled hides buttons and auto-closes an open panel', () => {
    const { controller } = createController();
    const { settingsBtn, pauseSettingsBtn, overlay } = renderSettingsPanelDom();
    const afterClose = vi.fn(() => {});
    const panel = createSettingsPanel({
      controller,
      enabled: true,
      afterClose,
    });
    panels.push(panel);

    expect(panel.open(settingsBtn)).toBe(true);
    panel.setEnabled(false);

    expect(settingsBtn.hidden).toBe(true);
    expect(pauseSettingsBtn.hidden).toBe(true);
    expect(settingsBtn.getAttribute('aria-hidden')).toBe('true');
    expect(pauseSettingsBtn.getAttribute('aria-hidden')).toBe('true');
    expect(panel.isOpen()).toBe(false);
    expect(overlay.classList.contains('active')).toBe(false);
    expect(afterClose).toHaveBeenCalledTimes(1);
  });

  it('escape key closes only when panel is open', () => {
    const { controller } = createController();
    renderSettingsPanelDom();
    const panel = createSettingsPanel({
      controller,
      enabled: true,
    });
    panels.push(panel);
    const trigger = { focus: vi.fn(() => {}) };

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(panel.isOpen()).toBe(false);

    expect(panel.open(trigger)).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true, cancelable: true }));
    expect(panel.isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(panel.isOpen()).toBe(false);
    expect(trigger.focus).toHaveBeenCalledTimes(1);
  });

  it('overlay closes on backdrop click but not child click', () => {
    const { controller } = createController();
    const { overlay } = renderSettingsPanelDom();
    const panel = createSettingsPanel({
      controller,
      enabled: true,
    });
    panels.push(panel);
    const child = document.createElement('div');
    overlay.appendChild(child);

    expect(panel.open()).toBe(true);
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.isOpen()).toBe(true);

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.isOpen()).toBe(false);
  });

  it('syncs form state and forwards checkbox/radio changes to controller', () => {
    const { controller, emit } = createController({
      reducedMotion: true,
      lowGraphicsMode: true,
      highContrast: false,
      controlScale: 'large',
    });
    const {
      reducedMotionInput,
      lowGraphicsInput,
      highContrastInput,
      controlScaleNormal,
      controlScaleLarge,
    } = renderSettingsPanelDom();
    const panel = createSettingsPanel({
      controller,
      enabled: true,
    });
    panels.push(panel);

    expect(reducedMotionInput.checked).toBe(true);
    expect(lowGraphicsInput.checked).toBe(true);
    expect(highContrastInput.checked).toBe(false);
    expect(controlScaleLarge.checked).toBe(true);
    expect(controlScaleNormal.checked).toBe(false);

    reducedMotionInput.checked = false;
    lowGraphicsInput.checked = false;
    highContrastInput.checked = true;
    highContrastInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(controller.setSettings).toHaveBeenCalledWith({
      reducedMotion: false,
      lowGraphicsMode: false,
      highContrast: true,
    });

    controlScaleLarge.checked = false;
    controlScaleNormal.checked = true;
    controlScaleNormal.dispatchEvent(new Event('change', { bubbles: true }));
    expect(controller.setSettings).toHaveBeenCalledWith({
      controlScale: 'normal',
    });

    emit({
      reducedMotion: true,
      lowGraphicsMode: false,
      highContrast: true,
      controlScale: 'large',
    });
    expect(reducedMotionInput.checked).toBe(true);
    expect(lowGraphicsInput.checked).toBe(false);
    expect(highContrastInput.checked).toBe(true);
    expect(controlScaleLarge.checked).toBe(true);
  });

  it('destroy removes listeners and unsubscribes controller updates', () => {
    const { controller, unsubscribe } = createController();
    const { settingsBtn, reducedMotionInput } = renderSettingsPanelDom();
    const panel = createSettingsPanel({
      controller,
      enabled: true,
    });

    settingsBtn.click();
    expect(panel.isOpen()).toBe(true);
    panel.close();
    panel.destroy();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    settingsBtn.click();
    expect(panel.isOpen()).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.isOpen()).toBe(false);

    reducedMotionInput.checked = true;
    reducedMotionInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(controller.setSettings).not.toHaveBeenCalled();
  });
});
