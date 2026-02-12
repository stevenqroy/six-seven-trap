# Feature Flags System (S7R-001)

## Overview

The feature flags system provides runtime toggles for safe rollout and rollback of new features. All major upcoming systems are gated behind flags to enable:

- **Safe deployment**: Features can be enabled/disabled without code changes
- **Quick rollback**: Issues can be resolved by toggling flags
- **A/B testing**: Different flag configurations can be tested
- **Progressive rollout**: Features can be enabled gradually

## Usage

### Query String (Highest Priority)

Enable flags via URL parameters:

```
http://localhost:5173/?flags=debugMode:true,telemetry:1
```

Format: `?flags=flag1:value,flag2:value`
- Values: `true`/`false` or `1`/`0`

For deterministic replay runs (S7R-002), you can also provide a seed:

```
http://localhost:5173/?flags=deterministicRNG:true&seed=2026
```

`?seed=<number>` also forces deterministic RNG mode for that run.

### Console Commands

```javascript
// Get flag value
window.getFlag('debugMode')

// Set flag value
window.setFlag('debugMode', true)

// Toggle flag
window.toggleFlag('debugMode')

// Get all flags
window.getAllFlags()

// Reset to defaults
window.resetFlags()
```

### Debug Panel (Visual UI)

Access the debug panel:
- Keyboard: `Ctrl+Shift+D`
- Console: `window.toggleDebugPanel()`

Features:
- View all flags organized by phase
- Toggle individual flags
- Reset all flags
- Copy shareable URL with current flags
- Reload with current flags

### Accessibility Settings Panel (S7R-007)

When `accessibilitySettings` is enabled, the game exposes a Settings UI in HUD/Pause with:
- `Reduced Motion`
- `Low Graphics Mode`
- `Control Size` scaling (standard/large/extra large)
- `High Contrast UI`

Settings are applied immediately and persisted in localStorage under `s7r-accessibility-settings`.

### localStorage Persistence

Flags set via `setFlag()` are automatically persisted to localStorage and restored on page reload.

Priority: **defaults < localStorage < query string < runtime**

## Available Flags

### Phase 0: Infrastructure

| Flag | Ticket | Description |
|------|--------|-------------|
| `deterministicRNG` | S7R-002 | Use seeded RNG instead of Math.random() |
| `telemetry` | S7R-003 | Collect gameplay metrics |
| `debugMode` | — | General debug features |

### Phase 1: Mobile Runtime

| Flag | Ticket | Description |
|------|--------|-------------|
| `mobileSafeAreas` | S7R-005 | Safe area insets for notched devices |
| `gestureArbitration` | S7R-006 | Advanced gesture state machine |
| `accessibilitySettings` | S7R-007 | Settings panel with a11y options |
| `adaptiveQuality` | S7R-008 | Dynamic quality scaling |

### Phase 2: Enemy System

| Flag | Ticket | Description |
|------|--------|-------------|
| `enemyRegistry` | S7R-009 | New enemy manifest system |
| `enemyStateMachine` | S7R-011 | Generic enemy lifecycle |
| `placeholderRenderer` | S7R-012 | Procedural enemy visuals |
| `waveDirector` | S7R-013 | Threat-budgeted spawning |
| `spawnValidator` | S7R-014 | Fairness validation |

### Phase 3: Enemy Pack Alpha

| Flag | Ticket | Description |
|------|--------|-------------|
| `enemySkimmer` | S7R-015 | Skimmer enemy |
| `enemyRamBrute` | S7R-016 | Ram Brute enemy |
| `enemyShieldOrbiter` | S7R-017 | Shield Orbiter enemy |
| `enemyHarvester` | S7R-018 | Harvester enemy |
| `enemySplitter` | S7R-019 | Splitter enemy |
| `enemyEMPDrone` | S7R-020 | EMP Drone enemy |

### Phase 4: Enemy Pack Beta

| Flag | Ticket | Description |
|------|--------|-------------|
| `enemySniperPrism` | S7R-021 | Sniper Prism enemy |
| `enemyBomberArc` | S7R-022 | Bomber Arc enemy |
| `enemyRiftWarper` | S7R-023 | Rift Warper enemy |
| `enemyNecroCollector` | S7R-024 | Necro Collector enemy |
| `enemyCommanderBeacon` | S7R-025 | Commander Beacon enemy |
| `enemyMimicCaster` | S7R-026 | Mimic Caster enemy |
| `enemySynergyRules` | S7R-027 | Enemy combination rules |
| `unifiedTelegraph` | S7R-028 | Consistent telegraph standard |
| `damageMatrix` | S7R-029 | Typed damage interactions |
| `rewardEconomy` | S7R-030 | Drop economy system |
| `miniBosses` | S7R-031 | Elite enemy variants |
| `mothershipRewrite` | S7R-032 | Boss phase rewrite |

