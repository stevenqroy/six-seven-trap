# Six Seven Ranch: Implementation Plan (Mobile + App + Enemy Expansion)

## 1. Mission
Transform the current browser game into a mobile-first arcade action game with:
1. A large enemy roster with distinct, readable abilities.
2. Strong player counterplay and fairness guarantees.
3. Deterministic balancing and full automated test coverage.
4. Installable mobile delivery (PWA first) and app packaging (Capacitor).

## 2. Non-Negotiable Requirements
1. Every ticket must be testable locally.
2. Every ticket must be validated on phone layouts (iPhone Safari + Android Chrome).
3. No major feature ships without a feature flag.
4. No gameplay logic depends on final art assets; placeholders are required first.
5. No merge without passing `npm run verify:local` and `npm run test:all`.

## 3. Team Lanes (Parallel Work)
1. Lane A: Core gameplay and systems.
2. Lane B: Mobile UI, controls, and accessibility.
3. Lane C: Enemy content and boss behaviors.
4. Lane D: QA automation, deterministic simulation, and performance.
5. Lane E: App packaging and release pipeline.

## 4. Global Definition of Done (Applies to Every Ticket)
1. Scope implemented behind the appropriate feature flag (or intentionally replaces old path with rollback toggle).
2. Unit tests added for core logic paths.
3. Integration test added for cross-system behavior.
4. Manual mobile checks recorded in PR notes:
   - iPhone Safari portrait
   - iPhone Safari landscape
   - Android Chrome portrait
   - Android Chrome landscape
5. `npm run verify:local` passes.
6. `npm run test:all` passes.
7. Ticket acceptance criteria documented as pass/fail results.

## 5. Performance and Fairness Budgets
### 5.1 Performance Budgets
1. Target frame rate: 60 FPS.
2. Minimum acceptable sustained frame rate: 45 FPS on mid-tier phones under stress.
3. No frame-time spikes above 50ms for longer than 2 seconds.
4. Memory must remain bounded in 30-minute soak tests.

### 5.2 Fairness Budgets
1. Telegraph minimum warning windows enforced for all high-danger attacks.
2. Spawn validator guarantees at least one viable escape lane.
3. Post-hit grace and anti-chain-hit rules must prevent unavoidable life cascades.
4. Collision model must match visible hurtbox indicators.

## 6. Placeholder Art Strategy (Mandatory)
Create art-agnostic enemy architecture before final sprites:
1. Enemy definitions live in `src/assets/enemies/enemy-manifest.json`.
2. Rendering reads manifest data and uses procedural placeholder visuals.
3. Gameplay uses hitbox/hurtbox/ability anchors from manifest, not sprite dimensions.
4. Final sprite integration later updates manifest and asset files only.

Manifest fields:
1. `id`
2. `displayName`
3. `role` (harasser, tank, controller, summoner, support)
4. `stats` (hp, speed, size, threat)
5. `hurtbox`
6. `hitbox`
7. `anchors` (weapon, beam, core, exhaust)
8. `abilities`
9. `telegraphProfile`
10. `placeholderVisual` (shape, color palette, glow profile)

## 7. Enemy Roster and Ability Design Targets
1. Skimmer: high-speed lateral dash harassment.
2. Ram Brute: heavy windup charge with impact stun.
3. Shield Orbiter: rotating shield segments and gap timing.
4. Harvester: mini-tractor beams targeting 6/7 creatures.
5. Splitter: death-split behavior with strict recursion cap.
6. EMP Drone: pulse ring that slows/drains power.
7. Sniper Prism: long-line precision laser with strong telegraph.
8. Bomber Arc: parabolic mine lobber creating temporary denial zones.
9. Rift Warper: short teleports plus decoys.
10. Necro Collector: one-time revive of destroyed threats.
11. Commander Beacon: aura buff support unit.
12. Mimic Caster: weak copy of recent player ability archetype.

## 8. Phase Breakdown and Parallelization

## Phase 0: Delivery Infrastructure
Goal: deterministic, testable, rollback-safe foundation.
Tickets: `S7R-001` to `S7R-004`.
Parallelization:
1. `S7R-001` first (required foundation).
2. `S7R-002` and `S7R-004` can run simultaneously once `S7R-001` merges.
3. `S7R-003` starts after `S7R-002`.

### S7R-001 Program guardrails + feature flags
- Lane: A
- Estimate: 1 day
- Dependencies: none
- Deliverables:
  1. `src/config/flags.js`
  2. Runtime debug panel for active flags
  3. Rollback toggles for all major upcoming systems
- Implementation steps:
  1. Define default flag contract.
  2. Wire flag read access in `main.js` and state initialization.
  3. Add dev helper for toggling flags via querystring or console.
- Acceptance:
  1. Game runs with all flags default values.
  2. Each flag can toggle without runtime crash.
- Tests:
  1. Unit: default flag object shape.
  2. Integration: boot game with toggled flags.

### S7R-002 Deterministic RNG + seed replay
- Lane: A
- Estimate: 1.5 days
- Dependencies: S7R-001
- Deliverables:
  1. `src/utils/rng.js`
  2. Seeded random replacement in spawn and ability systems
  3. `runSeed` tracking in state and run logs
- Implementation steps:
  1. Implement pure deterministic RNG utility.
  2. Inject RNG access into systems previously using `Math.random()`.
  3. Add URL override `?seed=<number>`.
- Acceptance:
  1. Repeated seeded runs with same input produce same event sequence.
- Tests:
  1. Unit: sequence stability.
  2. Integration: seeded replay parity.

### S7R-003 Telemetry core
- Lane: D
- Estimate: 1.5 days
- Dependencies: S7R-002
- Deliverables:
  1. `src/systems/telemetry.js`
  2. Run metrics object
  3. End-of-run dump utility
- Implementation steps:
  1. Add event hooks for lives, abilities, damage, phase transitions.
  2. Add frame-time aggregation and percentile stats.
  3. Add safe dev output with no blocking side effects.
- Acceptance:
  1. Metrics are complete and update correctly during play.
- Tests:
  1. Unit: counters and ratio math.
  2. Integration: scripted run accumulates expected metrics.

### S7R-004 Test harness baseline
- Lane: D
- Estimate: 1 day
- Dependencies: S7R-001
- Deliverables:
  1. Unit, integration, e2e commands
  2. Baseline smoke e2e scenario
  3. One-command full validation
- Implementation steps:
  1. Add test scripts in `package.json`.
  2. Configure Vitest and Playwright.
  3. Add initial smoke suite.
- Acceptance:
  1. `npm run test:all` works locally.
- Tests:
  1. Deliberate failing test must block pipeline.

Phase 0 exit criteria:
1. Deterministic replay available.
2. Telemetry available.
3. Automated test harness operational.

---

