/**
 * Debug Panel UI (S7R-001)
 *
 * Runtime visual overlay for viewing and toggling feature flags.
 * Activated via: Ctrl+Shift+D or console: window.toggleDebugPanel()
 */

import { getAllFlags, toggleFlag, resetFlags, exportFlagURL, getFlagMetadata } from './flags.js';

let panelElement = null;
let panelStyleElement = null;
let isPanelVisible = false;
let keydownListener = null;
let flagChangeListener = null;
let flagsResetListener = null;

/**
 * Create the debug panel DOM element
 */
function createPanelElement() {
  const panel = document.createElement('div');
  panel.id = 's7r-debug-panel';
  panel.className = 's7r-debug-panel';

  // Add styles
  if (!panelStyleElement) {
    panelStyleElement = document.createElement('style');
    panelStyleElement.id = 's7r-debug-panel-style';
    panelStyleElement.textContent = `
    .s7r-debug-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.95);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border: 2px solid #0f0;
      border-radius: 8px;
      overflow: hidden;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
      display: flex;
      flex-direction: column;
    }

    .s7r-debug-panel-header {
      padding: 12px;
      background: rgba(0, 255, 0, 0.1);
      border-bottom: 1px solid #0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      cursor: move;
    }

    .s7r-debug-panel-title {
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .s7r-debug-panel-close {
      background: none;
      border: 1px solid #0f0;
      color: #0f0;
      cursor: pointer;
      padding: 4px 8px;
      font-family: inherit;
      font-size: 12px;
      border-radius: 3px;
    }

    .s7r-debug-panel-close:hover {
      background: #0f0;
      color: #000;
    }

    .s7r-debug-panel-actions {
      padding: 8px 12px;
      border-bottom: 1px solid #0f0;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .s7r-debug-panel-btn {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid #0f0;
      color: #0f0;
      cursor: pointer;
      padding: 4px 8px;
      font-family: inherit;
      font-size: 11px;
      border-radius: 3px;
      flex: 1;
      min-width: 80px;
    }

    .s7r-debug-panel-btn:hover {
      background: rgba(0, 255, 0, 0.2);
    }

    .s7r-debug-panel-btn:active {
      background: #0f0;
      color: #000;
    }

    .s7r-debug-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .s7r-debug-panel-section {
      margin-bottom: 16px;
    }

    .s7r-debug-panel-section-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #0ff;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .s7r-flag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      margin-bottom: 4px;
      background: rgba(0, 255, 0, 0.05);
      border-radius: 4px;
      border-left: 3px solid transparent;
    }

    .s7r-flag-item.active {
      background: rgba(0, 255, 0, 0.15);
      border-left-color: #0f0;
    }

    .s7r-flag-item.modified {
      border-left-color: #ff0;
    }

    .s7r-flag-name {
      flex: 1;
      font-size: 11px;
      word-break: break-word;
    }

    .s7r-flag-toggle {
      background: none;
      border: 1px solid #0f0;
      color: #0f0;
      cursor: pointer;
      padding: 2px 8px;
      font-family: inherit;
      font-size: 10px;
      border-radius: 2px;
      min-width: 50px;
      margin-left: 8px;
    }

    .s7r-flag-toggle.active {
      background: #0f0;
      color: #000;
      font-weight: bold;
    }

    .s7r-flag-toggle:hover {
      background: rgba(0, 255, 0, 0.3);
    }

    .s7r-debug-panel-footer {
      padding: 8px 12px;
      border-top: 1px solid #0f0;
      font-size: 10px;
      color: #0f0;
      opacity: 0.7;
    }

    .s7r-debug-panel-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    /* Scrollbar styling */
    .s7r-debug-panel-content::-webkit-scrollbar {
      width: 8px;
    }

    .s7r-debug-panel-content::-webkit-scrollbar-track {
      background: rgba(0, 255, 0, 0.1);
    }

    .s7r-debug-panel-content::-webkit-scrollbar-thumb {
      background: #0f0;
      border-radius: 4px;
    }

    .s7r-debug-panel-content::-webkit-scrollbar-thumb:hover {
      background: #0ff;
    }
  `;
    document.head.appendChild(panelStyleElement);
  }

  return panel;
}

