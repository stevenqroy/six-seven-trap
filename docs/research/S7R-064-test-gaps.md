# S7R-064 Test Gap Audit

## TL;DR
The test suite covers core flag/input/support-runtime paths well, but 16 of 35 `src` modules have no direct test coverage and several high-risk gameplay modules (`main`, `shield`, `projectile`, `debug-panel`, `state`) still lack focused tests.

## Coverage Snapshot
- Modules scanned: `35` (`src/**/*.js`)
- Modules with direct test references: `19`
- Modules with no direct tests: `16`

| Module | Has Tests? | Missing Coverage | Priority |
|---|---|---|---|
| `src/config/accessibility-settings.js` | Yes (unit + integration) | Corrupt-but-valid JSON payloads, repeated `subscribe`/`unsubscribe` idempotency, non-browser guard behavior under partial globals | Medium |
| `src/config/debug-panel.js` | No | DOM render contract, keyboard toggle behavior, listener cleanup on repeated init/destroy, clipboard failure paths | High |
| `src/config/flags.js` | Yes | Query parsing edge cases for mixed casing/whitespace and non-boolean values; persistence failure fallback assertions | Low |
| `src/constants.js` | Partial (indirect only) | Contract tests for critical balances (costs/cooldowns/radii) to detect accidental tuning regressions | Medium |
| `src/core/input.js` | Yes | Pointer capture/release failures, `pointercancel` arbitration transitions, non-finite coordinate payloads | High |
| `src/core/run-rng.js` | No | Seed override precedence (`query` vs flag), deterministic/non-deterministic mode switching, draw-count reset per run | Medium |
| `src/enemies/harvester.js` | Yes | Draw-path resilience with malformed render context, destroy idempotency, bad target payloads during pull loop | Medium |
| `src/enemies/skimmer.js` | Yes | Multi-instance overwrite behavior (singleton), extreme profile values, stale target recovery during dash | Medium |
| `src/game-objects/projectile.js` | No | Collision behavior under large `dt`, projectile cap edge cases, color-theme bounds, expired trail cleanup | High |
| `src/game-objects/shield.js` | No | Cooldown/degradation lifecycle, impact burst triggers, quality-cap shadow behavior, particle count hard caps | High |
| `src/main.js` | No | End-to-end gameplay invariants (pause/reset/ability interactions), phase transitions, trap/spawn fairness regressions | High |
| `src/service-worker.js` | No | Offline fetch failures, cache version migration, non-static request bypass, opaque/500 response handling | Medium |
| `src/state.js` | No | Import-time side effects (`localStorage`, `window`) in non-browser environments, state shape invariants | High |
| `src/supports/medic-firefly.js` | Yes | Draw no-op behavior with invalid contexts, runtime recreation after external reset, pulse math under long frames | Medium |
| `src/supports/striker-hawk.js` | Yes | Mid-dive target invalidation, draw defensive guards, runtime disable/enable transitions | Medium |
| `src/systems/adaptive-quality.js` | Yes | Threshold jitter/hysteresis boundaries, unknown tier fallback behavior under noisy frame timing | Medium |
| `src/systems/enemy-registry.js` | Yes (integration-heavy) | Duplicate registration semantics, invalid enemy shape rejection, registry snapshot immutability | Medium |
| `src/systems/enemy-schema.js` | Yes (light) | Deep normalization edge cases (`NaN`, negatives, missing nested fields), migration/backward-compat paths | High |
| `src/systems/enemy-state-machine.js` | Yes | Invalid transition recovery counters, forced-despawn cleanup, malformed entity payload handling | High |
| `src/systems/lives.js` | No | Boundary cases (`lives=0`, negative `now`, extra-life thresholds, invincibility alpha bounds) | Medium |
| `src/systems/mobile-benchmark.js` | Yes | Unsupported API fallback coverage (`PerformanceObserver`, memory APIs), malformed UA/device data | Medium |
| `src/systems/power.js` | No | NaN/undefined state fields, negative/zero cost handling, drain under very large `dt` | High |
| `src/systems/progression.js` | No | Phase threshold boundaries, damage underflow, ratio clamping, effects mapping invariants | High |
| `src/systems/support-registry.js` | No | Duplicate unit ID behavior, invalid metadata normalization, snapshot immutability | Medium |
| `src/systems/support-runtime.js` | Yes | Enable/disable flips mid-frame, runtime ID monotonicity after reset, debug-state stability under churn | Medium |
| `src/systems/telemetry.js` | Yes (unit + integration) | High-volume event buffering, malformed payload sanitization, clock skew/negative duration handling | Medium |
| `src/ui/action-bar-config.js` | No | Config contract checks (unique IDs, required fields), static metadata drift detection | Low |
| `src/ui/action-bar.js` | Yes | Destroy idempotency, cooldown decrement with negative/zero delta, optional callback failure isolation | Medium |
| `src/ui/action-router.js` | Yes | Non-browser haptic guard paths, slam radius when dimensions missing, telemetry/usePower null contracts | Medium |
| `src/ui/hud-updates.js` | No | Missing-element fallback in browser runtime, pulse class toggle behavior, visibility toggles idempotency | Medium |
| `src/ui/settings-panel.js` | Yes (integration-only) | Unit tests for open/close/focus restore, disabled-mode gating, full destroy listener teardown | Medium |
| `src/utils/defensive.js` | No | Fallback semantics when fallback is negative/non-finite, clamp/lerp boundary assertions | Low |
| `src/utils/math.js` | No | Degenerate segment math, clamp bounds with inverted ranges, `edgeBiasedUnit` custom RNG bounds | Low |
| `src/utils/rng.js` | Yes | Seed parsing overflow, negative/invalid seed coercion, draw-count integrity over long runs | Low |
| `src/utils/sprite.js` | No | Null canvas context behavior, alpha sampling boundaries, cache behavior across repeated sprite transforms | Medium |