## Phase 1: Mobile Runtime Baseline
Goal: guaranteed mobile playability before enemy expansion.
Tickets: `S7R-005` to `S7R-010`.
Parallelization:
1. `S7R-005` first.
2. `S7R-006` and `S7R-007` can overlap after `S7R-005`.
3. `S7R-008` and `S7R-010` can overlap after telemetry baseline is stable.

### S7R-005 Mobile-safe layout + safe areas
- Lane: B
- Estimate: 1.5 days
- Dependencies: Phase 0 complete
- Deliverables:
  1. Safe-area aware HUD and overlays
  2. Min touch target sizing
  3. Portrait and landscape alignment fixes
- Implementation steps:
  1. Add `env(safe-area-inset-*)` handling.
  2. Clamp typography and HUD blocks for narrow screens.
  3. Validate overlays and modals on mobile viewports.
- Acceptance:
  1. No clipped controls on notched devices.
- Tests:
  1. Visual snapshots by viewport class.

### S7R-006 Gesture arbitration state machine
- Lane: B
- Estimate: 2 days
- Dependencies: S7R-005
- Deliverables:
  1. Reliable gesture precedence for move/tap/double/hold/swipe
  2. Cancel-safe pointer lifecycle
- Implementation steps:
  1. Implement explicit gesture state chart.
  2. Ensure movement stream is never blocked.
  3. Resolve conflict windows and cancellation logic.
- Acceptance:
  1. No stuck input states after interruptions.
- Tests:
  1. Unit transition matrix.
  2. Integration conflict sequence playback.

### S7R-007 Settings + accessibility panel
- Lane: B
- Estimate: 1.5 days
- Dependencies: S7R-005
- Deliverables:
  1. Reduced motion
  2. Low graphics mode
  3. Control size scaling
  4. Persistent settings
- Implementation steps:
  1. Add settings UI and state persistence.
  2. Apply settings without restart.
  3. Add accessibility-safe colors and toggles.
- Acceptance:
  1. Settings persist across reload and app restarts.
- Tests:
  1. E2E persistence flow.

### S7R-008 Adaptive quality governor
- Lane: D
- Estimate: 2 days
- Dependencies: S7R-003
- Deliverables:
  1. Quality tiers with frame-time hysteresis
  2. Dynamic effect caps
- Implementation steps:
  1. Build rolling frame-time monitor.
  2. Add upgrade/downgrade thresholds.
  3. Clamp high-cost effects by tier.
- Acceptance:
  1. Sustained lag triggers graceful quality downgrade.
- Tests:
  1. Integration stress test with performance assertions.

### S7R-009 Enemy schema + registry
- Lane: A
- Estimate: 1.5 days
- Dependencies: Phase 1 baseline stable
- Deliverables:
  1. Enemy manifest schema
  2. Validation layer and registry loader
- Implementation steps:
  1. Define schema contract.
  2. Add manifest parser and validation errors.
  3. Integrate enemy registry into runtime state.
- Acceptance:
  1. Invalid manifest entries fail with clear diagnostics.
- Tests:
  1. Unit schema validation suite.

### S7R-010 Mobile benchmark harness
- Lane: D
- Estimate: 1.5 days
- Dependencies: S7R-008
- Deliverables:
  1. Deterministic stress benchmark scenario
  2. FPS and frame-time reporting output
- Implementation steps:
  1. Add benchmark script path.
  2. Define pass/fail thresholds.
  3. Emit machine-readable benchmark summary.
- Acceptance:
  1. Repeatable benchmark numbers across seeded runs.
- Tests:
  1. Integration benchmark command validation.

Phase 1 exit criteria:
1. Mobile layout and input are stable.
2. Adaptive performance controls are active.
3. Enemy schema foundation exists.

---

## Phase 2: Enemy Runtime and Placeholder Pipeline
Goal: scalable enemy architecture independent of final art.
Tickets: `S7R-011` to `S7R-014`.
Parallelization:
1. `S7R-011` and `S7R-012` can run simultaneously after schema lock.
2. `S7R-013` and `S7R-014` overlap after lifecycle API is defined.

### S7R-011 Enemy state machine framework
- Lane: A
- Estimate: 2 days
- Dependencies: S7R-009
- Deliverables:
  1. Generic enemy lifecycle engine
  2. Timed state transitions with recovery/fail-safe paths
- Implementation steps:
  1. Define lifecycle states and transition rules.
  2. Add timeout protections and dead-state cleanup.
  3. Plug runtime into main update loop.
- Acceptance:
  1. No enemy can remain in invalid state indefinitely.
- Tests:
  1. Unit transition tests.
  2. Soak integration for state safety.

### S7R-012 Placeholder renderer + animation + anchors
- Lane: C
- Estimate: 2 days
- Dependencies: S7R-009
- Deliverables:
  1. Procedural enemy visuals by type
  2. Placeholder animation curves
  3. Stable anchor system for VFX/projectiles
- Implementation steps:
  1. Implement shape and glow profiles per role.
  2. Add windup/active/recover animation signatures.
  3. Ensure anchors remain aligned across scaling.
- Acceptance:
  1. Enemy types are visually distinct without sprite assets.
- Tests:
  1. Snapshot and anchor stability tests.

### S7R-013 Wave director with threat budget
- Lane: A
- Estimate: 2 days
- Dependencies: S7R-011
- Deliverables:
  1. Threat-budgeted wave generation
  2. Role diversity constraints
- Implementation steps:
  1. Build budget calculator by phase.
  2. Add weighted enemy composition rules.
  3. Add anti-repeat pattern controls.
- Acceptance:
  1. Wave pressure remains within configured bounds.
- Tests:
  1. Simulation tests for budget and composition validity.

### S7R-014 Spawn fairness validator
- Lane: D
- Estimate: 2 days
- Dependencies: S7R-013
- Deliverables:
  1. Spawn exclusion zones
  2. Escape lane validation
  3. Reaction-time minimum constraints
- Implementation steps:
  1. Add geometry checks before spawn commit.
  2. Validate safe lanes per burst pattern.
  3. Enforce fallback spawn strategy if invalid.
- Acceptance:
  1. Automated Monte Carlo runs show zero unfair spawn patterns.
- Tests:
  1. 10k spawn simulation fairness suite.

Phase 2 exit criteria:
1. Enemy lifecycle system is stable.
2. Placeholder visuals/anchors are functional.
3. Threat and fairness control systems are active.

---

## Phase 3: Enemy Pack Alpha (6 enemies)
Goal: rapid content expansion with strong counterplay.
Tickets: `S7R-015` to `S7R-020`.
Parallelization:
1. Wave A: `S7R-015`, `S7R-016`, `S7R-017` in parallel.
2. Wave B: `S7R-018`, `S7R-019`, `S7R-020` in parallel after Wave A integration freeze.

### S7R-015 Skimmer
- Lane: C
- Estimate: 1.5 days
- Dependencies: S7R-011, S7R-012
- Behavior target: fast lateral dash pressure.
- Acceptance: dash telegraph and cooldown provide reliable dodge windows.
- Tests: telegraph timing + dash collision tests.

