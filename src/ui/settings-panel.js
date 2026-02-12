const NOOP = () => {};

function toControlScaleValue(radios) {
  for (const radio of radios) {
    if (radio.checked) return radio.value;
  }
  return 'normal';
}

function setElementHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

/**
 * Accessibility settings panel wiring.
 * Expects DOM IDs from index.html and a controller created by createAccessibilitySettingsController().
 */
export function createSettingsPanel({
  controller,
  enabled = false,
  beforeOpen = NOOP,
  afterClose = NOOP,
} = {}) {
  if (typeof document === 'undefined' || !controller) {
    return {
      open: () => false,
      close: () => {},
      isOpen: () => false,
      setEnabled: () => {},
      destroy: () => {},
    };
  }

  const settingsBtn = document.getElementById('settingsBtn');
  const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
  const overlay = document.getElementById('settingsOverlay');
  const closeBtn = document.getElementById('settingsCloseBtn');
  const reducedMotionInput = document.getElementById('settingReducedMotion');
  const lowGraphicsInput = document.getElementById('settingLowGraphics');
  const highContrastInput = document.getElementById('settingHighContrast');
  const controlScaleInputs = Array.from(
    document.querySelectorAll('input[name="settingControlScale"]')
  );

  const requiredElements = [
    settingsBtn,
    pauseSettingsBtn,
    overlay,
    closeBtn,
    reducedMotionInput,
    lowGraphicsInput,
    highContrastInput,
  ];

  if (requiredElements.some((element) => !element) || controlScaleInputs.length === 0) {
    console.warn('[SettingsPanel] Missing required DOM elements; panel disabled.');
    return {
      open: () => false,
      close: () => {},
      isOpen: () => false,
      setEnabled: () => {},
      destroy: () => {},
    };
  }

  let panelEnabled = Boolean(enabled);
  let panelOpen = false;
  let lastTrigger = null;

  function syncForm(settings) {
    reducedMotionInput.checked = Boolean(settings.reducedMotion);
    lowGraphicsInput.checked = Boolean(settings.lowGraphicsMode);
    highContrastInput.checked = Boolean(settings.highContrast);

    const nextControlScale = settings.controlScale || 'normal';
    for (const radio of controlScaleInputs) {
      radio.checked = radio.value === nextControlScale;
    }
  }

  function close({ restoreFocus = true } = {}) {
    if (!panelOpen) return;
    panelOpen = false;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    afterClose();
    if (restoreFocus && lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function open(trigger = null) {
    if (!panelEnabled || panelOpen) return false;
    if (beforeOpen() === false) return false;
    panelOpen = true;
    lastTrigger = trigger;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
    return true;
  }

  function setEnabled(nextEnabled) {
    panelEnabled = Boolean(nextEnabled);
    setElementHidden(settingsBtn, !panelEnabled);
    setElementHidden(pauseSettingsBtn, !panelEnabled);
    if (!panelEnabled) {
      close({ restoreFocus: false });
    }
  }

  function handleOpenClick(event) {
    event.preventDefault();
    open(event.currentTarget);
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) {
      close();
    }
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || !panelOpen) return;
    event.preventDefault();
    close();
  }

  function handleCheckboxChange() {
    controller.setSettings({
      reducedMotion: reducedMotionInput.checked,
      lowGraphicsMode: lowGraphicsInput.checked,
      highContrast: highContrastInput.checked,
    });
  }

  function handleControlScaleChange() {
    controller.setSettings({
      controlScale: toControlScaleValue(controlScaleInputs),
    });
  }

  function handleCloseClick() {
    close();
  }

  settingsBtn.addEventListener('click', handleOpenClick);
  pauseSettingsBtn.addEventListener('click', handleOpenClick);
  closeBtn.addEventListener('click', handleCloseClick);
  overlay.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleEscape);
  reducedMotionInput.addEventListener('change', handleCheckboxChange);
  lowGraphicsInput.addEventListener('change', handleCheckboxChange);
  highContrastInput.addEventListener('change', handleCheckboxChange);
  for (const radio of controlScaleInputs) {
    radio.addEventListener('change', handleControlScaleChange);
  }

  const unsubscribe = controller.subscribe((nextSettings) => {
    syncForm(nextSettings);
  });

  syncForm(controller.getSettings());
  setEnabled(panelEnabled);

  return {
    open,
    close,
    isOpen() {
      return panelOpen;
    },
    setEnabled,
    destroy() {
      unsubscribe();
      settingsBtn.removeEventListener('click', handleOpenClick);
      pauseSettingsBtn.removeEventListener('click', handleOpenClick);
      closeBtn.removeEventListener('click', handleCloseClick);
      overlay.removeEventListener('click', handleOverlayClick);
      document.removeEventListener('keydown', handleEscape);
      reducedMotionInput.removeEventListener('change', handleCheckboxChange);
      lowGraphicsInput.removeEventListener('change', handleCheckboxChange);
      highContrastInput.removeEventListener('change', handleCheckboxChange);
      for (const radio of controlScaleInputs) {
        radio.removeEventListener('change', handleControlScaleChange);
      }
    },
  };
}
