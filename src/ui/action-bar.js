/**
 * Action Bar UI Framework (S7R-046)
 *
 * Mobile-first button layout for Guardian active abilities and support summons.
 * Features:
 * - Bottom/side button positioning with safe-area awareness
 * - Cooldown radial overlays
 * - Touch-safe hit zones (minimum 52x52 CSS px)
 * - Disabled state visualization
 * - Mobile and desktop responsive layout
 */

const NOOP = () => {};

/**
 * Button configuration schema
 * @typedef {Object} ActionButtonConfig
 * @property {string} id - Unique button identifier
 * @property {string} label - Button text label
 * @property {string} [icon] - Optional icon character/emoji
 * @property {string} [position] - 'bottom-center' | 'bottom-right' | 'left-side' | 'upper-right'
 * @property {Function} onActivate - Callback when button is clicked/tapped
 */

/**
 * Button state
 * @typedef {Object} ActionButtonState
 * @property {boolean} enabled - Can the button be pressed?
 * @property {boolean} active - Is the button currently pressed?
 * @property {number} cooldownRemaining - Seconds remaining on cooldown (0 = ready)
 * @property {number} cooldownTotal - Total cooldown duration in seconds
 */

function setElementHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Create action bar UI system
 * @param {Object} options
 * @param {boolean} options.enabled - Is action bar enabled?
 * @param {ActionButtonConfig[]} options.buttons - Button configurations
 * @param {Function} options.beforeActivate - Called before any button activation
 * @param {Function} options.afterActivate - Called after any button activation
 * @returns {Object} Action bar controller
 */