### S7R-016 Ram Brute
- Lane: C
- Estimate: 1.5 days
- Dependencies: S7R-011, S7R-012
- Behavior target: high-threat charge with capped stun.
- Acceptance: no chain-stun lockout conditions.
- Tests: stun duration, knockback, chain prevention tests.

### S7R-017 Shield Orbiter
- Lane: C
- Estimate: 2 days
- Dependencies: S7R-011, S7R-012
- Behavior target: rotating shield segments with gap-based counterplay.
- Acceptance: shield blocks only when segment intersects trajectory.
- Tests: block/pass-through geometry tests.

### S7R-018 Harvester
- Lane: C
- Estimate: 1.5 days
- Dependencies: S7R-013
- Behavior target: mini-tractor capture attempts on 6/7 creatures.
- Acceptance: capture is interruptible by player actions.
- Tests: capture start/cancel and rescue success tests.

### S7R-019 Splitter
- Lane: C
- Estimate: 1.5 days
- Dependencies: S7R-013
- Behavior target: split-on-death into weaker children.
- Acceptance: hard cap prevents runaway recursion.
- Tests: split cap and cleanup leak tests.

### S7R-020 EMP Drone
- Lane: C
- Estimate: 1.5 days
- Dependencies: S7R-013
- Behavior target: telegraphed EMP slow and power drain.
- Acceptance: anti-chain rules prevent prolonged control lock.
- Tests: overlap/cooldown fairness tests.

Phase 3 exit criteria:
1. Six enemy types are playable and distinct.
2. All high-danger behaviors are telegraphed.
3. No fairness budget violations in soak tests.

---

## Phase 4: Enemy Pack Beta + Boss Rewrite
Goal: complete roster and integrate full combat ecosystem.
Tickets: `S7R-021` to `S7R-032`.
Parallelization:
1. `S7R-021` to `S7R-023` in parallel.
2. `S7R-024` to `S7R-026` in parallel.
3. `S7R-028` and `S7R-029` can overlap.
4. `S7R-032` is critical-path and starts after synergy rules stabilize.

### S7R-021 Sniper Prism
- Lane: C
- Estimate: 1.5 days
- Dependencies: Phase 3
- Target: precision line laser with long warning.
- Tests: telegraph SLA tests.

### S7R-022 Bomber Arc
- Lane: C
- Estimate: 1.5 days
- Dependencies: Phase 3
- Target: ballistic mine zones with predictable decay.
- Tests: trajectory and area-expiry tests.

### S7R-023 Rift Warper
- Lane: C
- Estimate: 2 days
- Dependencies: Phase 3
- Target: teleport and decoy deception.
- Tests: decoy identification logic tests.

### S7R-024 Necro Collector
- Lane: C
- Estimate: 1.5 days
- Dependencies: Phase 3
- Target: one-time revive behavior with strict limits.
- Tests: revive constraints and state cleanup tests.

### S7R-025 Commander Beacon
- Lane: C
- Estimate: 1.5 days
- Dependencies: Phase 3
- Target: aura buffs and kill-priority gameplay.
- Tests: buff stack/clamp tests.

### S7R-026 Mimic Caster
- Lane: C
- Estimate: 2 days
- Dependencies: Phase 3
- Target: weak ability echo of player actions.
- Tests: mirrored ability limits and cooldown tests.

### S7R-027 Enemy synergy rules
- Lane: A
- Estimate: 1.5 days
- Dependencies: S7R-021 to S7R-026
- Target: block toxic enemy combinations and enforce role caps.
- Tests: generated-wave forbidden-combo validation tests.

### S7R-028 Unified telegraph standard
- Lane: B
- Estimate: 1.5 days
- Dependencies: S7R-021 to S7R-026 (functional)
- Target: consistent color, timing, and severity language for attacks.
- Tests: accessibility contrast checks and warning duration assertions.

### S7R-029 Damage and resistance matrix
- Lane: A
- Estimate: 2 days
- Dependencies: S7R-027
- Target: typed interactions between player abilities and enemy classes.
- Tests: matrix correctness and edge-case interaction tests.

### S7R-030 Reward and drop economy
- Lane: A
- Estimate: 1.5 days
- Dependencies: S7R-029
- Target: risk-weighted rewards and anti-farm controls.
- Tests: exploit simulation and reward balance tests.

### S7R-031 Mini-boss encounters
- Lane: C
- Estimate: 2 days
- Dependencies: S7R-027, S7R-029
- Target: elite enemy variants with paired ability patterns.
- Tests: encounter fairness and reliability tests.

### S7R-032 Mothership phase rewrite
- Lane: A
- Estimate: 3 days
- Dependencies: S7R-031
- Target: move boss logic entirely to enemy scheduler and phase ability pools.
- Tests: phase progression soak and no-regression tests.

Phase 4 exit criteria:
1. Full enemy roster implemented.
2. Boss phases run on unified framework.
3. Telegraph and fairness standards hold for all threats.

---

## Phase 5: Player Counterplay and Learning
Goal: ensure higher complexity remains playable.
Tickets: `S7R-033` to `S7R-036`.
Parallelization:
1. `S7R-033` and tutorial scaffolding in `S7R-036` can overlap.
2. Final balance in `S7R-035` requires near-complete enemy freeze.

### S7R-033 Focus mode + explicit hurtbox
- Lane: B
- Estimate: 1.5 days
- Dependencies: Phase 4 stable
- Target: precision movement and visible collision honesty.
- Tests: collision fairness regression pack.

### S7R-034 Panic clear ability
- Lane: A
- Estimate: 1.5 days
- Dependencies: S7R-033
- Target: emergency recovery tool for overload states.
- Tests: stress activation reliability and cooldown enforcement tests.

### S7R-035 Ability economy rebalance
- Lane: A
- Estimate: 2 days
- Dependencies: S7R-034
- Target: tune power gains/costs against expanded enemy pool.
- Tests: economy simulation and anti-exploit checks.

### S7R-036 Dynamic director + tutorial + practice
- Lane: A + B
- Estimate: 3 days
- Dependencies: S7R-035
- Target: adaptive difficulty and strong onboarding.
- Tests: low/high skill scripted traces and tutorial completion e2e.

Phase 5 exit criteria:
1. Counterplay tools are sufficient and readable.
2. New players can learn quickly via tutorial.
3. Difficulty adapts without instability.

---

## Phase 6: Guardian Command and Support Expansion
Goal: make the center character a high-agency commander with direct actions and summon support allies.
Tickets: `S7R-046` to `S7R-055`.
Parallelization:
1. `S7R-046` and `S7R-047` are sequential.
2. `S7R-048` is required before support runtime.
3. `S7R-049` is an optional side-path (feature-flagged), not a launch blocker.
4. `S7R-051`, `S7R-052`, and `S7R-053` run in parallel after `S7R-050`.
5. `S7R-054` and `S7R-055` are sequential.

