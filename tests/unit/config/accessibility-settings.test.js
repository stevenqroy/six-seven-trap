import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACCESSIBILITY_DEFAULTS,
  ACCESSIBILITY_STORAGE_KEY,
  normalizeAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  applyAccessibilitySettingsToDocument,
  createAccessibilitySettingsController,
} from '../../../src/config/accessibility-settings.js';

describe('Accessibility Settings (S7R-007)', () => {
  const classNames = ['a11y-reduced-motion', 'a11y-low-graphics', 'a11y-high-contrast'];

  beforeEach(() => {
    const store = {};
    global.localStorage = {
      getItem: vi.fn((key) => (key in store ? store[key] : null)),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
    };

    classNames.forEach((className) => {
      document.documentElement.classList.remove(className);
    });
    document.documentElement.style.removeProperty('--s7r-touch-target-min');
  });

  it('normalizes and coerces malformed values', () => {
    const normalized = normalizeAccessibilitySettings({
      reducedMotion: '1',
      lowGraphicsMode: 'false',
      controlScale: 'bad-value',
      highContrast: 0,
    });

    expect(normalized).toEqual({
      reducedMotion: true,
      lowGraphicsMode: false,
      controlScale: 'normal',
      highContrast: false,
    });
  });

  it('loads defaults when storage is empty or invalid', () => {
    localStorage.getItem.mockReturnValueOnce(null);
    expect(loadAccessibilitySettings()).toEqual(ACCESSIBILITY_DEFAULTS);

    localStorage.getItem.mockReturnValueOnce('{"invalid":');
    expect(loadAccessibilitySettings()).toEqual(ACCESSIBILITY_DEFAULTS);
  });

  it('saves and reloads settings from localStorage', () => {
    const settings = {
      reducedMotion: true,
      lowGraphicsMode: true,
      controlScale: 'xlarge',
      highContrast: true,
    };

    saveAccessibilitySettings(settings);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify(settings)
    );

    localStorage.getItem.mockReturnValue(JSON.stringify(settings));
    expect(loadAccessibilitySettings()).toEqual(settings);
  });

  it('applies and clears document classes/vars', () => {
    applyAccessibilitySettingsToDocument(
      {
        reducedMotion: true,
        lowGraphicsMode: true,
        controlScale: 'large',
        highContrast: true,
      },
      { enabled: true }
    );

    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-low-graphics')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--s7r-touch-target-min')).toBe('52px');

    applyAccessibilitySettingsToDocument(ACCESSIBILITY_DEFAULTS, { enabled: false });
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(false);
    expect(document.documentElement.classList.contains('a11y-low-graphics')).toBe(false);
    expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--s7r-touch-target-min')).toBe('44px');
  });

  it('controller updates settings, persists, and emits change events', () => {
    const controller = createAccessibilitySettingsController({ enabled: true });
    const updates = [];
    const unsubscribe = controller.subscribe((nextSettings) => {
      updates.push(nextSettings);
    });

    controller.setSettings({
      reducedMotion: true,
      lowGraphicsMode: true,
      controlScale: 'large',
    });

    expect(controller.getSettings()).toEqual({
      reducedMotion: true,
      lowGraphicsMode: true,
      controlScale: 'large',
      highContrast: false,
    });
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(updates.length).toBe(1);
    expect(updates[0].reducedMotion).toBe(true);
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-low-graphics')).toBe(true);

    controller.setEnabled(false);
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(false);
    expect(document.documentElement.classList.contains('a11y-low-graphics')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--s7r-touch-target-min')).toBe('44px');
    unsubscribe();
  });
});