/**
 * Render panel content
 */
function renderPanelContent() {
  if (!panelElement) return;

  const metadata = getFlagMetadata();
  const allFlags = getAllFlags();
  const totalFlags = Object.keys(allFlags).length;
  const activeCount = Object.values(allFlags).filter(v => v).length;
  const modifiedCount = Object.keys(metadata.modified).length;

  // Group flags by phase
  const flagGroups = {
    'Phase 0: Infrastructure': ['deterministicRNG', 'telemetry', 'debugMode'],
    'Phase 1: Mobile Runtime': ['mobileSafeAreas', 'gestureArbitration', 'accessibilitySettings', 'adaptiveQuality'],
    'Phase 2: Enemy System': ['enemyRegistry', 'enemyStateMachine', 'placeholderRenderer', 'waveDirector', 'spawnValidator'],
    'Phase 3: Enemy Pack Alpha': ['enemySkimmer', 'enemyRamBrute', 'enemyShieldOrbiter', 'enemyHarvester', 'enemySplitter', 'enemyEMPDrone'],
    'Phase 4: Enemy Pack Beta': ['enemySniperPrism', 'enemyBomberArc', 'enemyRiftWarper', 'enemyNecroCollector', 'enemyCommanderBeacon', 'enemyMimicCaster', 'enemySynergyRules', 'unifiedTelegraph', 'damageMatrix', 'rewardEconomy', 'miniBosses', 'mothershipRewrite'],
    'Phase 5: Player Counterplay': ['focusMode', 'panicClear', 'abilityRebalance', 'dynamicDirector'],
    'Phase 6: Guardian Command': ['actionBar', 'actionInputArbitration', 'multiTouchAction', 'buttonMappedPowers', 'supportRuntime', 'guardianActiveMoves', 'commandEnergy', 'supportFramework', 'supportMedicFirefly', 'supportBulwarkBot', 'supportStrikerHawk'],
    'Phase 7: App Productization': ['mobileLifecyclePolish', 'pwaFoundation', 'capacitorWrappers'],
  };

  let contentHTML = `
    <div class="s7r-debug-panel-header">
      <div class="s7r-debug-panel-title">S7R Debug Panel</div>
      <button class="s7r-debug-panel-close" id="s7r-close-panel">✕</button>
    </div>
    <div class="s7r-debug-panel-actions">
      <button class="s7r-debug-panel-btn" id="s7r-reset-flags">Reset All</button>
      <button class="s7r-debug-panel-btn" id="s7r-copy-url">Copy URL</button>
      <button class="s7r-debug-panel-btn" id="s7r-reload">Reload</button>
    </div>
    <div class="s7r-debug-panel-content">
  `;

  // Render each group
  for (const [groupName, flagNames] of Object.entries(flagGroups)) {
    contentHTML += `
      <div class="s7r-debug-panel-section">
        <div class="s7r-debug-panel-section-title">${groupName}</div>
    `;

    for (const flagName of flagNames) {
      const isActive = allFlags[flagName];
      const isModified = metadata.modified[flagName] !== undefined;
      const itemClass = `s7r-flag-item ${isActive ? 'active' : ''} ${isModified ? 'modified' : ''}`;
      const btnClass = `s7r-flag-toggle ${isActive ? 'active' : ''}`;

      contentHTML += `
        <div class="${itemClass}">
          <span class="s7r-flag-name">${flagName}</span>
          <button class="${btnClass}" data-flag="${flagName}">
            ${isActive ? 'ON' : 'OFF'}
          </button>
        </div>
      `;
    }

    contentHTML += '</div>';
  }

  contentHTML += `
    </div>
    <div class="s7r-debug-panel-footer">
      <div class="s7r-debug-panel-stats">
        <span>Total: ${totalFlags}</span>
        <span>Active: ${activeCount}</span>
        <span>Modified: ${modifiedCount}</span>
      </div>
      <div>Press Ctrl+Shift+D to toggle panel</div>
    </div>
  `;

  panelElement.innerHTML = contentHTML;

  // Attach event listeners
  attachEventListeners();
}