### S7R-046 Action bar UI framework
- Lane: B
- Estimate: M
- Dependencies: S7R-036
- Target: mobile-safe bottom/side clickable action controls.
- Tests: hitbox, orientation, safe-area checks.

### S7R-047 Action input arbitration + move coexistence
- Lane: B
- Estimate: M
- Dependencies: S7R-046
- Target: multi-touch move + action concurrency without gesture conflicts.
- Tests: simultaneous touch sequence integration tests.

### S7R-048 Guardian active moves (Button-Mapped Existing Powers)
- Lane: A
- Estimate: L
- Dependencies: S7R-047
- Target: action bar routes to existing Shield, Projectile, and Slam systems with zero duplicate gameplay logic.
- Tests: routing, cooldown/cost consistency, and interaction tests.

### S7R-049 Command energy system
- Lane: A
- Estimate: M
- Dependencies: S7R-048
- Target: optional feature-flagged secondary economy; V1 default remains existing `power` meter.
- Tests: deterministic gating in default mode plus flagged command-energy mode.

### S7R-050 Support framework runtime
- Lane: A
- Estimate: M
- Dependencies: S7R-048
- Target: generic summon lifecycle and support AI base.
- Tests: lifecycle cleanup and pause/reset safety tests.

### S7R-051 Support unit: Medic Firefly
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Target: healing pulse support behavior.
- Tests: healing cap and cooldown tests.

### S7R-052 Support unit: Bulwark Bot
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Target: directional barrier support behavior.
- Tests: barrier mitigation interaction tests.

### S7R-053 Support unit: Striker Hawk
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Target: threat-priority dive-strike support behavior.
- Tests: AI target selection correctness tests.

### S7R-054 Guardian/support balancing pass
- Lane: A + D
- Estimate: M
- Dependencies: S7R-051, S7R-052, S7R-053
- Target: tune costs, cooldowns, uptime, and anti-trivialization caps.
- Tests: simulation and exploit checks.

### S7R-055 Retention telemetry and iteration checkpoint
- Lane: D
- Estimate: S
- Dependencies: S7R-054
- Target: KPI comparison report before moving to app packaging.
- Tests: data integrity and metric comparison checks.

Phase 6 exit criteria:
1. Center character has direct active command abilities.
2. Support summons are functional, balanced, and stable.
3. Retention MVP goals are measured before app packaging.

---

## Phase 7: App Productization
Goal: shipping path for mobile app distribution.
Tickets: `S7R-037` to `S7R-040`.
Parallelization:
1. `S7R-037` and `S7R-038` can run simultaneously.
2. `S7R-039` starts after `S7R-038`.

### S7R-037 Mobile controls + lifecycle polish
- Lane: B
- Estimate: 2 days
- Dependencies: Phase 6
- Target: robust touch control cluster and interruption-safe lifecycle handling.
- Tests: app background/foreground/manual interruption tests.

### S7R-038 PWA foundation
- Lane: E
- Estimate: 2 days
- Dependencies: Phase 6
- Target: installable PWA, offline shell, app-like startup.
- Tests: Lighthouse PWA checks and offline launch tests.

### S7R-039 Capacitor wrappers
- Lane: E
- Estimate: 2.5 days
- Dependencies: S7R-038
- Target: iOS/Android native wrappers with rendering/input parity.
- Tests: real-device install and gameplay smoke.

### S7R-040 Store and internal distribution pipeline
- Lane: E
- Estimate: 2 days
- Dependencies: S7R-039
- Target: signed builds, internal tracks, metadata completeness.
- Tests: signed artifact validation and installability checks.

Phase 7 exit criteria:
1. Browser install path (PWA) works.
2. Native app wrappers run on both platforms.
3. Internal distribution path is functional.

---

## Phase 8: Certification and Launch
Goal: high-confidence release and rollback readiness.
Tickets: `S7R-041` to `S7R-045`.
Parallelization:
1. `S7R-041` and `S7R-042` parallel.
2. `S7R-043` overlaps once wrappers are stable.
3. `S7R-045` is final non-parallel launch gate.

### S7R-041 Unit coverage expansion
- Lane: D
- Estimate: 2 days
- Dependencies: Phase 7
- Target: coverage focus for `core/`, `systems/`, enemy runtime.
- Tests: coverage threshold enforcement.

### S7R-042 Deterministic integration and soak suite
- Lane: D
- Estimate: 2.5 days
- Dependencies: Phase 7
- Target: 30-minute seeded soak tests with invariants.
- Tests: leak/stall/crash assertion suite.

### S7R-043 E2E mobile matrix + perf certification
- Lane: D
- Estimate: 2 days
- Dependencies: S7R-039
- Target: critical-path tests on browser and wrapped app + perf budgets.
- Tests: full matrix pass criteria.

### S7R-044 Closed beta telemetry tuning
- Lane: A + D
- Estimate: 2 days
- Dependencies: S7R-041 to S7R-043
- Target: tune based on real usage telemetry and fairness outcomes.
- Tests: KPI trend checks and regression comparisons.

### S7R-045 Release candidate + rollback playbook
- Lane: E + A
- Estimate: 1.5 days
- Dependencies: S7R-044
- Target: RC freeze, rollback drill, launch checklist signoff.
- Tests: dry-run rollback and post-release smoke.

Phase 8 exit criteria:
1. All quality gates pass.
2. KPIs are acceptable.
3. Rollback path is proven.

---

## 9. V1 Delivery Track (Small Team / Fast Validation)
This is the recommended execution path for solo or small-team delivery. It prioritizes a shippable mobile vertical slice before full framework scale-out.

### 9.1 Why this V1 Track Exists
1. The full 55-ticket plan is production-complete but heavy for small teams.
2. Shipping a polished mobile core loop and validating fun/retention early reduces risk.
3. Full enemy framework expansion proceeds only after playtest evidence supports it.

### 9.2 V1 Design Decisions
1. `S7R-006` is treated as implemented baseline and only reopened for targeted polish/regressions.
2. Guardian action buttons map to existing powers first (no duplicate ability logic).
3. New `Command Energy` is deferred until post-playtest unless existing `power` meter proves insufficient.
4. Start with 2 hand-authored new enemies (`Skimmer`, `Harvester`) before full 12-enemy framework rollout.
5. PWA installability is pulled earlier to accelerate test distribution.
6. V1 enemies must use a lightweight reusable contract to avoid throwaway code:
   - Required methods: `id`, `spawn(ctx)`, `update(dt, state)`, `draw(ctx)`, `destroy()`.
   - Optional hooks: `onHit(payload)`, `serializeDebug()`.
7. **Progressive Extraction Rule**: Every ticket that modifies `src/main.js` must leave it shorter than it found it. Extract logic into the appropriate module as part of the ticket scope. No ticket may add net lines to the monolith.

