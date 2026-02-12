/**
 * Feature Flags System (S7R-001)
 *
 * Provides runtime feature toggles for safe rollout and rollback.
 * Flags can be controlled via:
 * - Default values (defined below)
 * - Query string (?flags=flag1:true,flag2:false)
 * - Console commands (window.setFlag('flagName', value))
 * - Debug panel (UI overlay)
 */

/**
 * Default flag configuration
 * All flags default to false/stable state unless explicitly enabled
 */
const DEFAULT_FLAGS = {
  // Phase 0: Infrastructure
  deterministicRNG: false,           // S7R-002: Use seeded RNG instead of Math.random()
  telemetry: false,                  // S7R-003: Collect gameplay metrics
  debugMode: false,                  // General debug features

  // Phase 1: Mobile Runtime
  mobileSafeAreas: false,            // S7R-005: Safe area insets for notched devices
  gestureArbitration: false,         // S7R-006: Advanced gesture state machine
  accessibilitySettings: false,      // S7R-007: Settings panel with a11y options
  adaptiveQuality: false,            // S7R-008: Dynamic quality scaling

  // Phase 2: Enemy System
  enemyRegistry: false,              // S7R-009: New enemy manifest system
  enemyStateMachine: false,          // S7R-011: Generic enemy lifecycle
  placeholderRenderer: false,        // S7R-012: Procedural enemy visuals
  waveDirector: false,               // S7R-013: Threat-budgeted spawning
  spawnValidator: false,             // S7R-014: Fairness validation

  // Phase 3: Enemy Pack Alpha
  enemySkimmer: false,               // S7R-015: Skimmer enemy
  enemyRamBrute: false,              // S7R-016: Ram Brute enemy
  enemyShieldOrbiter: false,         // S7R-017: Shield Orbiter enemy
  enemyHarvester: false,             // S7R-018: Harvester enemy
  enemySplitter: false,              // S7R-019: Splitter enemy
  enemyEMPDrone: false,              // S7R-020: EMP Drone enemy

  // Phase 4: Enemy Pack Beta
  enemySniperPrism: false,           // S7R-021: Sniper Prism enemy
  enemyBomberArc: false,             // S7R-022: Bomber Arc enemy
  enemyRiftWarper: false,            // S7R-023: Rift Warper enemy
  enemyNecroCollector: false,        // S7R-024: Necro Collector enemy
  enemyCommanderBeacon: false,       // S7R-025: Commander Beacon enemy
  enemyMimicCaster: false,           // S7R-026: Mimic Caster enemy
  enemySynergyRules: false,          // S7R-027: Enemy combination rules
  unifiedTelegraph: false,           // S7R-028: Consistent telegraph standard
  damageMatrix: false,               // S7R-029: Typed damage interactions
  rewardEconomy: false,              // S7R-030: Drop economy system
  miniBosses: false,                 // S7R-031: Elite enemy variants
  mothershipRewrite: false,          // S7R-032: Boss phase rewrite

  // Phase 5: Player Counterplay
  focusMode: false,                  // S7R-033: Precision movement mode
  panicClear: false,                 // S7R-034: Emergency clear ability
  abilityRebalance: false,           // S7R-035: Economy rebalancing
  dynamicDirector: false,            // S7R-036: Adaptive difficulty

  // Phase 6: Guardian Command
  actionBar: false,                  // S7R-046: Action button UI
  actionInputArbitration: false,     // S7R-047: Multi-touch move+action
  guardianActiveMoves: false,        // S7R-048: Direct combat abilities
  commandEnergy: false,              // S7R-049: Summon energy system
  supportFramework: false,           // S7R-050: Support unit runtime
  supportMedicFirefly: false,        // S7R-051: Medic support unit
  supportBulwarkBot: false,          // S7R-052: Bulwark support unit
  supportStrikerHawk: false,         // S7R-053: Striker support unit

  // Phase 7: App Productization
  mobileLifecyclePolish: false,      // S7R-037: App background/foreground
  pwaFoundation: false,              // S7R-038: PWA installability
  capacitorWrappers: false,          // S7R-039: Native app wrappers
};

/**
 * Active flags state
 * Merged from defaults + query string + runtime overrides
 */
let activeFlags = { ...DEFAULT_FLAGS };

/**
 * Parse flags from query string
 * Format: ?flags=flag1:true,flag2:false,flag3:1
 */
function parseFlagsFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const flagsParam = params.get('flags');

  if (!flagsParam) return {};

  const overrides = {};
  const pairs = flagsParam.split(',');

  for (const pair of pairs) {
    const [key, value] = pair.split(':');
    if (key && value !== undefined) {
      // Convert string to boolean
      const boolValue = value === 'true' || value === '1';
      overrides[key.trim()] = boolValue;
    }
  }

  return overrides;
}

/**
 * Parse flags from localStorage
 * Allows persistence across sessions
 */
function parseFlagsFromStorage() {
  try {
    const stored = localStorage.getItem('s7r-flags');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('[Flags] Failed to parse localStorage flags:', e);
    return {};
  }
}

/**
 * Save flags to localStorage
 */
function saveFlagsToStorage(flags) {
  try {
    localStorage.setItem('s7r-flags', JSON.stringify(flags));
  } catch (e) {
    console.warn('[Flags] Failed to save flags to localStorage:', e);
  }
}

/**
 * Mirror key flags to document classes for CSS-only features.
 * Keeps mobile-safe-area behavior behind the mobileSafeAreas flag
 * without requiring additional main-loop wiring.
 */
function syncDocumentFlagClasses(flags) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root || !root.classList) return;
  root.classList.toggle('flag-mobile-safe-areas', Boolean(flags.mobileSafeAreas));
}

/**
 * Initialize flag system
 * Priority: defaults < localStorage < query string < runtime
 */
export function initFlags() {
  const storedFlags = parseFlagsFromStorage();
  const queryFlags = parseFlagsFromQuery();

  activeFlags = {
    ...DEFAULT_FLAGS,
    ...storedFlags,
    ...queryFlags,
  };

  syncDocumentFlagClasses(activeFlags);

  // Expose global API for console access
  if (typeof window !== 'undefined') {
    window.getFlag = getFlag;
    window.setFlag = setFlag;
    window.getAllFlags = getAllFlags;
    window.resetFlags = resetFlags;
    window.toggleFlag = toggleFlag;
  }

  // Log active non-default flags
  const activeNonDefaults = Object.entries(activeFlags)
    .filter(([key, value]) => value !== DEFAULT_FLAGS[key])
    .map(([key, value]) => `${key}=${value}`);

  if (activeNonDefaults.length > 0) {
    console.log('[Flags] Active overrides:', activeNonDefaults.join(', '));
  }

  return activeFlags;
}

/**
 * Get a flag value
 */
export function getFlag(flagName) {
  if (!(flagName in activeFlags)) {
    console.warn(`[Flags] Unknown flag: ${flagName}`);
    return false;
  }
  return activeFlags[flagName];
}

/**
 * Set a flag value at runtime
 */
export function setFlag(flagName, value) {
  if (!(flagName in DEFAULT_FLAGS)) {
    console.warn(`[Flags] Unknown flag: ${flagName}`);
    return false;
  }

  const oldValue = activeFlags[flagName];
  activeFlags[flagName] = Boolean(value);

  // Save to localStorage for persistence
  saveFlagsToStorage(activeFlags);

  console.log(`[Flags] ${flagName}: ${oldValue} → ${activeFlags[flagName]}`);

  // Trigger flag change event for live reload
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flagchange', {
      detail: { flagName, oldValue, newValue: activeFlags[flagName] }
    }));
  }

  syncDocumentFlagClasses(activeFlags);

  return true;
}

/**
 * Toggle a flag value
 */
export function toggleFlag(flagName) {
  return setFlag(flagName, !getFlag(flagName));
}

/**
 * Get all flags
 */
export function getAllFlags() {
  return { ...activeFlags };
}

/**
 * Reset all flags to defaults
 */
export function resetFlags() {
  activeFlags = { ...DEFAULT_FLAGS };
  saveFlagsToStorage(activeFlags);
  syncDocumentFlagClasses(activeFlags);
  console.log('[Flags] Reset to defaults');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flagsreset'));
  }
}

/**
 * Get flag metadata for debug panel
 */
export function getFlagMetadata() {
  return {
    defaults: { ...DEFAULT_FLAGS },
    active: { ...activeFlags },
    modified: Object.entries(activeFlags)
      .filter(([key, value]) => value !== DEFAULT_FLAGS[key])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
  };
}

/**
 * Export URL with current flags
 */
export function exportFlagURL() {
  const nonDefaults = Object.entries(activeFlags)
    .filter(([key, value]) => value !== DEFAULT_FLAGS[key]);

  if (nonDefaults.length === 0) {
    return window.location.origin + window.location.pathname;
  }

  const flagsParam = nonDefaults
    .map(([key, value]) => `${key}:${value}`)
    .join(',');

  return `${window.location.origin}${window.location.pathname}?flags=${flagsParam}`;
}