/**
 * Attach event listeners to panel elements
 */
function attachEventListeners() {
  // Close button
  const closeBtn = document.getElementById('s7r-close-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideDebugPanel);
  }

  // Reset button
  const resetBtn = document.getElementById('s7r-reset-flags');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all flags to defaults?')) {
        resetFlags();
        renderPanelContent();
      }
    });
  }

  // Copy URL button
  const copyBtn = document.getElementById('s7r-copy-url');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const url = exportFlagURL();
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy URL';
        }, 1500);
      }).catch(err => {
        console.error('[DebugPanel] Failed to copy URL:', err);
      });
    });
  }

  // Reload button
  const reloadBtn = document.getElementById('s7r-reload');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.location.href = exportFlagURL();
    });
  }

  // Flag toggle buttons
  const toggleButtons = panelElement.querySelectorAll('.s7r-flag-toggle');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const flagName = btn.getAttribute('data-flag');
      toggleFlag(flagName);
      renderPanelContent();
    });
  });

  // Make panel draggable
  makeDraggable(panelElement);
}

/**
 * Make panel draggable
 */
function makeDraggable(element) {
  const header = element.querySelector('.s7r-debug-panel-header');
  if (!header) return;

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + 'px';
    element.style.left = (element.offsetLeft - pos1) + 'px';
    element.style.right = 'auto';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

/**
 * Show debug panel
 */
export function showDebugPanel() {
  if (!panelElement) {
    panelElement = createPanelElement();
    document.body.appendChild(panelElement);
  }

  renderPanelContent();
  panelElement.style.display = 'flex';
  isPanelVisible = true;
}

/**
 * Hide debug panel
 */
export function hideDebugPanel() {
  if (panelElement) {
    panelElement.style.display = 'none';
    isPanelVisible = false;
  }
}

/**
 * Toggle debug panel visibility
 */
export function toggleDebugPanel() {
  if (isPanelVisible) {
    hideDebugPanel();
  } else {
    showDebugPanel();
  }
}

function destroyDebugPanel() {
  if (typeof document !== 'undefined' && keydownListener) {
    document.removeEventListener('keydown', keydownListener);
    keydownListener = null;
  }

  if (typeof window !== 'undefined') {
    if (flagChangeListener) {
      window.removeEventListener('flagchange', flagChangeListener);
      flagChangeListener = null;
    }
    if (flagsResetListener) {
      window.removeEventListener('flagsreset', flagsResetListener);
      flagsResetListener = null;
    }

    window.showDebugPanel = undefined;
    window.hideDebugPanel = undefined;
    window.toggleDebugPanel = undefined;
  }

  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }

  if (panelStyleElement) {
    panelStyleElement.remove();
    panelStyleElement = null;
  }

  isPanelVisible = false;
}

/**
 * Initialize debug panel system
 */
export function initDebugPanel() {
  // Expose global API
  if (typeof window !== 'undefined') {
    window.showDebugPanel = showDebugPanel;
    window.hideDebugPanel = hideDebugPanel;
    window.toggleDebugPanel = toggleDebugPanel;
  }

  // Keyboard shortcut: Ctrl+Shift+D
  if (typeof document !== 'undefined' && !keydownListener) {
    keydownListener = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebugPanel();
      }
    };
    document.addEventListener('keydown', keydownListener);
  }

  // Listen for flag changes to update panel
  if (typeof window !== 'undefined' && !flagChangeListener) {
    flagChangeListener = () => {
      if (isPanelVisible) {
        renderPanelContent();
      }
    };
    window.addEventListener('flagchange', flagChangeListener);
  }

  if (typeof window !== 'undefined' && !flagsResetListener) {
    flagsResetListener = () => {
      if (isPanelVisible) {
        renderPanelContent();
      }
    };
    window.addEventListener('flagsreset', flagsResetListener);
  }

  console.log('[DebugPanel] Initialized. Press Ctrl+Shift+D or call window.toggleDebugPanel()');

  return {
    destroy: destroyDebugPanel,
  };
}