### Phase 5: Player Counterplay

| Flag | Ticket | Description |
|------|--------|-------------|
| `focusMode` | S7R-033 | Precision movement mode |
| `panicClear` | S7R-034 | Emergency clear ability |
| `abilityRebalance` | S7R-035 | Economy rebalancing |
| `dynamicDirector` | S7R-036 | Adaptive difficulty |

### Phase 6: Guardian Command

| Flag | Ticket | Description |
|------|--------|-------------|
| `actionBar` | S7R-046 | Action button UI |
| `actionInputArbitration` | S7R-047 | Multi-touch move+action |
| `guardianActiveMoves` | S7R-048 | Direct combat abilities |
| `commandEnergy` | S7R-049 | Summon energy system |
| `supportFramework` | S7R-050 | Support unit runtime |
| `supportMedicFirefly` | S7R-051 | Medic support unit |
| `supportBulwarkBot` | S7R-052 | Bulwark support unit |
| `supportStrikerHawk` | S7R-053 | Striker support unit |

### Phase 7: App Productization

| Flag | Ticket | Description |
|------|--------|-------------|
| `mobileLifecyclePolish` | S7R-037 | App background/foreground |
| `pwaFoundation` | S7R-038 | PWA installability |
| `capacitorWrappers` | S7R-039 | Native app wrappers |

## Implementation Pattern

### Using Flags in Code

```javascript
import { getFlag } from './config/flags.js';

// Check flag before using feature
if (getFlag('enemyRegistry')) {
  // Use new enemy system
  spawnFromRegistry();
} else {
  // Use legacy system
  spawnLegacy();
}
```

### Feature Flag Checklist

When adding a new feature behind a flag:

1. ✅ Add flag to `DEFAULT_FLAGS` in `src/config/flags.js`
2. ✅ Document flag in this README
3. ✅ Add unit tests for flag-gated code paths
4. ✅ Add integration test for flag toggle
5. ✅ Test with flag both enabled and disabled
6. ✅ Verify no runtime crashes when toggling

## Testing

### Run Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Requirements (per S7R-001)

- ✅ Game runs with all flags at default values
- ✅ Each flag can toggle without runtime crash
- ✅ Unit tests validate flag object shape
- ✅ Integration tests validate boot with toggled flags

## Architecture

### Files

```
src/
  config/
    flags.js           # Core flag system
    debug-panel.js     # Visual debug UI
tests/
  unit/
    config/
      flags.test.js    # Unit tests
  integration/
    flags-boot.test.js # Integration tests
```

### Event System

The flags system emits custom events:

```javascript
// Flag changed
window.addEventListener('flagchange', (e) => {
  console.log(e.detail); // { flagName, oldValue, newValue }
});

// Flags reset
window.addEventListener('flagsreset', () => {
  console.log('Flags reset to defaults');
});
```

## Best Practices

### Do ✅

- **Default to false**: All flags should default to false (stable state)
- **Document usage**: Update this README when adding flags
- **Test both paths**: Test code with flag on and off
- **Clean rollback**: Ensure disabling flag doesn't break game
- **Use descriptive names**: Flag names should be self-documenting

### Don't ❌

- **Don't hardcode**: Never hardcode flag checks, always use `getFlag()`
- **Don't assume**: Don't assume flags persist across sessions in code
- **Don't nest deeply**: Avoid complex nested flag logic
- **Don't forget cleanup**: Remove flag checks when feature is stable
- **Don't skip tests**: Every flag needs test coverage

## Rollback Procedure

If a feature causes issues in production:

1. **Immediate**: Toggle flag to `false` via query string
2. **Communicate**: Share rollback URL with team/users
3. **Investigate**: Debug with flag disabled
4. **Fix**: Resolve issue behind flag
5. **Re-enable**: Test thoroughly before re-enabling

Example rollback URL:
```
https://game.example.com/?flags=problematicFeature:false
```

## Migration Path

Once a feature is stable and proven:

1. Remove flag checks from code
2. Remove flag from `DEFAULT_FLAGS`
3. Update this documentation
4. Archive flag in git history for reference

## S7R-001 Acceptance Criteria

- ✅ `src/config/flags.js` created
- ✅ Runtime debug panel implemented
- ✅ Rollback toggles for all major systems
- ✅ Game runs with all flags at default values
- ✅ Each flag toggleable without crash
- ✅ Unit tests for default flag object shape
- ✅ Integration tests for boot with toggled flags