### 9.3 V1 Sequential Priority (Canonical)
1. S7R-001
2. S7R-002
3. S7R-003
4. S7R-004
5. S7R-005
6. S7R-007
7. S7R-008
8. S7R-010
9. S7R-046
10. S7R-047
11. S7R-048
12. S7R-050
13. S7R-051
14. S7R-053
15. S7R-018 (V1 Lean Harvester)
16. S7R-015 (V1 Lean Skimmer)
17. S7R-038
18. V1-PLAYTEST-GATE-1
19. S7R-054
20. S7R-055
21. V1-PLAYTEST-GATE-2

### 9.4 V1 Playtest Gates
#### V1-PLAYTEST-GATE-1
Run after first mobile slice with action buttons + 2 enemies + PWA.
Pass criteria:
1. Median session length improves by >= 15% versus pre-V1 baseline.
2. At least 60% of runs use >= 2 action buttons.
3. Fairness complaints in structured test feedback are below 20% of testers.
4. No major mobile input blockers.

If gate fails:
1. Pause framework expansion.
2. Run one focused tuning sprint.
3. Re-run gate before continuing.

#### V1-PLAYTEST-GATE-2
Run after balancing and support stabilization.
Pass criteria:
1. Runs per session improves by >= 25% versus pre-V1 baseline.
2. Ability usage diversity >= 4 per run on average.
3. No crash/softlock during 20-minute seeded soak.

If gate passes:
1. Continue to app packaging and broad certification.
2. Schedule full framework expansion (Phase 2/3/4 deeper rollout) as Phase X.

### 9.5 Deferred Until After V1 Validation
These remain in backlog but should not block V1 ship:
1. Full enemy framework scale (`S7R-021` to `S7R-032` beyond needed subset).
2. Meta-retention systems (daily/weekly challenges, unlock track expansion).
3. Separate command-energy economy if power-meter model remains sufficient.

### 9.6 V1 Enemy Contract and Migration Guardrail
To keep V1 enemy work reusable for later framework rollout:
1. Implement V1 Skimmer/Harvester behind a minimal adapter:
   - `src/game-objects/v1-enemies/skimmer.js`
   - `src/game-objects/v1-enemies/harvester.js`
   - `src/game-objects/v1-enemies/index.js`
2. V1 runtime only calls the shared contract methods, never enemy-specific globals.
3. Do not hardwire enemy logic directly into unrelated rendering/input code paths.
4. Add migration test:
   - Ensure V1 enemy modules can be wrapped into future registry/runtime without signature changes.
5. Required acceptance before leaving V1:
   - Both enemies run through same interface calls.
   - Enemy swap in/out requires no edits outside v1 enemy adapter entry point.

---

## 10. Ordered Ticket List (Full Program)
1. S7R-001
2. S7R-002
3. S7R-003
4. S7R-004
5. S7R-005
6. S7R-006
7. S7R-007
8. S7R-008
9. S7R-009
10. S7R-010
11. S7R-011
12. S7R-012
13. S7R-013
14. S7R-014
15. S7R-015
16. S7R-016
17. S7R-017
18. S7R-018
19. S7R-019
20. S7R-020
21. S7R-021
22. S7R-022
23. S7R-023
24. S7R-024
25. S7R-025
26. S7R-026
27. S7R-027
28. S7R-028
29. S7R-029
30. S7R-030
31. S7R-031
32. S7R-032
33. S7R-033
34. S7R-034
35. S7R-035
36. S7R-036
37. S7R-046
38. S7R-047
39. S7R-048
40. S7R-049
41. S7R-050
42. S7R-051
43. S7R-052
44. S7R-053
45. S7R-054
46. S7R-055
47. S7R-037
48. S7R-038
49. S7R-039
50. S7R-040
51. S7R-041
52. S7R-042
53. S7R-043
54. S7R-044
55. S7R-045

## 11. Suggested PR Checklist Template
Use this exact checklist in each ticket PR:
1. Feature flag present or rollback path documented.
2. Acceptance criteria listed and marked pass/fail.
3. Unit tests added/updated.
4. Integration tests added/updated.
5. Mobile manual test notes added for iPhone + Android, portrait + landscape.
6. `npm run verify:local` output attached.
7. `npm run test:all` output attached.
8. Performance impact note included.
9. Follow-up risks listed.


---

## 12. Definition of Ready (DoR) for Every Ticket
A ticket is not allowed to start until all items below are complete.

1. Scope locked:
   - One clear objective statement.
   - Explicit non-goals.
2. Dependencies verified:
   - Required predecessor tickets are merged.
   - Required flags/config keys exist.
3. File map listed:
   - Exact files to edit/create.
   - No hidden cross-cutting work.
4. Test plan drafted:
   - Unit test names and assertions listed.
   - Integration scenario listed.
   - Manual mobile test steps listed.
5. Rollback defined:
   - Flag name or commit rollback strategy documented.
6. Acceptance criteria measurable:
   - Binary pass/fail outcomes.
   - Numeric thresholds where applicable.

### DoR Template
Use this in each ticket body before implementation:

```md
## Definition of Ready
- Objective:
- Non-goals:
- Dependencies:
- Files touched:
- Feature flag / rollback:
- Unit tests to add:
- Integration tests to add:
- Mobile manual checks:
- Acceptance criteria:
```

---

## 13. Sizing, Ownership, and Parallelization Map

### 13.1 Size Scale
1. `XS`: <= 0.5 day
2. `S`: 1 day
3. `M`: 1.5 to 2 days
4. `L`: 2.5 to 3 days
5. `XL`: > 3 days (split required)

### 13.2 Owner Model
1. Lane A owner: Core gameplay systems engineer.
2. Lane B owner: Mobile/input/UI engineer.
3. Lane C owner: Enemy content engineer.
4. Lane D owner: QA/perf automation engineer.
5. Lane E owner: App/release engineer.

### 13.3 Ticket Size and Lane Summary
1. Phase 0:
   - S7R-001 (S, Lane A)
   - S7R-002 (M, Lane A)
   - S7R-003 (M, Lane D)
   - S7R-004 (S, Lane D)
2. Phase 1:
   - S7R-005 (M, Lane B)
   - S7R-006 (M, Lane B)
   - S7R-007 (M, Lane B)
   - S7R-008 (M, Lane D)
   - S7R-009 (M, Lane A)
   - S7R-010 (M, Lane D)
3. Phase 2:
   - S7R-011 (M, Lane A)
   - S7R-012 (M, Lane C)
   - S7R-013 (M, Lane A)
   - S7R-014 (M, Lane D)
4. Phase 3:
   - S7R-015 (M, Lane C)
   - S7R-016 (M, Lane C)
   - S7R-017 (M, Lane C)
   - S7R-018 (M, Lane C)
   - S7R-019 (M, Lane C)
   - S7R-020 (M, Lane C)