export function createActionBar({
  enabled = false,
  buttons = [],
  beforeActivate = NOOP,
  afterActivate = NOOP,
} = {}) {
  if (typeof document === 'undefined') {
    return {
      setEnabled: () => {},
      updateButton: () => {},
      render: () => {},
      destroy: () => {},
      getButtonState: () => null,
    };
  }

  const container = document.getElementById('actionBarContainer');
  if (!container) {
    console.warn('[ActionBar] Container #actionBarContainer not found; action bar disabled.');
    return {
      setEnabled: () => {},
      updateButton: () => {},
      render: () => {},
      destroy: () => {},
      getButtonState: () => null,
    };
  }

  let barEnabled = Boolean(enabled);
  const buttonStates = new Map(); // buttonId -> ActionButtonState
  const buttonElements = new Map(); // buttonId -> HTMLElement
  const cooldownCanvases = new Map(); // buttonId -> CanvasRenderingContext2D

  // Initialize button states
  for (const config of buttons) {
    buttonStates.set(config.id, {
      enabled: true,
      active: false,
      cooldownRemaining: 0,
      cooldownTotal: 0,
    });
  }

  /**
   * Create button DOM element
   */
  function createButtonElement(config) {
    const button = document.createElement('button');
    button.className = 'action-bar-button';
    button.id = `action-btn-${config.id}`;
    button.setAttribute('data-button-id', config.id);
    button.setAttribute('aria-label', config.label);
    button.type = 'button';

    // Add position class if specified
    if (config.position) {
      button.classList.add(`action-btn-${config.position}`);
    }

    // Cooldown canvas overlay
    const cooldownCanvas = document.createElement('canvas');
    cooldownCanvas.className = 'action-bar-cooldown';
    cooldownCanvas.width = 64;
    cooldownCanvas.height = 64;
    cooldownCanvas.setAttribute('aria-hidden', 'true');

    // Button content wrapper
    const content = document.createElement('span');
    content.className = 'action-bar-button-content';

    if (config.icon) {
      const icon = document.createElement('span');
      icon.className = 'action-bar-icon';
      icon.textContent = config.icon;
      icon.setAttribute('aria-hidden', 'true');
      content.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'action-bar-label';
    label.textContent = config.label;
    content.appendChild(label);

    // Cooldown time display
    const cooldownText = document.createElement('span');
    cooldownText.className = 'action-bar-cooldown-text';
    cooldownText.setAttribute('aria-live', 'polite');
    cooldownText.setAttribute('aria-atomic', 'true');

    button.appendChild(cooldownCanvas);
    button.appendChild(content);
    button.appendChild(cooldownText);

    // Event listener
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleButtonActivate(config.id, config);
    });

    // Store canvas context for cooldown rendering
    cooldownCanvases.set(config.id, cooldownCanvas.getContext('2d'));

    return button;
  }

  /**
   * Handle button activation
   */
  function handleButtonActivate(buttonId, config) {
    if (!barEnabled) return;

    const state = buttonStates.get(buttonId);
    if (!state || !state.enabled || state.cooldownRemaining > 0) {
      return; // Button not ready
    }

    if (beforeActivate(buttonId, config) === false) {
      return; // Activation blocked
    }

    // Set active state briefly (visual feedback)
    state.active = true;
    updateButtonAppearance(buttonId);

    // Trigger callback
    if (typeof config.onActivate === 'function') {
      config.onActivate(buttonId);
    }

    // Reset active state after animation
    setTimeout(() => {
      state.active = false;
      updateButtonAppearance(buttonId);
    }, 100);

    afterActivate(buttonId, config);
  }

  /**
   * Update button visual appearance
   */
  function updateButtonAppearance(buttonId) {
    const button = buttonElements.get(buttonId);
    const state = buttonStates.get(buttonId);
    if (!button || !state) return;

    // Update classes
    button.classList.toggle('disabled', !state.enabled || state.cooldownRemaining > 0);
    button.classList.toggle('active', state.active);
    button.disabled = !state.enabled || state.cooldownRemaining > 0;

    // Update cooldown text
    const cooldownText = button.querySelector('.action-bar-cooldown-text');
    if (cooldownText) {
      if (state.cooldownRemaining > 0) {
        const seconds = Math.ceil(state.cooldownRemaining);
        cooldownText.textContent = `${seconds}s`;
        cooldownText.hidden = false;
      } else {
        cooldownText.textContent = '';
        cooldownText.hidden = true;
      }
    }

    // Render cooldown overlay
    renderCooldownOverlay(buttonId);
  }

  /**
   * Render radial cooldown overlay
   */
  function renderCooldownOverlay(buttonId) {
    const ctx = cooldownCanvases.get(buttonId);
    const state = buttonStates.get(buttonId);
    if (!ctx || !state) return;

    const canvas = ctx.canvas;
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    if (state.cooldownRemaining <= 0 || state.cooldownTotal <= 0) {
      return; // No cooldown to draw
    }

    // Calculate progress (0 = full cooldown, 1 = ready)
    const progress = 1 - clamp(state.cooldownRemaining / state.cooldownTotal, 0, 1);

    // Draw radial wipe
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2, // Start at top
      -Math.PI / 2 + progress * Math.PI * 2, // Sweep clockwise
      false
    );
    ctx.closePath();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
  }

  /**
   * Initialize UI
   */
  function render() {
    if (!barEnabled) {
      setElementHidden(container, true);
      return;
    }

    // Clear existing buttons
    container.innerHTML = '';
    buttonElements.clear();

    // Create buttons
    for (const config of buttons) {
      const button = createButtonElement(config);
      buttonElements.set(config.id, button);
      container.appendChild(button);
      updateButtonAppearance(config.id);
    }

    setElementHidden(container, false);
  }

  /**
   * Update button state
   * @param {string} buttonId
   * @param {Partial<ActionButtonState>} updates
   */
  function updateButton(buttonId, updates) {
    const state = buttonStates.get(buttonId);
    if (!state) return;

    if (typeof updates.enabled === 'boolean') {
      state.enabled = updates.enabled;
    }
    if (typeof updates.cooldownRemaining === 'number') {
      state.cooldownRemaining = Math.max(0, updates.cooldownRemaining);
    }
    if (typeof updates.cooldownTotal === 'number') {
      state.cooldownTotal = Math.max(0, updates.cooldownTotal);
    }

    updateButtonAppearance(buttonId);
  }

  /**
   * Update cooldowns (call from game loop)
   * @param {number} deltaSeconds - Time elapsed since last frame
   */
  function updateCooldowns(deltaSeconds) {
    for (const [buttonId, state] of buttonStates.entries()) {
      if (state.cooldownRemaining > 0) {
        state.cooldownRemaining = Math.max(0, state.cooldownRemaining - deltaSeconds);
        updateButtonAppearance(buttonId);
      }
    }
  }

  /**
   * Enable/disable action bar
   */
  function setEnabled(value) {
    const wasEnabled = barEnabled;
    barEnabled = Boolean(value);

    if (barEnabled !== wasEnabled) {
      if (barEnabled) {
        render();
      } else {
        setElementHidden(container, true);
      }
    }
  }

  /**
   * Get button state (for testing)
   */
  function getButtonState(buttonId) {
    const state = buttonStates.get(buttonId);
    if (!state) return null;
    return { ...state };
  }

  /**
   * Clean up
   */
  function destroy() {
    for (const button of buttonElements.values()) {
      button.remove();
    }
    buttonElements.clear();
    cooldownCanvases.clear();
  }

  // Initial render
  if (barEnabled) {
    render();
  } else {
    setElementHidden(container, true);
  }

  return {
    setEnabled,
    updateButton,
    updateCooldowns,
    render,
    destroy,
    getButtonState,
  };
}
