/**
 * Accessibility settings (S7R-007)
 *
 * Stores user accessibility preferences separately from feature flags.
 * Settings are persisted to localStorage and applied live via document classes/CSS vars.
 */

export const ACCESSIBILITY_STORAGE_KEY = 's7r-accessibility-settings';

export const ACCESSIBILITY_DEFAULTS = Object.freeze({
  reducedMotion: false,
  lowGraphicsMode: false,
  controlScale: 'normal',
  highContrast: false,
});

const CONTROL_SCALE_TOUCH_TARGET_PX = Object.freeze({
  normal: 44,
  large: 52,
  xlarge: 60,
});

function coerceBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

function normalizeControlScale(value) {
  if (typeof value !== 'string') return ACCESSIBILITY_DEFAULTS.controlScale;
  return CONTROL_SCALE_TOUCH_TARGET_PX[value] ? value : ACCESSIBILITY_DEFAULTS.controlScale;
}

function shallowEqualSettings(a, b) {
  return (
    a.reducedMotion === b.reducedMotion &&
    a.lowGraphicsMode === b.lowGraphicsMode &&
    a.controlScale === b.controlScale &&
    a.highContrast === b.highContrast
  );
}

export function getControlScaleTouchTargetPx(controlScale) {
  return CONTROL_SCALE_TOUCH_TARGET_PX[normalizeControlScale(controlScale)];
}

export function normalizeAccessibilitySettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    reducedMotion: coerceBoolean(source.reducedMotion, ACCESSIBILITY_DEFAULTS.reducedMotion),
    lowGraphicsMode: coerceBoolean(source.lowGraphicsMode, ACCESSIBILITY_DEFAULTS.lowGraphicsMode),
    controlScale: normalizeControlScale(source.controlScale),
    highContrast: coerceBoolean(source.highContrast, ACCESSIBILITY_DEFAULTS.highContrast),
  };
}

export function loadAccessibilitySettings({ storageKey = ACCESSIBILITY_STORAGE_KEY } = {}) {
  if (typeof localStorage === 'undefined') return { ...ACCESSIBILITY_DEFAULTS };
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...ACCESSIBILITY_DEFAULTS };
    return normalizeAccessibilitySettings(JSON.parse(raw));
  } catch (error) {
    console.warn('[Accessibility] Failed to parse localStorage settings:', error);
    return { ...ACCESSIBILITY_DEFAULTS };
  }
}

export function saveAccessibilitySettings(
  settings,
  { storageKey = ACCESSIBILITY_STORAGE_KEY } = {}
) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(normalizeAccessibilitySettings(settings))
    );
  } catch (error) {
    console.warn('[Accessibility] Failed to save localStorage settings:', error);
  }
}

export function applyAccessibilitySettingsToDocument(
  settings,
  { enabled = true } = {}
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const normalized = normalizeAccessibilitySettings(settings);
  const active = Boolean(enabled);

  root.classList.toggle('a11y-reduced-motion', active && normalized.reducedMotion);
  root.classList.toggle('a11y-low-graphics', active && normalized.lowGraphicsMode);
  root.classList.toggle('a11y-high-contrast', active && normalized.highContrast);

  const touchTargetPx = active
    ? getControlScaleTouchTargetPx(normalized.controlScale)
    : getControlScaleTouchTargetPx(ACCESSIBILITY_DEFAULTS.controlScale);
  root.style.setProperty('--s7r-touch-target-min', `${touchTargetPx}px`);
}

function dispatchSettingsEvent(type, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function createAccessibilitySettingsController({
  enabled = true,
  storageKey = ACCESSIBILITY_STORAGE_KEY,
} = {}) {
  let isEnabled = Boolean(enabled);
  let settings = loadAccessibilitySettings({ storageKey });
  const listeners = new Set();

  function notify(previousSettings) {
    const current = { ...settings };
    for (const listener of listeners) {
      listener(current, previousSettings);
    }
    dispatchSettingsEvent('accessibilitysettingschange', {
      settings: current,
      previousSettings,
      enabled: isEnabled,
    });
  }

  function applyCurrentSettings() {
    applyAccessibilitySettingsToDocument(settings, { enabled: isEnabled });
  }

  function setSettings(nextPartial = {}) {
    const previousSettings = { ...settings };
    settings = normalizeAccessibilitySettings({ ...settings, ...nextPartial });
    saveAccessibilitySettings(settings, { storageKey });
    applyCurrentSettings();

    if (!shallowEqualSettings(previousSettings, settings)) {
      notify(previousSettings);
    }

    return { ...settings };
  }

  function reset() {
    return setSettings({ ...ACCESSIBILITY_DEFAULTS });
  }

  function setEnabled(nextEnabled) {
    const previousEnabled = isEnabled;
    isEnabled = Boolean(nextEnabled);
    applyCurrentSettings();
    if (previousEnabled !== isEnabled) {
      dispatchSettingsEvent('accessibilitysettingsenabled', {
        enabled: isEnabled,
        settings: { ...settings },
      });
    }
    return isEnabled;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  applyCurrentSettings();

  return {
    getSettings() {
      return { ...settings };
    },
    setSettings,
    reset,
    setEnabled,
    isEnabled() {
      return isEnabled;
    },
    subscribe,
    destroy() {
      listeners.clear();
    },
  };
}