5. Phase 4:
   - S7R-021 (M, Lane C)
   - S7R-022 (M, Lane C)
   - S7R-023 (M, Lane C)
   - S7R-024 (M, Lane C)
   - S7R-025 (M, Lane C)
   - S7R-026 (M, Lane C)
   - S7R-027 (M, Lane A)
   - S7R-028 (M, Lane B)
   - S7R-029 (M, Lane A)
   - S7R-030 (M, Lane A)
   - S7R-031 (M, Lane C)
   - S7R-032 (L, Lane A)
6. Phase 5:
   - S7R-033 (M, Lane B)
   - S7R-034 (M, Lane A)
   - S7R-035 (M, Lane A)
   - S7R-036 (L, Lane A+B)
7. Phase 6:
   - S7R-046 (M, Lane B)
   - S7R-047 (M, Lane B)
   - S7R-048 (L, Lane A)
   - S7R-049 (M, Lane A)
   - S7R-050 (M, Lane A)
   - S7R-051 (M, Lane C)
   - S7R-052 (M, Lane C)
   - S7R-053 (M, Lane C)
   - S7R-054 (M, Lane A+D)
   - S7R-055 (S, Lane D)
8. Phase 7:
   - S7R-037 (M, Lane B)
   - S7R-038 (M, Lane E)
   - S7R-039 (L, Lane E)
   - S7R-040 (M, Lane E)
9. Phase 8:
   - S7R-041 (M, Lane D)
   - S7R-042 (L, Lane D)
   - S7R-043 (M, Lane D)
   - S7R-044 (M, Lane A+D)
   - S7R-045 (M, Lane E+A)

### 13.4 Simultaneous Work Rules
1. Max 3 concurrent tickets per phase unless explicitly approved.
2. Never parallelize two tickets that mutate the same core loop block in `src/main.js` without an integrator plan.
3. Enemy tickets in Phase 3 and 4 must merge in waves:
   - Wave 1 branches off same baseline.
   - Wave 1 integrates and stabilizes.
   - Wave 2 starts from stabilized baseline.
4. Each parallel wave must include one daily integration branch validation run:
   - `npm run verify:local`
   - `npm run test:all`
5. **Progressive Extraction**: Every ticket touching `src/main.js` must extract at least as many lines as it adds. The monolith must shrink monotonically toward zero over the V1 track. PR reviewers should verify net line delta is negative or zero.

### 13.5 Session Handoff Protocol
When a session runs out of context or hands off to another worker (Claude Code ↔ Codex, Opus ↔ Sonnet):
1. The outgoing session must leave a summary of: current ticket, files modified, what remains, and any blockers.
2. The incoming session must read this plan document and the referenced ticket before starting work.
3. File ownership rule: only one worker modifies `src/main.js` at a time. Other modules can be worked in parallel if they don't share imports being restructured.
4. After each session, run `npm run dev` to verify the game still boots and plays correctly.

---

## 14. Ticket-Level Test Detail Requirements

### 14.1 Unit Test Minimums by Ticket Type
1. Input/controls tickets:
   - State transition tests.
   - Timing threshold tests.
   - Cancellation/reset tests.
2. Enemy ability tickets:
   - Telegraph timing tests.
   - Cooldown/state machine tests.
   - Damage/collision correctness tests.
3. Economy/balance tickets:
   - Formula correctness tests.
   - Clamp/bound tests.
   - Anti-exploit rule tests.
4. App/runtime tickets:
   - Lifecycle transition tests.
   - Settings persistence tests.
   - Startup path tests.

### 14.2 Integration Test Minimums by Ticket Type
1. Gameplay system tickets:
   - 30-90 second deterministic simulation asserting no invalid states.
2. Enemy tickets:
   - Spawn + ability execution path with seeded timeline assertions.
3. Mobile tickets:
   - Input replay sequence with orientation changes.
4. Performance tickets:
   - Stress scene with threshold assertions.

### 14.3 E2E Minimum Scenarios
1. Launch -> title -> start -> gameplay loop active.
2. Pause -> resume -> continue simulation.
3. Lose condition flow and restart.
4. Win condition flow and return to title.
5. Settings persistence across reload.
6. Mobile controls basic ability activation.

### 14.4 Manual Mobile QA Checklist (Required in every PR)
1. iPhone Safari portrait:
   - HUD readable
   - touch controls usable
   - no scroll or browser gesture conflict
2. iPhone Safari landscape:
   - safe-area not clipped
   - controls reachable
3. Android Chrome portrait:
   - no input lag spikes
   - overlays positioned correctly
4. Android Chrome landscape:
   - gameplay area not obscured
   - no stuck gestures after rotation

---

## 15. Critical Path and Integration Gates

### 15.1 Critical Path Tickets
1. S7R-001
2. S7R-002
3. S7R-004
4. S7R-005
5. S7R-006
6. S7R-009
7. S7R-011
8. S7R-013
9. S7R-014
10. S7R-016
11. S7R-027
12. S7R-032
13. S7R-035
14. S7R-046
15. S7R-047
16. S7R-048
17. S7R-050
18. S7R-051
19. S7R-052
20. S7R-053
21. S7R-054
22. S7R-055
23. S7R-039
24. S7R-043
25. S7R-045

### 15.2 Integration Gates
1. Gate A (after Phase 0): deterministic + tests + flags all green.
2. Gate B (after Phase 1): mobile baseline + performance governor green.
3. Gate C (after Phase 2): enemy runtime stable + fairness validator green.
4. Gate D (after Phase 4): full roster + boss rewrite green.
5. Gate E (after Phase 5): player counterplay and onboarding green.
6. Gate F (after Phase 6): guardian command and support expansion green.
7. Gate G (after Phase 7): PWA + native wrappers green.
8. Gate H (release): certification + rollback drill complete.

---

## 16. Balancing Baseline Sheet (Initial Values)
All values are starting points for iterative tuning using telemetry.

### 16.1 Core Combat Baseline
1. Player lives start: 3
2. Max lives: 5
3. Invulnerability after hit: 1.5 to 2.0 seconds
4. Focus mode speed multiplier: 0.45 to 0.60
5. Panic clear cooldown: 10 to 16 seconds
6. Panic clear charges: 1 to 2 per run segment

### 16.2 Economy Baseline
1. Power gain per successful save bounce: 2.5 to 4.0
2. Shield cost: 20 to 30
3. Projectile cost: 10 to 20
4. Magnet drain/sec: 8 to 14
5. Slam cost: 35 to 50
6. Ultimate trigger: 100

### 16.3 Enemy Threat Baseline
1. Max simultaneous high-danger telegraphed attacks: 2
2. Max simultaneous controller/support enemy count: 2
3. Spawn burst interval floor: 700ms
4. Telegraph minimum for lethal attacks: 450ms
5. Telegraph minimum for major area denial: 650ms

### 16.4 Performance Baseline
1. Particle cap high tier: 450
2. Particle cap low tier: 180
3. Laser/beam segment cap low tier: 50% of high tier
4. Dynamic quality downgrade trigger: > 24ms average frame time over 2 seconds
5. Dynamic quality upgrade trigger: < 18ms average frame time over 4 seconds