## Pattern Violations vs `medic-firefly` Baseline
`src/supports/medic-firefly.js` demonstrates defensive normalization, explicit lifecycle cleanup, and bounded runtime behavior. The following cross-module violations were found:

1. Defensive helpers are still duplicated instead of consistently importing `src/utils/defensive.js`.
Modules: `src/enemies/harvester.js`, `src/enemies/skimmer.js`, `src/supports/striker-hawk.js`, `src/systems/adaptive-quality.js`, `src/systems/enemy-state-machine.js`, `src/systems/telemetry.js`, `src/systems/support-runtime.js`, `src/systems/support-registry.js`.

2. Deterministic RNG policy is bypassed by direct `Math.random()` in gameplay modules.
Modules: `src/game-objects/shield.js`, `src/game-objects/projectile.js`.

3. Import-time side effects in state bootstrap reduce testability and environment safety.
Module: `src/state.js` (`localStorage` and `window` reads at module load).

4. Singleton runtime instances remain in enemy/support implementations, limiting multi-entity scalability and increasing hidden shared-state risk.
Modules: `src/enemies/harvester.js`, `src/enemies/skimmer.js`, `src/supports/medic-firefly.js`, `src/supports/striker-hawk.js`.

## Specific Test Cases to Add
### P0 / High-impact first
1. `tests/unit/game-objects/shield.test.js`
- `activateShield` respects cooldown and returns false while cooling down.
- `updateShield` emits ripple/impact transitions and expires at `SHIELD.DURATION_MS`.
- `drawShield` respects quality caps (`shadowBlurEnabled`, `maxShadowBlur`) and particle caps.

2. `tests/unit/game-objects/projectile.test.js`
- Spawn cap enforcement at `PROJECTILE.MAX_ACTIVE`.
- Collision/removal behavior under large `dt` and offscreen bounds.
- Trail length clamping and theme index bounds.

3. `tests/unit/systems/progression.test.js`
- `getPhaseForHP` boundary tests at each threshold.
- `updateBossPhase` sets `isVictory` only on first defeat transition.
- `getShipHPRatio` clamped for negative/overflow HP.

4. `tests/unit/systems/power.test.js`
- `canAfford/spendPower/drainPower` with invalid costs, invalid `dt`, and non-finite state values.
- `getPowerRatio` clamp behavior beyond `[0, POWER.MAX]`.

5. `tests/unit/config/debug-panel.test.js`
- `initDebugPanel` registers listeners once.
- `destroy` removes all listeners and DOM nodes across repeated init/destroy cycles.
- Keyboard shortcut and flag toggle rendering behavior.

### P1 / Medium-impact
6. `tests/unit/ui/hud-updates.test.js`
- Graceful fallback when required elements are missing.
- `updateLivesDisplay`, `updateShipHpBar`, `updatePowerBar` output boundaries.

7. `tests/unit/systems/lives.test.js`
- `loseLife` and `checkExtraLife` boundary behavior (`MAX_LIVES`, score repeats).
- `getInvincibilityAlpha` output range remains `[0.3, 1]` while invincible.

8. `tests/unit/systems/support-registry.test.js`
- Duplicate `id` overwrite behavior.
- Invalid inputs rejected cleanly.
- `getAllSupportUnits` snapshot immutability.

9. `tests/unit/core/run-rng.test.js`
- Deterministic seed override precedence.
- Draw count resets on `start()`.

10. `tests/unit/service-worker.test.js` (or integration harness)
- Cache-first static request behavior.
- Non-static bypass.
- Network failure fallback path.

11. `tests/unit/utils/sprite.test.js`
- Alpha sampling bounds.
- Null context guards.
- Cache hit behavior for repeated sprite requests.

12. `tests/unit/systems/enemy-schema.test.js` expansion
- Normalize malformed nested profile fields and ensure safe defaults.

13. `tests/unit/systems/enemy-state-machine.test.js` expansion
- Invalid lifecycle transition recovery and forced cleanup accounting.

### P2 / Contract hardening
14. `tests/unit/constants.contract.test.js`
- Freeze expected gameplay constants that should not drift silently.

15. `tests/unit/ui/action-bar-config.test.js`
- Validate button IDs are unique and required fields exist.

16. `tests/unit/utils/defensive.test.js` and `tests/unit/utils/math.test.js`
- Pure helper boundary behavior and degenerate inputs.

17. `tests/unit/ui/settings-panel.test.js`
- Unit-level listener cleanup and focus restore semantics (currently integration-only).