---

## 17. Numeric KPI Gates by Phase

### Phase 0 KPI Gate
1. Deterministic replay mismatch rate: 0% for identical seed/input runs.
2. Test command reliability: 100% pass/fail correctness.

### Phase 1 KPI Gate
1. Mobile baseline FPS: >= 45 in stress, >= 55 in normal gameplay.
2. Input error incidents (stuck gesture reports): 0 in QA checklist run.

### Phase 2 KPI Gate
1. Spawn fairness violations in simulation: 0.
2. Enemy state machine invalid state count: 0.

### Phase 3 KPI Gate
1. Each new enemy has at least 1 validated counterplay route.
2. Unavoidable-hit bug reports in structured QA: <= 1 per enemy and must be fixed before next phase.

### Phase 4 KPI Gate
1. Full-wave simulation crash/softlock count: 0.
2. Critical-path phase completion in test runs: >= 95% without scripting errors.

### Phase 5 KPI Gate
1. New player tutorial completion rate (test cohort): >= 80%.
2. Median first-run survival time increase vs current baseline: >= 30%.

### Phase 6 KPI Gate
1. Action bar ability usage in playtests: >= 70% of runs use at least 3 direct actions.
2. Summon usage in playtests: >= 40% of runs.
3. Median runs per session increase vs pre-Phase-6 baseline: >= 20%.

### Phase 7 KPI Gate
1. PWA install success in test devices: 100%.
2. Native wrapper smoke pass rate across test devices: 100%.

### Phase 8 KPI Gate
1. 30-minute soak crash rate: 0.
2. Average FPS on target devices during stress: >= 45.
3. Closed beta fairness score (survey): >= 4.0/5.

---

## 18. Player Retention Mechanisms (What Keeps People Playing)
Primary answer: players stay when challenge feels fair, progress feels meaningful, and each run offers novel but readable decisions.

### 18.1 Core Retention Loop
1. Immediate fun loop:
   - High-feedback interactions every few seconds.
   - Strong visual/audio response for successful saves.
2. Mastery loop:
   - Skills learned in one run are clearly useful in the next.
   - Telegraph readability rewards pattern recognition.
3. Progression loop:
   - Meta progression or unlock tracks provide long-term goals.
4. Variety loop:
   - Enemy combinations and phase patterns change run-to-run.
5. Recovery loop:
   - Panic/focus/smart counters prevent runs from feeling hopeless.

### 18.2 Retention Features to Add in This Project
1. Session goals:
   - Daily/weekly challenge cards with clear objectives.
2. Unlock track:
   - Cosmetic and minor gameplay modifier unlocks (non-pay-to-win).
3. Milestone rewards:
   - Rewards at survival and rescue thresholds.
4. Streak incentives:
   - Bonus scoring and flair for no-hit or high-save streaks.
5. Comeback mechanics:
   - Controlled recovery windows after major mistakes.
6. Clear next objective:
   - Post-run summary tells player exactly what to improve.

### 18.3 Retention Telemetry to Monitor
1. Day-1 return rate.
2. Average session length.
3. Runs per session.
4. Time-to-first-frustration event.
5. Drop-off point by boss phase.
6. Ability usage diversity per run.
7. Tutorial completion and retry rates.

### 18.4 Anti-Retention Pitfalls to Avoid
1. Unreadable deaths.
2. Overlong downtime between meaningful interactions.
3. Repetitive wave compositions without novelty.
4. Excessive visual noise obscuring danger telegraphs.
5. Inputs that feel inconsistent on touch devices.


---

## 19. Retention MVP Release Slice (Highest Impact First)
This section defines the smallest set of new systems that should materially increase retention and make the center character more active.

### 19.1 Retention MVP Goals
1. Increase average runs per session by >= 25% in internal test cohort.
2. Increase ability usage diversity to >= 4 distinct actions per run.
3. Reduce early churn (quits within first 3 minutes) by >= 20%.

### 19.2 Retention MVP Features (Ship in this exact order)
1. `MVP-1` Guardian Action Bar:
   - Bottom/side clickable controls for powers.
   - Clear cooldown and charge visualization.
2. `MVP-2` Guardian Active Moves:
   - Center character gains direct actions beyond passive bouncing.
3. `MVP-3` Support Character Summons:
   - Temporary helpers with distinct tactical roles.
4. `MVP-4` Rescue Streak Rewards:
   - Increasing reward cadence for successful save chains.
5. `MVP-5` Post-Run Goal Prompt:
   - One specific next objective shown after each run.

### 19.3 MVP Exit Criteria
1. New players can trigger at least 3 powers using on-screen controls without tutorial confusion.
2. Summon usage in test runs appears in >= 40% of sessions.
3. No measurable increase in input error rates on touch devices.

---

## 20. Center Character Expansion: Guardian Command System
The center character becomes an active commander with direct abilities and helper summons.

### 20.1 Input and UI Design (Mobile-First)
#### Control Layout
1. Bottom center cluster: 3 primary action buttons.
   - `Shield Pulse`
   - `Projectile Burst`
   - `Slam`
2. Bottom-right hold button:
   - `Focus` (precision movement while held)
3. Left-side vertical stack:
   - `Support 1`, `Support 2`, `Support 3`
4. Panic button:
   - Upper-right, larger target with safety delay (hold 200ms to confirm).

#### UI Rules
1. All action buttons minimum 52x52 CSS px on phone.
2. Cooldown is shown with radial wipe + numeric seconds.
3. Disabled buttons remain visible (state communicated, never removed).
4. No critical button may overlap safe-area insets.

#### Input Arbitration Rules
1. Drag input for movement remains highest priority stream.
2. Button press areas consume touch events only inside button bounds.
3. Multi-touch allowed:
   - One finger move
   - One finger ability press
4. Gesture shortcuts remain optional but never required.

### 20.2 Guardian Active Ability Set
These are direct actions from the center character, not ship-wide passive effects.

1. `Shield Pulse`:
   - Short circular burst around guardian.
   - Pushes traps outward and interrupts light attacks.
   - Cost: medium energy.
2. `Projectile Burst`:
   - Fires 2-3 quick bolts upward with slight spread.
   - Strong against fragile enemy types.
   - Cost: low energy.
3. `Ground Slam`:
   - Shockwave ring from guardian origin.
   - Clears nearby traps and staggers heavy enemies briefly.
   - Cost: high energy.
4. `Tether Pull` (Phase 2 expansion):
   - Pull one selected 6/7 creature quickly to safety.
   - Cooldown-based utility move.
5. `Rally Cry` (Phase 2 expansion):
   - Temporary buff to save bounce strength and score multiplier.

### 20.3 Support Character Summon System
Support units are temporary allies called by buttons. They are intentionally simple, readable, and tactical.

#### Shared Summon Rules
1. Summons consume `Command Energy` (separate from power meter).
2. Max concurrent supports: 1 at launch, 2 later if performance allows.
3. Summon duration: 8 to 14 seconds.
4. Each summon has a cooldown and role-specific effect.
5. Supports use placeholder visuals until final sprites are ready.

#### Support Units (Initial)
1. `Medic Firefly`:
   - Emits periodic heal pulse.
   - Can restore fractional life progress toward next heart.
2. `Bulwark Bot`:
   - Projects directional barrier toward beam source.
   - Reduces trap penetration near guardian.
3. `Striker Hawk`:
   - Performs periodic dive attacks on highest-threat enemy.
   - Best used to interrupt harvester/EMP/sniper enemies.

#### Support AI Rules
1. Supports choose targets using simple priority table:
   - Threat to 6/7 capture > threat to player > nearest hostile.
2. Supports cannot block visibility of telegraphs.
3. Supports auto-despawn cleanly on phase transitions and game reset.

### 20.4 New Resource: Command Energy (Optional After V1)
1. V1 default behavior: reuse existing `power` meter for summon gating.
2. Optional expansion path: enable separate `Command Energy` behind a feature flag after playtest validation.
3. If enabled, generate by successful rescues and streak milestones.
4. If enabled, spend on support summons and high-tier command actions.
5. If enabled, display dedicated bar near support buttons.

### 20.5 Balance and Abuse Prevention
1. No summon may hard-counter all enemy types.
2. Summon uptime cap enforced per minute.
3. Support effects scale down when two supports are active (future mode).
4. Summons cannot trigger victory states directly; they enable player success.

### 20.6 Technical Implementation Notes
1. Add `src/systems/command.js`:
   - command energy logic, summon cooldowns, activation gating.
2. Add `src/game-objects/supports.js`:
   - spawn, update, draw, despawn for support units.
3. Add `src/ui/action-bar.js`:
   - hit zones, button state, cooldown rendering data.
4. Add manifest entries for support placeholders:
   - `src/assets/enemies/enemy-manifest.json` and new `src/assets/support/support-manifest.json`.
5. Keep all support behavior deterministic under seeded runs.

### 20.7 Testing Requirements for Guardian Command System
1. Unit tests:
   - command energy generation/spend clamps.
   - cooldown timers and activation validity.
   - summon lifecycle transitions.
2. Integration tests:
   - movement + button press concurrency.
   - summon effects interacting with enemy abilities.
   - reset/pause/resume cleanup.
3. E2E tests:
   - activate all action buttons via touch.
   - summon each support during live encounter.
4. Manual mobile tests:
   - one-thumb and two-thumb playability checks.
   - no accidental button presses during movement.

---

## 21. New Tickets for Guardian and Support Expansion
These tickets are now promoted to critical path work and are part of formal Phase 6.
They execute after `S7R-036` and before app packaging (`S7R-037+`).

### S7R-046 Action bar UI framework
- Lane: B
- Estimate: M
- Dependencies: S7R-036
- Deliverables:
  1. Bottom/side button layout.
  2. Cooldown radial overlays.
  3. Touch-safe hit zones and safe-area support.
- Acceptance:
  1. Buttons are clickable on all mobile target layouts.
- Tests:
  1. UI hitbox tests and mobile orientation checks.

### S7R-047 Action input arbitration + move coexistence
- Lane: B
- Estimate: M
- Dependencies: S7R-046
- Deliverables:
  1. Multi-touch arbitration for movement + ability tap.
  2. Conflict-safe event routing.
- Acceptance:
  1. Player can move and trigger actions simultaneously.
- Tests:
  1. Integration sequence tests for simultaneous touches.

### S7R-048 Guardian active moves (Button-Mapped Existing Powers)
- Lane: A
- Estimate: L
- Dependencies: S7R-047
- Deliverables:
  1. Action bar buttons wired to existing Shield, Projectile, and Slam systems.
  2. Unified cooldown/cost handling (no duplicated gameplay logic).
- Acceptance:
  1. Buttons trigger existing systems reliably without introducing duplicate mechanics.
- Tests:
  1. Unit activation routing and cooldown/cost tests.
  2. Integration move+button concurrency and action interaction tests.

### S7R-049 Command energy system
- Lane: A
- Estimate: M
- Dependencies: S7R-048
- Deliverables:
  1. Summon gating hooks using existing `power` meter by default.
  2. Optional command-energy flag path for later validation.
- Acceptance:
  1. Summon economy works without forcing a second mandatory resource system.
- Tests:
  1. Unit gating and clamp tests for both default and optional flagged paths.

### S7R-050 Support framework runtime
- Lane: A
- Estimate: M
- Dependencies: S7R-048 (S7R-049 optional for flagged path)
- Deliverables:
  1. Generic summon lifecycle and AI targeting base.
  2. Spawn/despawn safety hooks for pause/reset/phase transitions.
- Acceptance:
  1. Supports never leak state across runs.
- Tests:
  1. Integration lifecycle and cleanup tests.

### S7R-051 Support unit: Medic Firefly
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Deliverables:
  1. Healing pulse support behavior.
- Acceptance:
  1. Healing rules obey caps and cooldowns.
- Tests:
  1. Unit healing cap tests.

### S7R-052 Support unit: Bulwark Bot
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Deliverables:
  1. Directional barrier support behavior.
- Acceptance:
  1. Barrier mitigates intended threat classes only.
- Tests:
  1. Integration barrier-interaction tests.

### S7R-053 Support unit: Striker Hawk
- Lane: C
- Estimate: M
- Dependencies: S7R-050
- Deliverables:
  1. Dive-strike support behavior with target priority.
- Acceptance:
  1. High-threat target preference works consistently.
- Tests:
  1. AI target selection tests.

### S7R-054 Guardian/support balancing pass
- Lane: A + D
- Estimate: M
- Dependencies: S7R-051, S7R-052, S7R-053
- Deliverables:
  1. Tuned costs, cooldowns, and uptime caps.
- Acceptance:
  1. Support system increases tactical depth without trivializing encounters.
- Tests:
  1. Simulation balancing and exploit checks.

### S7R-055 Retention telemetry and iteration checkpoint
- Lane: D
- Estimate: S
- Dependencies: S7R-054
- Deliverables:
  1. Retention KPI comparison report pre/post Guardian Command rollout.
- Acceptance:
  1. At least 2 of 3 Retention MVP goals achieved, otherwise tuning iteration required.
- Tests:
  1. Data verification and dashboard consistency checks.

### Ordered Insertion (Updated Sequence Segment)
Insert after existing `S7R-036`:
1. S7R-046
2. S7R-047
3. S7R-048
4. S7R-050
5. S7R-051
6. S7R-052
7. S7R-053
8. S7R-054
9. S7R-055
10. S7R-049 (optional, feature-flagged side path)

Then continue with existing app packaging tickets:
1. S7R-037
2. S7R-038
3. S7R-039
4. S7R-040
5. S7R-041
6. S7R-042
7. S7R-043
8. S7R-044
9. S7R-045
