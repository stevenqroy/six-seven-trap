# V1 Ticket Tracker

> **Single source of truth.** Every worker (Claude Code, Codex, Gemini) reads this before starting and updates it when done.
> Commit changes to this file on the working branch. Merge conflicts = discussion needed.

## Story

**Six Seven Ranch** — mobile-first arcade action game. V1 goal: shippable vertical slice with action buttons, 2 enemies, 2 support units, and PWA install. Validate fun and retention before expanding.

**V1 phases (where we are):**
- ~~Phase 0: Infrastructure~~ — flags, RNG, telemetry, test harness (done)
- ~~Phase 1: Mobile baseline~~ — safe areas, accessibility, adaptive quality (done)
- ~~Phase 2: Enemy runtime~~ — registry, state machine, harvester, skimmer (done)
- ~~Phase 6 subset: Commands + supports~~ — action bar, multi-touch, powers, support runtime, medic firefly, striker hawk (done)
- ~~PWA~~ — manifest + service worker (done)
- **NOW → Gate-1 playtest** — all features on, manual mobile test, validate session length + ability usage
- **NOW → Ability VFX** — shield sparkle/electric, slam push/shockwave, projectile trails/colors (S7R-071–073)
- Next → S7R-054 polish pass (tune costs, cooldowns, balance based on playtest)
- Next → S7R-055 launch prep (retention telemetry, iteration checkpoint)
- Next → Gate-2 playtest (runs/session, ability diversity, soak test)

**39 of 46 V1 tickets done (85%). 7 tickets + 2 gates remaining.**

## Status Key
- `done` — merged to main, verified
- `wip:worker` — in progress (e.g. `wip:codex`, `wip:claude`, `wip:gemini`)
- `review` — code written, ready for QA
- `reviewing` — QA in progress (Claude is actively reviewing)
- `next` — ready to pick up
- `blocked:XXX` — waiting on ticket XXX
- `skip` — not needed for V1

## Platform Assignment Rules
- **Claude Code** — tickets that touch `src/main.js`, have 2+ dependencies, or need cross-system wiring. Integration + QA hub.
- **Codex / Gemini** — self-contained modules with 0-1 dependencies already on `main`. Never touch `src/main.js`.
- **Dependency rule**: a ticket is only `next` if ALL its `Depends` are `done`. If not, it's `blocked:XXX`.
- **Parallel rule**: tickets with no shared `Depends` and no shared files can run simultaneously on different platforms.

## V1 Track (§9.3 Priority Order)

| # | Ticket | Name | Depends | Touches main.js? | Best platform | Status | Branch | Owner |
|---|--------|------|---------|-------------------|---------------|--------|--------|-------|
| 1 | S7R-001 | Feature flags + debug panel | — | yes | claude | done | main | — |
| 2 | S7R-002 | Deterministic RNG | S7R-001 | yes | claude | done | main | — |
| 3 | S7R-003 | Telemetry scaffold | S7R-001 | yes | claude | done | main | — |
| 4 | S7R-004 | Test harness | — | no | codex/gemini | done | main | — |
| 5 | S7R-005 | Mobile safe areas | S7R-001 | no (CSS only) | codex/gemini | done | main | — |
| 6 | S7R-007 | Accessibility settings | S7R-001 | yes | claude | done | main | — |
| 7 | S7R-008 | Adaptive quality | S7R-001 | yes | claude | done | main | — |
| 8 | S7R-010 | Enemy registry | S7R-001 | yes | claude | done | main | — |
| 9 | S7R-011 | Enemy state machine | S7R-010 | yes | claude | done | main | — |
| 10 | S7R-046 | Action button UI | — | yes | claude | done | main | claude |
| 11 | S7R-047 | Multi-touch move+action | S7R-046 | yes | claude | done | main | codex |
| 12 | S7R-048 | Button-mapped existing powers | S7R-047 | yes | claude | done | main | codex |
| 13 | S7R-050 | Support unit runtime | S7R-048 | no (new module) | codex/gemini | done | main | codex |
| 14 | S7R-051 | Medic Firefly support | S7R-050 | no (new module) | codex/gemini | done | main | codex |
| 15 | S7R-053 | Striker Hawk support | S7R-050 | no (new module) | codex/gemini | done | main | codex |
| 16 | S7R-018 | V1 Lean Harvester | S7R-010,011 | no (new module) | codex/gemini | done | main | codex |
| 17 | S7R-015 | V1 Lean Skimmer | S7R-010,011 | no (new module) | codex/gemini | done | main | codex |
| 18 | S7R-038 | PWA foundation | — | no | codex/gemini | done | main | codex |
| 19 | — | V1-PLAYTEST-GATE-1 | 10-18 all done | — | steven | next | — | — |
| 20 | S7R-054 | Polish pass | gate-1 | yes | claude | next | — | — |
| 21 | S7R-055 | Launch prep | gate-1 | yes | claude | blocked:054 | — | — |
| 22 | — | V1-PLAYTEST-GATE-2 | 20-21 | — | steven | blocked:all | — | — |
| 23 | S7R-057 | Shared defensive helpers | — | no (new module) | codex/gemini | done | main | codex |
| 24 | S7R-058 | Add missing destroy() methods | — | no | codex/gemini | done | main | codex |
| 25 | S7R-059 | Cap danger-mode particles | — | no | gemini | done | main | gemini |
| 26 | S7R-060 | Reduce per-frame GPU allocations | — | no | codex | done | main | codex |
| 27 | S7R-061 | Swap-and-pop + allocation cleanup | — | no | codex | done | main | codex |
| 28 | S7R-070 | Power bar → vertical left rail | — | no | codex | done | main | codex |
| 29 | S7R-071 | ⚡ Ability VFX: Shield sparkle + electric + degradation | — | no | codex | done | main | codex |
| 30 | S7R-072 | ⚡ Ability VFX: Slam shockwave + push + haptic | — | yes | codex | done | main | codex |
| 31 | S7R-073 | ⚡ Ability VFX: Projectile trails + color variety | — | no | gemini | done | main | gemini |
| 32 | S7R-074 | Fix flags-boot integration tests (2 failing) | — | no | codex/gemini | done | main | codex |
| 33 | S7R-075 | Unit tests: shield lifecycle (activate, update, expire, draw) | — | no | codex/gemini | done | codex/S7R-075 | codex |
| 34 | S7R-076 | Unit tests: projectile (fire, update, collide, draw, caps) | — | no | codex/gemini | done | codex/S7R-076 | codex |
| 35 | S7R-077 | Unit tests: progression (phase thresholds, victory, HP ratio) | — | no | codex/gemini | done | codex/S7R-077 | codex |
| 36 | S7R-078 | Unit tests: power (charge, spend, drain, afford, ratio) | — | no | codex/gemini | done | codex/S7R-078 | codex |
| 37 | S7R-079 | Unit tests: debug-panel (init, destroy, keyboard toggle) | — | no | codex/gemini | done | codex/S7R-079 | codex |
| 38 | S7R-080 | Extract world scenery from main.js → src/systems/world-render.js | — | yes | claude | done | claude/S7R-080 | claude |
| 39 | S7R-081 | Extract badguys controller from main.js → src/systems/badguys.js | — | yes | claude | done | claude/S7R-081 | claude |
| 40 | S7R-082 | Extract laser storm from main.js → src/systems/laser-storm.js | S7R-080 | yes | claude | done | claude/S7R-082 | claude |
| 41 | S7R-083 | Extract danger beam from main.js → src/systems/danger-beam.js | S7R-082 | yes | claude | done | claude/S7R-083 | claude |
| 42 | S7R-084 | Extract beam harvest from main.js → src/systems/beam-harvest.js | S7R-083 | yes | claude | done | claude/S7R-084 | claude |
| 43 | S7R-085 | Unit tests: hud-updates (factory, pulse, visibility, missing-element fallback) | — | no | codex/gemini | done | codex/S7R-085 | codex |
| 44 | S7R-086 | Unit tests: lives (loseLife, extraLife, invincibility alpha, boundary) | — | no | codex/gemini | done | codex/S7R-086 | codex |
| 45 | S7R-087 | Unit tests: support-registry (create, register, normalize, immutability) | — | no | codex/gemini | done | codex/S7R-087 | codex |
| 46 | S7R-088 | Unit tests: run-rng (seed precedence, deterministic mode, draw-count reset) | — | no | codex/gemini | done | gemini/S7R-088 | gemini |
| 47 | S7R-089 | Unit tests: sprite (alpha sampling, null context, cache, character normal) | — | no | codex/gemini | done | codex/S7R-089 | codex |
| 48 | S7R-090 | Split game loop: separate update and draw phases in main.js | — | yes | claude | wip:claude | claude/S7R-090 | claude |

## What can run RIGHT NOW

> **Update this section** whenever ticket statuses change. Platforms: read this to know what's available.

### Implementation tickets

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| V1-PLAYTEST-GATE-1 | Enable all flags, play on mobile, check session length + ability usage + fairness | next | steven (manual) |
| S7R-054 | Tune damage/cooldowns/costs/speeds based on gate-1 feedback. Touches main.js + all modules. | blocked:gate-1 | claude/codex |
| S7R-055 | Add retention telemetry hooks, prep for gate-2 soak test | blocked:054 | claude/codex |
| S7R-080 | Extract world scenery from main.js → src/systems/world-render.js (~250 lines). Touches main.js. | done | claude |
| S7R-081 | Extract badguys controller from main.js → src/systems/badguys.js (~220 lines). Touches main.js. | done | claude |
| S7R-082 | Extract laser storm from main.js → src/systems/laser-storm.js (~350 lines). Touches main.js. | done | claude |
| S7R-083 | Extract danger beam from main.js → src/systems/danger-beam.js (~330 lines). Touches main.js. Depends on S7R-082 (quantize). | done | claude |
| S7R-084 | Extract beam harvest from main.js → src/systems/beam-harvest.js (~170 lines). Touches main.js. Depends on S7R-083 (getDangerBeamGeometry). | done | claude |

### VFX tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-071 | Shield sparkle/electric effects, degradation visuals, proper cooldown timer on button | done | codex |
| S7R-072 | Slam expanding shockwave VFX, push aliens + non-6/7 numbers, haptic vibration on impact | done | — |
| S7R-073 | Projectile trails, color variety, energy bolt look, usage limiter | done | gemini |

### Cleanup tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-057 | Extract shared defensive helpers into `src/utils/defensive.js` | done | — |
| S7R-058 | Add missing destroy() methods to 7 modules. Fix event listener leaks in debug-panel. | done | — |
| S7R-074 | Fix 2 failing flags-boot integration tests (assume all defaults false, but 4 are now true) | done | — |
| S7R-059 | Hard-cap danger embers + sizzles. Without adaptive quality, both default to `Infinity`. Spawn rate 280/sec compounds. | done | — |
| S7R-060 | Cache/pool gradient objects, gate `shadowBlur` behind quality tier, cache static sky/hill gradients. | done | — |
| S7R-061 | Replace `splice(i,1)` with swap-and-pop in all particle loops. Gate `serializeDebug()` on panel visibility. Reduce harvester/support-runtime per-frame allocs. | done | — |

### Test tickets (from S7R-064 P0 audit)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-075 | Unit tests for shield: activate, cooldown, update lifecycle, expire, draw quality caps | done | — |
| S7R-076 | Unit tests for projectile: fire, spawn cap, update/collide, offscreen removal, trail/theme bounds | done | — |
| S7R-077 | Unit tests for progression: phase thresholds, victory transition, HP ratio clamp, speed/spawn multipliers | done | — |
| S7R-078 | Unit tests for power: charge, spend, drain, canAfford with invalid inputs, getPowerRatio clamp | done | — |
| S7R-079 | Unit tests for debug-panel: init/destroy lifecycle, keyboard toggle, listener cleanup | done | — |

### Test tickets (from S7R-064 P1 audit — no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-085 | Unit tests for hud-updates: factory pattern, pulse class toggle, visibility, missing-element fallback | done | codex |
| S7R-086 | Unit tests for lives: loseLife boundary, checkExtraLife thresholds, invincibility alpha output range | done | codex |
| S7R-087 | Unit tests for support-registry: create, register duplicate IDs, normalize invalid inputs, snapshot immutability | done | codex |
| S7R-088 | Unit tests for run-rng: seed override precedence, deterministic/non-deterministic modes, draw-count reset per run | done | gemini |
| S7R-089 | Unit tests for sprite: alpha sampling bounds, null context guards, cache hit, estimateCharacterNormal fallback | done | codex |
| S7R-090 | Split loop() into updateGame(now, dt) + drawGame(now). Pure refactor, no behavior change. Touches main.js. | wip:claude | claude |

### Research tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-062 | Catalog every tunable constant (damage, cooldown, speed, radius, cost) across all modules. Output markdown table for S7R-054 polish pass. | done | gemini | gemini/S7R-062 | gemini |
| S7R-063 | Identify top 5 blocks in main.js that should become standalone modules. Line ranges, what they do, lines saved. | done | gemini | gemini/S7R-063 |
| S7R-064 | Review all modules for missing test coverage, edge cases, pattern violations. Output gap report. | done | codex | codex/S7R-064 | codex |
| S7R-065 | Write a one-page story brief: who are the characters, what's the tone, what do enemies/supports represent in-story. 6 and 7 are alien kids at recess, the ship is their parents' minivan. | next | steven/claude |
| S7R-066 | Research sprite sheet formats and tools for small 2D characters (16x16 or 32x32). What format works with canvas? How to animate idle/walk/hit? Free pixel art tools? | next | gemini |
| S7R-067 | Design visual identity for alien kids — what do they look like? Sketch descriptions for all characters. | next | steven/claude |
| S7R-068 | Brainstorm alien ship personality and visual ideas. Does it hover impatiently? Honk? Send stern messages? | next | anyone |
| S7R-069 | Catalog ~30 hardcoded scene-tuning values in main.js (parallax, gradients, wave freq, etc.). Move to constants.js or scene-config module. | done | gemini | gemini/S7R-069 | gemini |

#### S7R-058 Ready Brief

**What:** Add destroy()/cleanup methods to modules that create state, timers, or event listeners but lack teardown. Critical fix for debug-panel.js listener leak.

**Reference files to read first:**
- `src/ui/action-bar.js` lines 348–354 (good destroy() pattern — clears Maps, removes DOM)
- `src/core/input.js` lines 49–62 (good destroy() pattern — removes all listeners, clears timers)
- `src/config/accessibility-settings.js` lines 184–186 (minimal destroy — clears listener Set)

**Files to modify (add destroy() export):**

1. `src/config/debug-panel.js` — **CRITICAL**. `initDebugPanel()` adds 3 listeners that never get removed:
   - `document.addEventListener('keydown', ...)` at line 435
   - `window.addEventListener('flagchange', ...)` at line 443
   - `window.addEventListener('flagsreset', ...)` at line 449
   - Also: DOM panel element and `<style>` element appended to document
   - Fix: store listener refs, return object with `destroy()` that removes them all and removes DOM
   - Currently returns nothing — must change to return `{ destroy }`

2. `src/systems/enemy-state-machine.js` — has `reset()` but no `destroy()`. Add `destroy()` that calls `reset()` and nulls out entity arrays + metrics.

3. `src/systems/support-runtime.js` — has `reset()` but no `destroy()`. Same pattern: `destroy()` wraps `reset()` + nulls references.

4. `src/ui/action-router.js` — holds callback references. Add `destroy()` that nulls them.

5. `src/ui/hud-updates.js` — holds DOM element references. Add `destroy()` that nulls them.

6. `src/systems/adaptive-quality.js` — holds `samples` array that grows during gameplay. Add `destroy()` that clears it.

7. `src/systems/telemetry.js` — holds currentRun and lastCompletedRun data. Add `destroy()` that resets to empty state.

**DO NOT modify:**
- `src/systems/enemy-registry.js` — frozen immutable objects, no cleanup needed
- `src/systems/support-registry.js` — frozen immutable objects, no cleanup needed
- `src/core/run-rng.js` — pure function, no state
- `src/ui/action-bar-config.js` — static config array
- `src/main.js` — do not touch

**Gotchas:**
- `debug-panel.js` `initDebugPanel()` currently returns `undefined`. Changing it to return `{ destroy }` is safe — `main.js` calls `initDebugPanel()` but doesn't use the return value. Verify by searching for `initDebugPanel` call sites.
- The 3 anonymous listeners in debug-panel (lines 435, 443, 449) must be refactored to named functions so they can be removed with `removeEventListener`.
- `enemy-state-machine.js` and `support-runtime.js` already have `reset()` — do not duplicate logic. `destroy()` should call `reset()` internally then null remaining references.

**Test requirements:**
- All existing tests must pass (`npm run test:unit`)
- No new tests needed — destroy() methods tested indirectly through module lifecycle
- `npm run lint` and `npm run build` — zero errors

**Acceptance criteria:**
- [ ] All 7 files export a `destroy()` method
- [ ] `debug-panel.js` destroy() removes all 3 event listeners and DOM elements
- [ ] No anonymous event listeners remain in debug-panel.js listener setup
- [ ] `npm run test:unit` passes (132/132)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-059 Ready Brief

**What:** Hard-cap danger-mode particle arrays to prevent runaway memory growth. Currently `maxDangerEmbers` and `maxDangerSizzles` fall back to `Number.POSITIVE_INFINITY` when adaptive quality is off (lines 2881-2882 of main.js). Embers spawn at ~280/sec and each bounce creates 2-5 sizzles — arrays grow without bound.

**Reference files to read first:**
- `src/main.js` lines 2870-2900 (ember/sizzle cap definitions)
- `src/main.js` lines 2893-2960 (ember spawn + update loop)
- `src/main.js` lines 2953-2990 (sizzle spawn + update loop)
- `src/systems/adaptive-quality.js` (tier definitions, `getQualityParams()`)

**Files to modify:**
1. `src/main.js` — Replace `Number.POSITIVE_INFINITY` fallbacks with hard caps (e.g. 300 embers, 150 sizzles). These caps should apply regardless of adaptive quality state.
2. `src/systems/adaptive-quality.js` — Ensure tier-based caps remain lower than the hard caps for quality tiers that throttle.

**DO NOT modify:** Any file not listed above.

**Gotchas:**
- The `POSITIVE_INFINITY` appears in a ternary: `adaptiveQuality ? tierCap : Infinity`. Replacing the fallback does NOT remove the adaptive quality branch — both paths must have finite values.
- Smoke puffs already have a cap (420) — match that pattern.
- Test with adaptive quality OFF to verify the hard cap works.

**Acceptance criteria:**
- [ ] `maxDangerEmbers` and `maxDangerSizzles` are finite in all code paths
- [ ] Danger mode runs for 60+ seconds without array growth beyond caps
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-060 Ready Brief

**What:** Reduce per-frame canvas gradient allocations and `shadowBlur` usage that cause GPU pressure and frame drops, especially during danger mode and laser storms.

**Reference files to read first:**
- `src/main.js` lines 2990-3020 (`drawDangerBeamEmbers` — per-ember gradient)
- `src/main.js` lines 2220-2270 (`drawLaserStorm` — per-beam gradient + shadowBlur)
- `src/main.js` lines 2540-2620 (`drawDangerBeam` — 4 gradients per frame)
- `src/main.js` lines 730-860 (`drawWorld` — 6 static gradients recreated every frame)
- `src/game-objects/projectile.js` lines 80-90 (shadowBlur = 18 per projectile)
- `src/systems/adaptive-quality.js` (quality tiers)

**Files to modify:**
1. `src/main.js` — Cache `drawWorld()` gradients (sky, hills, barn, ground) and invalidate only when canvas size or dayProgress step changes. Cache or quantize `drawDangerBeam()` oscillation params to reduce gradient churn. Remove per-ember/sizzle `createRadialGradient` — use a single pre-built gradient or flat color with alpha.
2. `src/game-objects/projectile.js` — Gate `shadowBlur` behind quality tier. At low quality, skip blur entirely. At mid quality, use reduced blur.
3. `src/systems/adaptive-quality.js` — Add `shadowBlurEnabled` and `maxShadowBlur` to quality tier params if not already present.

**DO NOT modify:** Any file not listed above.

**Gotchas:**
- `createRadialGradient` / `createLinearGradient` allocate native CanvasGradient objects that are GC'd. Hundreds per frame = GC pauses.
- `shadowBlur` triggers a Gaussian blur pass on the GPU for each draw call. `shadowBlur = 0` is the only value that skips the blur entirely — even `shadowBlur = 1` is expensive.
- Sky gradient colors change with `dayProgress` (180s cycle). Cache invalidation should use quantized time steps (e.g. every 0.5s) not exact float comparison.
- Laser storm has up to 18 beams — that's 18+ gradients per frame. A pooled gradient per beam slot would eliminate all allocations.

**Acceptance criteria:**
- [ ] `drawWorld()` creates ≤1 gradient per frame on average (cached, invalidated on resize/time step)
- [ ] Danger beam embers/sizzles use no per-entity gradient calls
- [ ] `shadowBlur` is 0 at quality tier ≤ 2
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-061 Ready Brief

**What:** Replace O(n) `splice` removals with O(1) swap-and-pop in all particle/ember/smoke/sizzle loops. Gate `serializeDebug()` calls behind debug panel visibility. Reduce per-frame allocations in support-runtime and harvester targeting.

**Reference files to read first:**
- `src/main.js` lines 1128, 1191 (particle/score popup splice loops)
- `src/main.js` lines 2406, 2927, 2974, 2986 (smoke/ember/sizzle splice loops)
- `src/supports/medic-firefly.js` lines 257-296, 352-373 (serializeDebug unconditional)
- `src/supports/striker-hawk.js` lines 413-453, 508-526 (serializeDebug unconditional)
- `src/systems/support-runtime.js` lines 188, 229-231 (per-frame array allocations)
- `src/enemies/harvester.js` lines 176-193 (per-frame sort + allocation in selectTargets)

**Files to modify:**
1. `src/main.js` — In all reverse-iteration `splice(i, 1)` loops for particles, score popups, smoke puffs, embers, and sizzles: replace with swap-and-pop pattern (`arr[i] = arr[arr.length - 1]; arr.pop()`).
2. `src/supports/medic-firefly.js` — Only call `serializeDebug()` when the debug panel is actually visible. Check `window.__debugPanelVisible` flag or similar before building the debug object.
3. `src/supports/striker-hawk.js` — Same gating as medic-firefly.
4. `src/systems/support-runtime.js` — Reuse `units` array in `onFrame()` instead of allocating `nextUnits = []` each frame. Filter in-place or use a swap pattern.
5. `src/enemies/harvester.js` — Reuse a module-level `candidates` array in `selectTargets()` instead of allocating a new one each frame. Clear with `.length = 0` instead of `= []`.

**DO NOT modify:** Any file not listed above.

**Gotchas:**
- Swap-and-pop changes iteration order — since these loops already iterate in reverse and entities are unordered, this is safe.
- `serializeDebug()` gating: the debug panel visibility flag must be set by `debug-panel.js`. If S7R-058 hasn't merged yet, use a simple `typeof window.__debugPanelVisible !== 'undefined' && window.__debugPanelVisible` check.
- `support-runtime.js` `nextUnits` is used because expired units are filtered out. In-place filtering with swap-and-pop is the right approach.
- Harvester `candidates` reuse: clear with `.length = 0`, not `= []`, to avoid reallocating the backing store.

**Acceptance criteria:**
- [ ] Zero `splice(i, 1)` calls remain in particle/ember/smoke/sizzle/popup loops
- [ ] `serializeDebug()` is not called when debug panel is hidden
- [ ] `selectTargets()` does not allocate a new array each frame
- [ ] `support-runtime.js` `onFrame()` does not allocate a new array each frame
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-062 Ready Brief

**What:** Catalog every tunable constant across all game modules — damage values, cooldowns, speeds, radii, costs, durations, spawn rates, cap limits. Output a markdown table that S7R-054 (polish pass) will use to make balance decisions.

**Files to scan:** `src/main.js`, `src/enemies/*.js`, `src/supports/*.js`, `src/systems/*.js`, `src/game-objects/*.js`, `src/ui/*.js`, `src/config/*.js`

**Output format:** Write to `docs/research/S7R-062-tunable-constants.md`. Table columns: `| File | Line | Constant/Value | Current Value | What it controls | Unit |`

**Done criteria:**
- [ ] Every numeric literal that affects gameplay balance is cataloged
- [ ] Grouped by system (enemy, support, particle, UI, timing)
- [ ] Doc exists at the path above
- [ ] No code changes — research only

#### S7R-063 Ready Brief

**What:** Identify the top 5 blocks in `src/main.js` that should be extracted into standalone modules. For each, provide line range, what it does, estimated lines saved, target module path, and dependency analysis.

**Files to read:** `src/main.js` (primary), existing extracted modules for pattern reference: `src/systems/power.js`, `src/ui/action-bar.js`

**Output format:** Write to `docs/research/S7R-063-main-extraction.md`. For each candidate: line range, description, lines saved, target path, imports needed, exports produced.

**Done criteria:**
- [ ] 5 candidates identified with line ranges
- [ ] Each has a dependency analysis (what state it touches)
- [ ] Total lines-saved estimate
- [ ] Doc exists at the path above
- [ ] No code changes — research only

#### S7R-064 Ready Brief

**What:** Audit all modules for missing test coverage, uncovered edge cases, and pattern violations vs the gold standard (`src/supports/medic-firefly.js`).

**Files to scan:** `tests/**/*.test.js`, cross-referenced against `src/**/*.js`

**Output format:** Write to `docs/research/S7R-064-test-gaps.md`. Table: `| Module | Has Tests? | Missing Coverage | Priority |`. Then a section listing specific test cases to add.

**Done criteria:**
- [ ] Every src module checked for corresponding test file
- [ ] Edge cases identified (null inputs, empty arrays, boundary values)
- [ ] Pattern violations flagged (modules not matching medic-firefly conventions)
- [ ] Doc exists at the path above
- [ ] No code changes — research only

#### S7R-065 Ready Brief

**What:** Write the narrative design brief. The numbers are alien kids at school recess. The alien ship is their parents coming to pick them up — the kids don't want to go home yet. Flesh out: who are the characters, what's the tone, what do enemies/supports represent in-story?

**Reference:** Story Log entries in this file (Feb 12-13), FRIENDLY entries in `dashboard.html` for story tone.

**Output format:** Write to `docs/research/S7R-065-narrative-design.md`. Sections: Characters (with personality), Tone & Voice, What Everything Represents (gameplay → story mapping), One-Page Story Summary.

**Done criteria:**
- [ ] Every game entity has a story identity
- [ ] Tone is defined
- [ ] Clear mapping: gameplay mechanic → story meaning
- [ ] Doc exists at the path above

#### S7R-066 Ready Brief

**What:** Research sprite sheet formats and tools for small 2D characters (16x16 or 32x32). What format works best with HTML5 canvas? How to animate idle/walk/hit states? What free tools exist?

**Output format:** Write to `docs/research/S7R-066-sprite-sheets.md`. Sections: Format Recommendation, Animation Approach, Tool Recommendations (free, with links), Implementation Notes for canvas.

**Done criteria:**
- [ ] Format recommendation with pros/cons
- [ ] At least 3 tool recommendations with links
- [ ] Canvas integration approach described
- [ ] Doc exists at the path above

#### S7R-067 Ready Brief

**What:** Design visual identity for game characters. Sketch descriptions for: kid 6, kid 7, parent harvester, parent skimmer, firefly friend, hawk friend, center guardian.

**Reference:** S7R-065 narrative brief (if done), Story Log entries.

**Output format:** Write to `docs/research/S7R-067-character-design.md`. Per character: physical description, color palette, personality through appearance, size relative to others.

**Done criteria:**
- [ ] All 7+ characters described visually
- [ ] Consistent art style defined
- [ ] Size/scale relationships defined
- [ ] Doc exists at the path above

#### S7R-068 Ready Brief

**What:** Brainstorm the alien ship (parents' minivan) personality and visuals. How does it hover? Does it honk? Send stern messages? What does escalation look like?

**Output format:** Write to `docs/research/S7R-068-alien-ship.md`. Sections: Visual Description, Personality & Behavior, Escalation Stages, Sound/Visual Cue Ideas.

**Done criteria:**
- [ ] Visual description detailed enough to concept
- [ ] At least 3 escalation stages described
- [ ] Personality is distinct and funny
- [ ] Doc exists at the path above

#### S7R-069 Ready Brief

**What:** Catalog all magic numbers in `src/main.js` that control scene tuning — parallax speeds, sky gradient stops, wave frequencies, screen shake, fence padding, spawn positions, etc.

**Files to scan:** `src/main.js` (primary), `src/config/*.js` (what's already extracted)

**Output format:** Write to `docs/research/S7R-069-magic-numbers.md`. Table: `| Line | Value | What it controls | Should extract? | Suggested constant name |`

**Done criteria:**
- [ ] All scene-tuning magic numbers in main.js cataloged
- [ ] Each has a suggested constant name
- [ ] Grouped by system (sky, parallax, shake, spawn, fence, etc.)
- [ ] Doc exists at the path above
- [ ] No code changes — research only

#### S7R-071 Ready Brief

**What:** Overhaul shield visual effects to be visually exciting — sparkle particles, electric/lightning arcs, and a degradation system where the shield visibly breaks down as it absorbs damage. Add a proper cooldown timer that greys out the Shield button so it can't be spammed.

**Reference files to read first:**
- `src/game-objects/shield.js` lines 47-89 (current render — radial gradient + simple stroke circle)
- `src/game-objects/shield.js` lines 34-42 (alpha/pulse config)
- `src/constants.js` lines 35-39 (SHIELD constants: DURATION_MS=3000, RADIUS_PX=140, COOLDOWN_MS=1000)
- `src/constants.js` line 27 (POWER.SHIELD_COST=25)
- `src/ui/action-router.js` lines 55-62 (handleShield — already calls setButtonCooldown)

**Files to modify:**
1. `src/game-objects/shield.js` — Replace the simple gradient+stroke with:
   - **Sparkle particles**: 15-25 small bright particles orbiting the shield perimeter, varying in size (2-5px), white/cyan/gold colors, random twinkle (opacity oscillation)
   - **Electric arcs**: 3-5 jagged lightning lines that crackle across the shield surface, regenerating every 150-300ms with new random paths. Use 2-3 segment bezier curves between random points on the circle perimeter
   - **Degradation**: Track remaining shield time as a ratio. As it runs down: sparkle count drops, electric arcs get dimmer/fewer, shield color shifts from bright cyan → dull blue → red-tinted, border becomes dashed/broken at <25% remaining
   - **Impact flash**: When shield blocks a hit, burst of 8-12 sparks outward from impact point + screen-edge glow pulse
   - **Activation burst**: On first frame of shield, radial burst of sparks expanding outward
2. `src/constants.js` — Increase `SHIELD.COOLDOWN_MS` from 1000 to 4000 (4 second cooldown). This makes the button grey out meaningfully. Increase `POWER.SHIELD_COST` from 25 to 30.
3. `src/ui/action-router.js` — Verify `setButtonCooldown` is called with the new cooldown value (it already reads from `SHIELD.COOLDOWN_MS / 1000`)

**DO NOT modify:** `src/main.js`, `src/ui/action-bar.js`, `src/ui/action-bar-config.js`

**Gotchas:**
- Shield rendering happens in `drawShield()` which receives `(ctx, state, cx, anchorY)`. All particle state must live on the `state.shield` object — don't create module-level mutable arrays
- The existing ripple effect (lines 75-86) triggers on hit via `state.shield.rippleTime`. Reuse this trigger for the new impact flash
- `globalCompositeOperation = 'lighter'` is already used — keep it for additive blending on sparks
- Performance: cap total particles at 30. Use simple circles, not complex shapes. Reuse particle objects (pool pattern from S7R-061)

**Acceptance criteria:**
- [ ] Shield has visible sparkle particles orbiting the perimeter
- [ ] Shield has electric/lightning arc effects
- [ ] Shield visually degrades over its 3-second duration (color shift, fewer sparks)
- [ ] Impact creates a burst of sparks from the hit point
- [ ] Shield button greys out for 4 seconds after use (cooldown visible on button)
- [ ] Power cost is 30 (drains the bar noticeably)
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-072 Ready Brief

**What:** Overhaul slam to be THE showstopper ability — worth saving power for. Visually wild expanding shockwave with haptic impact, screen shake, and a push mechanic that physically shoves the alien ship and any non-6/7 numbers away from the blast origin like a brush stroke. This must feel like dropping a bomb.

**Reference files to read first:**
- `src/main.js` lines 1022-1054 (slam shockwave update + render — expanding circle with hue-shifting stroke)
- `src/main.js` lines 797-813 (slam activation, shockwave creation)
- `src/ui/action-router.js` lines 77-101 (handleSlam — creates shockwave object with maxRadius=200, duration=600ms)
- `src/constants.js` line 30 (POWER.SLAM_COST=40)
- `src/main.js` line 812 (alternative maxRadius using screen diagonal)

**Files to modify:**
1. `src/main.js` — Replace slam rendering (lines 1030-1054) with:
   - **Expanding ring**: Keep the outward-expanding ring but add a 2nd inner ring trailing 30% behind. Both should have gradient fills (not just strokes) with radial fade
   - **Particle debris**: Spawn 20-30 small particles at the wavefront that scatter outward and fade. Colors: bright white core → orange → purple trail
   - **Screen shake**: Add 3-4 frames of camera shake (±4px random offset on ctx.translate) when slam activates
   - **Ground ripple**: Concentric semi-transparent rings left behind as the wave passes (fade over 800ms)
   - **Flash**: Keep existing white flash but make it more dramatic (10% opacity, faster decay)
   - **Haptic feedback**: On slam activation, call `navigator.vibrate([40, 20, 80])` (feature-detect first: `if ("vibrate" in navigator)`). When shockwave hits the alien ship, fire a second pulse `navigator.vibrate([60])`. iOS Safari doesn't support this — that's fine, visual effects carry the experience there
2. `src/main.js` — Add push mechanic in the slam update logic (near line 1022):
   - **Push aliens**: When shockwave radius reaches the alien ship's y-position, push the ship upward by 40-60px over 500ms (smooth ease-out). Use `state.badguysFlight.y` or equivalent
   - **Push non-6/7 numbers**: Any active enemy/projectile that is NOT a 6 or 7 (check entity type) within the shockwave radius gets pushed outward from the slam origin. Apply a velocity impulse proportional to proximity (closer = stronger push, 200-400px/s)
   - **Push 6/7 numbers**: 6 and 7 entities are immune to push — they stay in place (the guardian protects them)
3. `src/ui/action-router.js` — Increase `SLAM_SHOCKWAVE_MAX_RADIUS_PX` from 200 to match screen diagonal (use the main.js pattern). Increase `SLAM_SHOCKWAVE_DURATION_MS` from 600 to 800 for a more dramatic expansion.

**DO NOT modify:** `src/game-objects/shield.js`, `src/game-objects/projectile.js`, any support/enemy module files

**Gotchas:**
- There's a cost mismatch: `action-router.js` hardcodes `SLAM_POWER_COST = 50` but `constants.js` has `POWER.SLAM_COST = 40` and `main.js` uses the constant (40). Fix this by removing the local constant in action-router and importing from constants.js
- The ship push must be temporary — after 500ms it should drift back to its original y-position
- Screen shake must reset `ctx.translate` before the end of the frame or everything shifts
- Non-6/7 push: currently there's no entity type field on bouncing numbers. You may need to check what data each entity carries to distinguish 6/7 from other objects

**Acceptance criteria:**
- [ ] Slam has dual expanding rings (outer + trailing inner)
- [ ] Particle debris scatters outward from the wavefront
- [ ] Screen shakes briefly on slam activation
- [ ] Alien ship gets pushed upward when shockwave reaches it
- [ ] Non-6/7 entities get pushed away from blast origin
- [ ] 6 and 7 entities are NOT pushed (they're protected)
- [ ] Haptic vibration fires on slam activation (Android Chrome) with feature detection
- [ ] Second haptic pulse when shockwave hits alien ship
- [ ] No errors on iOS/desktop (graceful feature detection)
- [ ] Slam cost mismatch fixed (single source of truth in constants.js)
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-073 Ready Brief

**What:** Overhaul projectile visual effects to look like an exciting energy bolt with colorful trails, varied colors, and more visual punch. Add a usage limiter so fire can't always be used — cooldown timer that greys out the button between shots.

**Reference files to read first:**
- `src/game-objects/projectile.js` lines 57-109 (current render — gold trail particles + gradient bolt + white highlight)
- `src/game-objects/projectile.js` lines 14-25 (fireProjectile — checks MAX_ACTIVE cap of 3)
- `src/constants.js` lines 42-48 (PROJECTILE constants: SPEED=8, DAMAGE=5, MAX_ACTIVE=3, RADIUS=8, TRAIL_LENGTH=6)
- `src/constants.js` line 28 (POWER.PROJECTILE_COST=15)
- `src/ui/action-router.js` lines 65-74 (handleProjectile)

**Files to modify:**
1. `src/game-objects/projectile.js` — Replace rendering (lines 57-109) with:
   - **Color variety**: Each projectile gets a random color theme on creation (pick from: cyan/white, magenta/pink, gold/orange, green/lime). Store as `projectile.colorTheme` index
   - **Energy bolt head**: Replace the simple line stroke with a 10-12px glowing orb. Draw 2-3 concentric circles: bright white core (3px) → theme color (6px, 60% alpha) → outer glow (12px, 20% alpha)
   - **Particle trail**: Increase TRAIL_LENGTH from 6 to 12. Each trail point spawns 1-2 small particles that drift sideways (±2px random) and fade. Trail particles use the theme color with decreasing alpha
   - **Motion streak**: Draw a tapered line from trail[-1] to current position, width 4px→1px, using theme color at 40% alpha
   - **Impact burst**: When projectile hits the ship (despawn), spawn 8-10 spark particles that scatter from the hit point in the theme color (this requires adding a `projectile.hitShip` flag)
2. `src/constants.js` — Change `POWER.PROJECTILE_COST` from 15 to 20. Increase `PROJECTILE.TRAIL_LENGTH` from 6 to 12.
3. `src/ui/action-router.js` — Add cooldown to fire button: after firing, call `setButtonCooldown(readActionBar, 'projectile', 1.2)` (1.2 second cooldown). This greys out the Fire button between shots.

**DO NOT modify:** `src/main.js`, `src/game-objects/shield.js`, any support/enemy module files

**Gotchas:**
- `fireProjectile()` creates the projectile object (line 17-22). Add `colorTheme: Math.floor(Math.random() * 4)` to the object literal there
- The existing `globalCompositeOperation = 'lighter'` (line 70) should be kept for the additive glow effect
- Trail particles need to be lightweight — just position + alpha + size, no complex physics. Reuse the circular buffer pattern
- Impact burst: `drawProjectiles` currently just skips dead projectiles. To detect hits, check if the projectile was removed because `y < ship area` vs `life <= 0`. Alternatively, handle the burst in the collision detection code in main.js (search for projectile hit detection)
- `shadowBlur` was gated behind quality tier in S7R-060 — respect that gate for new glow effects

**Acceptance criteria:**
- [ ] Each projectile has a random color theme (4 varieties)
- [ ] Projectile head is a glowing energy orb (not a line)
- [ ] Longer particle trail (12 positions) with drifting fade particles
- [ ] Motion streak connects trail to head
- [ ] Fire button greys out for 1.2 seconds between shots (cooldown visible)
- [ ] Power cost is 20 per shot (noticeable drain)
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-074 Ready Brief

**What:** Fix 2 failing integration tests in `tests/integration/flags-boot.test.js`. The tests assume all flag defaults are `false`, but 4 action-bar flags (`actionBar`, `actionInputArbitration`, `multiTouchAction`, `buttonMappedPowers`) were permanently enabled (defaulted to `true`) during S7R-046/047/048. The tests need to check against actual defaults instead of assuming all-false.

**Reference files to read first:**
- `tests/integration/flags-boot.test.js` lines 60-64 (test: "should boot with all flags disabled") — asserts `Object.values(flags).every(v => v === false)`
- `tests/integration/flags-boot.test.js` lines 141-151 (test: "should maintain consistency after reset") — same all-false assumption
- `src/config/flags.js` lines 64-67 — the 4 flags that default to `true`

**Files to modify:**
1. `tests/integration/flags-boot.test.js` — Fix the 2 failing tests to check actual defaults from `getAllFlags()` after `initFlags()` instead of assuming all values are `false`

**DO NOT modify:** `src/config/flags.js`, any source files — this is a test-only fix

**Gotchas:**
- Don't hardcode the 4 true-default flags in the test — query them dynamically so the test survives future flag additions
- The fix for "should boot with all flags disabled" should probably be renamed since not all flags are disabled by default anymore
- `resetFlags()` should restore to the same defaults as `initFlags()` — verify this is the case

**Acceptance criteria:**
- [ ] Both previously failing tests now pass
- [ ] No test names claim "all flags disabled" if that's no longer true
- [ ] Tests validate defaults dynamically (not hardcoded false assumption)
- [ ] All other tests in the file still pass (13 total)
- [ ] `npm run test:unit` passes with 0 failures
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-075 Ready Brief

**What:** Write unit tests for `src/game-objects/shield.js`. Cover the full shield lifecycle: activation, cooldown enforcement, update/expire, draw quality caps, and particle limits.

**Reference files to read first:**
- `src/game-objects/shield.js` — the module under test (exports: `activateShield`, `updateShield`, `isShieldActive`, `getShieldAlpha`, `drawShield`)
- `src/constants.js` — `SHIELD` namespace (DURATION_MS, COOLDOWN_MS, etc.)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern (mock setup, lifecycle, draw guards)

**Files to modify:**
1. `tests/unit/game-objects/shield.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `activateShield` returns false while cooling down — test both fresh activation and cooldown rejection
- `drawShield` accepts optional `qualityCaps` — test with and without quality constraints
- Shield state lives on `state.shield.*` — mock the state object per medic-firefly patterns
- Import `SHIELD` constants from `src/constants.js` for duration/cooldown values — don't hardcode

**Acceptance criteria:**
- [ ] `activateShield` tested: fresh activation succeeds, cooldown blocks re-activation
- [ ] `updateShield` tested: active → expired lifecycle at SHIELD.DURATION_MS
- [ ] `isShieldActive` and `getShieldAlpha` tested with active/expired states
- [ ] `drawShield` tested: quality cap enforcement (shadowBlur, particle caps)
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-076 Ready Brief

**What:** Write unit tests for `src/game-objects/projectile.js`. Cover firing, spawn cap, update/collision, offscreen removal, and trail/theme bounds.

**Reference files to read first:**
- `src/game-objects/projectile.js` — the module under test (exports: `fireProjectile`, `updateProjectiles`, `drawProjectiles`)
- `src/constants.js` — `PROJECTILE` namespace (MAX_ACTIVE, SPEED, etc.)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern

**Files to modify:**
1. `tests/unit/game-objects/projectile.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `fireProjectile` should respect `PROJECTILE.MAX_ACTIVE` spawn cap — test at and beyond the limit
- `updateProjectiles` takes `dt` and `shipRect` — test with large `dt` values and offscreen positions
- Trail arrays should be bounded — verify no unbounded growth
- Theme index comes from random — test that it stays within valid range

**Acceptance criteria:**
- [ ] `fireProjectile` tested: spawns projectile, respects MAX_ACTIVE cap
- [ ] `updateProjectiles` tested: movement, offscreen removal, large dt behavior
- [ ] `drawProjectiles` tested: quality cap handling
- [ ] Trail length bounded (no unbounded array growth)
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-077 Ready Brief

**What:** Write unit tests for `src/systems/progression.js`. Cover phase thresholds, victory transition, HP ratio clamping, and phase multiplier functions.

**Reference files to read first:**
- `src/systems/progression.js` — the module under test (exports: `resetShip`, `damageShip`, `getPhaseForHP`, `updateBossPhase`, `getShipHPRatio`, `getPhaseSpeedMultiplier`, `getPhaseSpawnMultiplier`, `getPhaseTrapChanceBoost`, `getPhaseEffects`)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern

**Files to modify:**
1. `tests/unit/systems/progression.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `getPhaseForHP` has multiple thresholds — test each boundary (at, above, below)
- `updateBossPhase` sets `isVictory` only on first defeat — test idempotency (calling twice shouldn't re-trigger)
- `getShipHPRatio` should clamp for negative and overflow HP values
- `damageShip` should not go below 0 HP

**Acceptance criteria:**
- [ ] `getPhaseForHP` tested at every threshold boundary
- [ ] `updateBossPhase` tested: normal phase transitions + victory fires once only
- [ ] `getShipHPRatio` tested: normal, negative HP, overflow HP — all clamped [0,1]
- [ ] `damageShip` tested: normal damage, overkill (doesn't go negative)
- [ ] Phase multiplier functions return expected values per phase
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-078 Ready Brief

**What:** Write unit tests for `src/systems/power.js`. Cover charge, spend, drain, canAfford with edge cases, and getPowerRatio clamping.

**Reference files to read first:**
- `src/systems/power.js` — the module under test (exports: `resetPower`, `chargePower`, `spendPower`, `canAfford`, `drainPower`, `getPowerRatio`)
- `src/constants.js` — `POWER` namespace (MAX, SLAM_COST, etc.)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern

**Files to modify:**
1. `tests/unit/systems/power.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `chargePower` should cap at POWER.MAX — test overflow
- `spendPower` should not go negative — test with cost > current power
- `drainPower` takes `amountPerSec` and `dt` — test with very large dt, NaN dt, zero dt
- `canAfford` with NaN/undefined cost should return false (or whatever the current behavior is — test it)
- `getPowerRatio` should clamp to [0,1]

**Acceptance criteria:**
- [ ] `resetPower` tested: sets initial state correctly
- [ ] `chargePower` tested: normal charge, overflow caps at MAX
- [ ] `spendPower` tested: normal spend, insufficient funds, zero/negative cost
- [ ] `canAfford` tested: normal, edge (exact cost), NaN/undefined
- [ ] `drainPower` tested: normal drain, large dt, zero dt
- [ ] `getPowerRatio` tested: normal, 0 power, max power, beyond-max clamped
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-079 Ready Brief

**What:** Write unit tests for `src/config/debug-panel.js`. Cover init/destroy lifecycle, keyboard toggle, listener cleanup, and flag rendering.

**Reference files to read first:**
- `src/config/debug-panel.js` — the module under test (exports: `initDebugPanel`, `showDebugPanel`, `hideDebugPanel`, `toggleDebugPanel`)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern
- `tests/unit/config/flags.test.js` — pattern for testing config modules with DOM/browser mocks

**Files to modify:**
1. `tests/unit/config/debug-panel.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- Debug panel creates DOM elements — need jsdom or mock document
- `initDebugPanel` registers keyboard listener (backtick key) — test it fires only once per init
- Repeated init/destroy cycles must not leak listeners — test multiple cycles
- Panel reads flags from `getAllFlags()` — mock the flags module

**Acceptance criteria:**
- [ ] `initDebugPanel` tested: creates DOM, registers listener once
- [ ] `toggleDebugPanel` tested: show/hide toggling
- [ ] `destroy` tested: removes DOM and listeners, verified across repeated init/destroy cycles
- [ ] Keyboard shortcut tested: backtick toggles panel
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-080 Ready Brief

**What:** Extract the world scenery system from `src/main.js` into `src/systems/world-render.js`. This is purely presentational code: sky gradients, hills, barn, stars, ground. Also extract related magic numbers from S7R-069 into `src/constants.js` as `SCENE.*` constants.

**Reference files to read first:**
- `src/main.js` lines 501–508 (state: `worldStars`, `worldGradientCache`, `WORLD_GRADIENT_STEP_MS`)
- `src/main.js` lines 536–635 (`rebuildWorldStars`, `getWorldGradients`)
- `src/main.js` lines 868–981 (`drawWorld` + helper `drawHillLayer`)
- `src/systems/power.js` — gold standard extraction pattern (imports constants, receives state as params, exports named functions)
- `docs/research/S7R-063-main-extraction.md` — extraction strategy (state injection, context passing)
- `docs/research/S7R-069-magic-numbers.md` — magic numbers to extract (SCENE.PARALLAX_FACTOR, SKY_GRADIENT_BASE, HILL_WAVE_*, BARN_*, GROUND_*, GRASS_SPACING)

**Files to modify:**
1. `src/systems/world-render.js` (create new) — exports: `initWorldState`, `rebuildWorldStars`, `getWorldGradients`, `drawWorld`
2. `src/main.js` — remove extracted functions, import from world-render.js, wire into game loop
3. `src/constants.js` — add `SCENE` namespace with world-related magic numbers

**DO NOT modify:** Any test files, any other source modules

**Gotchas:**
- `drawWorld` uses `ctx`, `wCSS`, `hCSS` — pass as params, don't import globals
- `worldGradientCache` is module-level mutable state — keep it internal to world-render.js, expose via `getWorldGradients()`
- `rebuildWorldStars` is called from `resize()` in main.js — export it so main.js can still call it
- `drawHillLayer` is a helper only used by `drawWorld` — extract it too (can be unexported)
- main.js calls `drawWorld(now, cx)` at lines 3521 and 3730 — both must be updated to use the import
- `resize()` also resets `worldGradientCache.key = ''` — export a `resetWorldCache()` or similar
- Net lines in main.js must decrease (rule 10)

**Acceptance criteria:**
- [ ] `src/systems/world-render.js` exists with exported functions
- [ ] `src/main.js` imports and calls world-render functions — no world scenery code remains inline
- [ ] Magic numbers moved to `SCENE.*` constants in `src/constants.js`
- [ ] `drawWorld` renders identically (no visual regression)
- [ ] main.js is shorter by ~200+ net lines
- [ ] `npm run test` passes (all existing tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-081 Ready Brief

**What:** Extract the badguys controller from `src/main.js` into `src/systems/badguys.js`. This is the alien ship's flight physics: swooping, target picking, bounds checking, sprite state. Also extract related magic numbers from S7R-069 into `src/constants.js` as `SCENE.BADGUYS_*` constants.

**Reference files to read first:**
- `src/main.js` lines 3395–3506 (`getBadguysBounds`, `pickBadguysTarget`, `updateBadguysFlight`, `updateBadguysState`)
- `src/systems/power.js` — gold standard extraction pattern
- `src/systems/world-render.js` — if S7R-080 is done, follow the same extraction conventions
- `docs/research/S7R-063-main-extraction.md` — extraction strategy
- `docs/research/S7R-069-magic-numbers.md` — magic numbers: BADGUYS_SIDE_PAD_RATIO, MAX_Y_RATIO, BASE_SPEED, TARGET_SPEED, SWOOP_FREQ_BASE, SWOOP_FORCE_BASE, SPAWN_SPREAD_RATIO

**Files to modify:**
1. `src/systems/badguys.js` (create new) — exports: `getBadguysBounds`, `pickBadguysTarget`, `updateBadguysFlight`, `updateBadguysState`
2. `src/main.js` — remove extracted functions, import from badguys.js, wire into game loop
3. `src/constants.js` — add `SCENE.BADGUYS_*` constants (if not already added by S7R-080)

**DO NOT modify:** Any test files, any other source modules besides the three listed

**Gotchas:**
- `updateBadguysState` reads `S.badguysFlight`, `S.badguysRender`, `S.badguysOverlay`, `wCSS`, `hCSS` — pass state and dimensions as params
- `updateBadguysFlight` is called from `updateBadguysState` — both must move together
- `pickBadguysTarget` uses bounds — keep it coupled with `getBadguysBounds`
- main.js calls `updateBadguysState(now, dt)` at lines 3516 and 3629 — update both call sites
- Also called at lines 1562 and 1800 (init/reset paths) — don't miss these
- `badguysOverlay` and `badguysSpriteSheet` are referenced — check if they need to be passed in or imported
- Net lines in main.js must decrease (rule 10)

**Acceptance criteria:**
- [ ] `src/systems/badguys.js` exists with exported functions
- [ ] `src/main.js` imports and calls badguys functions — no ship flight code remains inline
- [ ] Magic numbers moved to `SCENE.BADGUYS_*` constants in `src/constants.js`
- [ ] Ship movement behaves identically (no gameplay regression)
- [ ] main.js is shorter by ~150+ net lines
- [ ] `npm run test` passes (all existing tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-082 Ready Brief

**What:** Extract the laser storm system from `src/main.js` into `src/systems/laser-storm.js`. This includes beam physics, gradient caching, smoke particles, and all rendering. Also extract `quantize()` into `src/utils/math.js` (shared by danger beam). Move laser-specific magic numbers to `src/constants.js`.

**Reference files to read first:**
- `src/main.js` lines 507–513 (gradient cache constants + arrays)
- `src/main.js` line 515 (`quantize` — shared helper, move to utils/math.js)
- `src/main.js` lines 2129–2162 (`startLaserPostHitBounce`, `updateLaserBounceTip`)
- `src/main.js` lines 2191–2577 (`getInertBeamPolylinePoints`, `updateLaserStorm`, `getCachedLaserSourceGradient`, `getCachedLaserBeamGradient`, `drawLaserStorm`, `spawnLaserSmoke`, `updateLaserSmoke`, `drawLaserSmoke`)
- `src/systems/world-render.js` — extraction pattern (imports constants, receives ctx/state as params)
- `src/systems/badguys.js` — extraction pattern (wrapper function in main.js)
- `docs/research/S7R-063-main-extraction.md` — extraction strategy

**Files to modify:**
1. `src/utils/math.js` — add `quantize(value, step)` export (shared by laser storm + danger beam)
2. `src/systems/laser-storm.js` (create new) — exports: `initLaserStormState`, `startLaserPostHitBounce`, `updateLaserBounceTip`, `getInertBeamPolylinePoints`, `updateLaserStorm`, `drawLaserStorm`, `spawnLaserSmoke`, `updateLaserSmoke`, `drawLaserSmoke`
3. `src/main.js` — import from laser-storm.js, remove extracted functions, add wrapper if needed
4. `src/constants.js` — add `LASER.*` constants (gradient step sizes, smoke caps, beam physics)

**DO NOT modify:** Any test files, any other source modules besides the four listed

**Gotchas:**
- `quantize()` is also used by `getDangerBeamOscillation` (line 2663). Move it to `src/utils/math.js` so both laser-storm.js and danger-beam.js (S7R-083) can import it. Remove from main.js.
- `updateLaserStorm` reads many state fields: `S.laserStorm`, `badguysLightAnchors`, `badguysRender`, canvas dimensions. Use a wrapper function pattern (like S7R-081) to keep call sites clean.
- `drawLaserStorm` uses `ctx` and reads `S.laserStorm` + laser gradient caches. The gradient caches should be internal to the module (like worldGradientCache in world-render.js).
- `spawnLaserSmoke` is called from multiple places in main.js — check all call sites and ensure the wrapper covers them.
- The 3 `LASER_GRADIENT_*` constants and 2 cache arrays (lines 507–513) move entirely to the new module.
- `getAdaptiveCapValue` is used in `updateLaserStorm` — pass as param or import from adaptive-quality.
- `random()` closure must be passed as `rng` param.
- Net lines in main.js must decrease (rule 10).

**Acceptance criteria:**
- [ ] `src/systems/laser-storm.js` exists with all laser functions exported
- [ ] `quantize()` moved to `src/utils/math.js` and imported where needed
- [ ] `src/main.js` imports and calls laser-storm functions — no laser code remains inline
- [ ] Gradient caches are internal to laser-storm.js (not exported)
- [ ] main.js is shorter by ~300+ net lines
- [ ] `npm run test` passes (all existing tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-083 Ready Brief

**What:** Extract the danger beam system from `src/main.js` into `src/systems/danger-beam.js`. This includes beam oscillation, rendering, geometry calculation, and ember/sizzle particle systems. Move danger-beam-specific magic numbers to `src/constants.js`.

**Reference files to read first:**
- `src/main.js` line 510 (`DANGER_BEAM_OSC_STEP_MS` constant)
- `src/main.js` lines 2662–2828 (`getDangerBeamOscillation`, `drawDangerBeam`, `getDangerBeamGeometry`)
- `src/main.js` lines 3019–3175 (`updateDangerBeamEmbers`, `drawDangerBeamEmbers`)
- `src/systems/laser-storm.js` — sibling extraction (if S7R-082 done)
- `src/utils/math.js` — `quantize()` (moved here by S7R-082)
- `docs/research/S7R-063-main-extraction.md` — extraction strategy

**Files to modify:**
1. `src/systems/danger-beam.js` (create new) — exports: `getDangerBeamOscillation`, `drawDangerBeam`, `getDangerBeamGeometry`, `updateDangerBeamEmbers`, `drawDangerBeamEmbers`
2. `src/main.js` — import from danger-beam.js, remove extracted functions, add wrapper if needed
3. `src/constants.js` — add `DANGER_BEAM.*` constants (oscillation step, ember/sizzle physics)

**DO NOT modify:** Any test files, any other source modules besides the three listed

**Gotchas:**
- `getDangerBeamGeometry` is called by beam-harvest functions (S7R-084). Export it so beam-harvest.js can import it later.
- `drawDangerBeam` uses `quantize()` (from S7R-082's `src/utils/math.js`), `getAdaptiveCapValue`, and `estimateCharacterNormal` (from `src/utils/sprite.js`). Import directly or pass as params.
- `updateDangerBeamEmbers` reads `S.dangerEmbers`, `S.dangerSizzles`, `S.dangerEmberSpawnCarry` plus adaptive caps. Use wrapper pattern.
- `DANGER_BEAM_OSC_STEP_MS` (line 510) moves to constants.js.
- `drawDangerBeam` has complex rendering with multiple gradients — ensure `ctx` is passed as param.
- Depends on S7R-082 completing first (quantize must be in utils/math.js).
- Net lines in main.js must decrease (rule 10).

**Acceptance criteria:**
- [ ] `src/systems/danger-beam.js` exists with all danger beam functions exported
- [ ] `getDangerBeamGeometry` is exported (needed by S7R-084 beam harvest)
- [ ] `src/main.js` imports and calls danger-beam functions — no danger beam code remains inline
- [ ] `DANGER_BEAM_OSC_STEP_MS` moved to constants.js
- [ ] main.js is shorter by ~280+ net lines
- [ ] `npm run test` passes (all existing tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-084 Ready Brief

**What:** Extract the beam harvest mechanic from `src/main.js` into `src/systems/beam-harvest.js`. This is the "portal" system where 6/7s are captured, charged, and erupted during the regular beam phase. Move beam-harvest magic numbers to `src/constants.js`.

**Reference files to read first:**
- `src/main.js` lines 2846–3017 (`getRegularBeamPortalState`, `isNumberInsideRegularBeam`, `triggerRegularBeamEruption`, `registerRegularBeamCapture`, `updateRegularBeamHarvest`, `drawRegularBeamEruptionNumbers`)
- `src/systems/danger-beam.js` — sibling extraction, provides `getDangerBeamGeometry` (if S7R-083 done)
- `docs/research/S7R-063-main-extraction.md` — extraction strategy

**Files to modify:**
1. `src/systems/beam-harvest.js` (create new) — exports: `getRegularBeamPortalState`, `isNumberInsideRegularBeam`, `triggerRegularBeamEruption`, `registerRegularBeamCapture`, `updateRegularBeamHarvest`, `drawRegularBeamEruptionNumbers`
2. `src/main.js` — import from beam-harvest.js, remove extracted functions, add wrapper if needed
3. `src/constants.js` — add `BEAM_HARVEST.*` constants if applicable

**DO NOT modify:** Any test files, any other source modules besides the three listed

**Gotchas:**
- `getRegularBeamPortalState` and `isNumberInsideRegularBeam` are called from the main game loop collision detection — check all call sites.
- `triggerRegularBeamEruption` and `registerRegularBeamCapture` are called from game logic that needs state context — wrapper pattern recommended.
- `getDangerBeamGeometry` is imported from `src/systems/danger-beam.js` (S7R-083). If S7R-083 isn't done yet, this ticket is blocked.
- `drawRegularBeamEruptionNumbers` uses `ctx` — pass as param.
- `updateRegularBeamHarvest` reads harvest state arrays — pass as params or via wrapper.
- `random()` closure must be passed as `rng` param.
- This is the smallest extraction (~170 lines). Net lines in main.js must decrease (rule 10).

**Acceptance criteria:**
- [ ] `src/systems/beam-harvest.js` exists with all beam harvest functions exported
- [ ] Imports `getDangerBeamGeometry` from `src/systems/danger-beam.js`
- [ ] `src/main.js` imports and calls beam-harvest functions — no beam harvest code remains inline
- [ ] main.js is shorter by ~140+ net lines
- [ ] `npm run test` passes (all existing tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-085 Ready Brief

**What:** Write unit tests for `src/ui/hud-updates.js`. Cover the factory pattern, DOM update methods, pulse class toggling, visibility toggles, and graceful fallback when DOM elements are missing.

**Reference files to read first:**
- `src/ui/hud-updates.js` — the module under test (169 lines, factory export: `createHudUpdater` returning object with 8 methods)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern
- `tests/unit/config/debug-panel.test.js` — pattern for testing DOM-dependent modules

**Files to modify:**
1. `tests/unit/ui/hud-updates.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `createHudUpdater` takes a config object with `document` — mock the document to provide fake elements
- Methods like `updateLivesDisplay`, `updateShipHpBar`, `updatePowerBar` set DOM properties — verify they update textContent/style correctly
- Pulse class toggle: `pulseElement` adds/removes a CSS class with a timeout — mock timers
- When elements are missing from the document, methods should not throw — test null element fallback
- The factory returns an object, not a class — test multiple instances don't share state

**Acceptance criteria:**
- [ ] `createHudUpdater` tested: returns object with all expected methods
- [ ] `updateLivesDisplay` tested: correct DOM updates for various life counts
- [ ] `updateShipHpBar` tested: width/color changes at boundary HP values
- [ ] `updatePowerBar` tested: height updates, low-power visual state
- [ ] Missing-element fallback tested: no throws when elements are null
- [ ] Pulse class toggle tested with timer mocks
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-086 Ready Brief

**What:** Write unit tests for `src/systems/lives.js`. Cover `loseLife` boundary behavior, `checkExtraLife` thresholds, invincibility alpha output range, and edge cases.

**Reference files to read first:**
- `src/systems/lives.js` — the module under test (65 lines, 5 exports: `resetLives`, `isInvincible`, `loseLife`, `checkExtraLife`, `getInvincibilityAlpha`)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern
- `src/constants.js` — lives-related constants if any

**Files to modify:**
1. `tests/unit/systems/lives.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `loseLife` should not go below 0 lives — test with lives=1 and lives=0
- `checkExtraLife` has score thresholds — test at, below, and above each threshold
- `checkExtraLife` should not award duplicate extra lives for the same threshold — test repeated calls with same score
- `getInvincibilityAlpha` should return values in [0.3, 1] range while invincible — test output bounds
- `isInvincible` uses time-based check — test with `now` at boundary of invincibility window
- `resetLives` should restore to initial state — test after damage/extra-life modifications

**Acceptance criteria:**
- [ ] `resetLives` tested: initial state correct
- [ ] `loseLife` tested: normal, lives=1→0, lives=0 (no underflow)
- [ ] `checkExtraLife` tested: threshold boundaries, no duplicate awards
- [ ] `isInvincible` tested: during and after invincibility window
- [ ] `getInvincibilityAlpha` tested: output range [0.3, 1], returns 1 when not invincible
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-087 Ready Brief

**What:** Write unit tests for `src/systems/support-registry.js`. Cover factory creation, unit registration, duplicate ID handling, input normalization, and snapshot immutability.

**Reference files to read first:**
- `src/systems/support-registry.js` — the module under test (65 lines, factory export: `createSupportRegistry`)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern
- `src/systems/enemy-registry.js` — sibling registry pattern (frozen objects)

**Files to modify:**
1. `tests/unit/systems/support-registry.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `createSupportRegistry` is a factory — test it returns the expected API
- Registering a unit with a duplicate ID may overwrite — test and document behavior
- Invalid inputs (null, missing fields) should be handled gracefully — test normalization
- `getAllSupportUnits` should return an immutable snapshot — test that modifying the returned array doesn't affect internal state
- The registry may use `Object.freeze` — verify frozen behavior in tests

**Acceptance criteria:**
- [ ] `createSupportRegistry` tested: returns object with expected methods
- [ ] Registration tested: add unit, retrieve by ID
- [ ] Duplicate ID tested: verify overwrite or rejection behavior
- [ ] Invalid input tested: null, undefined, missing required fields
- [ ] Snapshot immutability tested: modifying returned array doesn't corrupt registry
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-088 Ready Brief

**What:** Write unit tests for `src/core/run-rng.js`. Cover seed override precedence, deterministic vs non-deterministic modes, draw-count reset per run, and tracker state.

**Reference files to read first:**
- `src/core/run-rng.js` — the module under test (56 lines, factory export: `createRunRngTracker` with 4 methods)
- `src/utils/rng.js` — the seeded PRNG it wraps
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern

**Files to modify:**
1. `tests/unit/core/run-rng.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `createRunRngTracker` takes config with optional seed — test with and without explicit seed
- Deterministic mode: same seed should produce same sequence — test reproducibility
- Non-deterministic mode: different calls should produce different sequences (probabilistic test, use multiple draws)
- `start()` resets the draw count — test that count resets to 0
- Draw count increments on each `random()` call — verify monotonic increase
- Query string seed override: if the factory supports `?seed=X`, test that it takes precedence over config seed

**Acceptance criteria:**
- [ ] Factory tested: creates tracker with expected methods (start, random, getDrawCount, getSeed)
- [ ] Deterministic mode tested: same seed → same sequence across multiple runs
- [ ] Non-deterministic mode tested: no explicit seed → varying output
- [ ] Draw-count tested: resets on start(), increments on random()
- [ ] Seed precedence tested: explicit seed overrides default
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-089 Ready Brief

**What:** Write unit tests for `src/utils/sprite.js`. Cover alpha sampling bounds, null canvas context guards, cache hit behavior, and `estimateCharacterNormal` fallback vectors.

**Reference files to read first:**
- `src/utils/sprite.js` — the module under test (183 lines, 9 exports including `getTransparentSprite`, `sampleSpriteAlpha`, `hitVisibleCharacterPixel`, `estimateCharacterNormal`)
- `tests/unit/supports/medic-firefly.test.js` — gold standard test pattern

**Files to modify:**
1. `tests/unit/utils/sprite.test.js` (create new)

**DO NOT modify:** Any source files — test-only ticket

**Gotchas:**
- `getTransparentSprite` and `getSpriteAlphaData` need canvas context mocking — create minimal mock with `getImageData` returning known pixel data
- `sampleSpriteAlpha` takes normalized UV coords (0–1) — test boundary values (0, 1, out-of-range)
- `estimateCharacterNormal` uses spatial sampling and falls back to `(fallbackVx, fallbackVy)` — test both computed and fallback paths
- `hitVisibleCharacterPixel` takes a targets array — test with empty targets, single target, multiple targets
- Cache behavior: repeated calls with same image should reuse cached data — verify with spy/mock
- `drawImageWithTransparencyKey` is a thin wrapper — basic smoke test is sufficient
- `isVisibleOnBody` and `isVisibleOnHand` have different coordinate systems — test both

**Acceptance criteria:**
- [ ] `sampleSpriteAlpha` tested: valid UV coords, boundary (0, 1), out-of-range
- [ ] `getTransparentSprite` tested: returns cached sprite, handles null context
- [ ] `hitVisibleCharacterPixel` tested: empty targets, hit, miss
- [ ] `estimateCharacterNormal` tested: computed normal, fallback when sampling fails
- [ ] `isVisibleOnBody` and `isVisibleOnHand` tested: inside/outside bounds
- [ ] Cache reuse tested: same input returns cached result
- [ ] All new tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

#### S7R-090 Ready Brief

**What:** Split the monolithic `loop()` function (~667 lines) in `src/main.js` into distinct update and draw phases. Create `updateGame(now, dt)` and `drawGame(now)` functions so `loop()` becomes a thin orchestrator: compute dt, call update, call draw, requestAnimationFrame. Pure refactor — zero behavior change.

**Reference files to read first:**
- `src/main.js` lines 2420–3087 — the current `loop()` function
- The existing extracted system wrappers (laser storm, danger beam, beam harvest, badguys, world-render) for patterns

**Files to modify:**
1. `src/main.js` — split `loop()` internals into `updateGame()` and `drawGame()`

**DO NOT modify:** Any other source files or test files

**Gotchas:**
- Title screen and victory branches have their own update+draw interleaved — split those too (`updateTitle`/`drawTitle`, `updateVictory`/`drawVictory`)
- Camera shake calculation happens between update and draw (it depends on updated state but feeds into draw transforms) — keep it at the boundary
- Some draw calls depend on values computed during update in the same frame (e.g. `shakeX`) — pass via local variables or a frame context object
- `ctx.save()`/`ctx.restore()` and `ctx.translate()` for camera shake wraps the entire draw phase — keep that in `loop()` or in `drawGame()`
- `S.lifeLossFlash`, `S.slowMoTimer` updates use `rawDt` not `dt` — make sure the split preserves which dt each uses
- `requestAnimationFrame(loop)` stays in `loop()` only
- This is a refactor inside the IIFE — no new exports needed
- Net lines in main.js must stay the same or decrease (rule 10 — slight increase OK since we're adding function boundaries)

**Acceptance criteria:**
- [ ] `loop()` is ≤30 lines — just dt calc, branching, update/draw calls, rAF
- [ ] `updateGame(now, dt, rawDt)` contains all state mutation logic
- [ ] `drawGame(now)` contains all canvas rendering
- [ ] Title screen and victory paths also split into update/draw
- [ ] No behavior change — game plays identically
- [ ] All existing tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

### Tooling tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-056 | Single-file HTML dashboard that parses TICKETS.md and shows project status with color-coded tickets, progress bar, phase timeline, ownership chart. Zero dependencies. | done | — |

## Optional / Post-V1
| Ticket | Name | Status | Notes |
|--------|------|--------|-------|
| S7R-049 | Command Energy | skip | Reuse power meter unless proven insufficient |

## Rules
1. **Claim before you start**: set status to `wip:yourname` and fill in branch + owner.
2. **One owner per ticket**: no two workers on the same ticket.
3. **main.js lock**: only one worker modifies `src/main.js` at a time. Before editing main.js, check the lock below. If held, work on something else or ask Steven to coordinate. Update the lock when you claim/release.
4. **Update on completion**: set to `review` when PR is ready, `done` when merged.
5. **Dependency check**: before starting, verify all `Depends` tickets are `done` on main.
6. **QA rule**: every `review` ticket gets QA'd by Claude Code before merging to main. Claude sets status to `reviewing` when starting QA, then `done` on pass or back to `review` with notes on fail.
7. **Build gate**: every branch must pass `npx vite build` before marking `review`. If it doesn't build, it's not ready.
8. **Don't invent scope**: implement exactly what the ticket spec says. No bonus features, no "while I'm here" refactors. If you see something worth doing, note it in your PR description — don't do it.
9. **Match existing patterns**: read `src/systems/power.js` and `src/config/flags.js` for module style. Use the same export conventions, JSDoc style, and error handling patterns.
10. **Progressive extraction**: every ticket that modifies `src/main.js` must leave it shorter (net lines ≤ 0). Extract, don't add.
11. **No shared state mutation from modules**: modules receive state as params or import `S` from `src/state.js`. Never create a second mutable singleton.
12. **Conflict protocol**: if your branch has merge conflicts with main, rebase onto latest main and re-run `npx vite build` before marking `review`. Don't merge broken code.
13. **Stay informed**: (a) Steven routes tasks and relays cross-worker changes. (b) Every PR describes files changed and exports added/modified. (c) Every merge gets a one-liner in the Merge Log below. Workers: read the last few log entries when starting a session.
14. **Start with TL;DR**: every ticket update must begin with a plain-language TL;DR before technical details.

## main.js Lock
**Currently held by**: wip:claude (S7R-090)
**Format**: `wip:platform (S7R-###)` or `nobody (unlocked)`
**Rule**: update this line in your first commit. Release when your branch merges to main.
**Queue**: _(empty)_
> When you need main.js, write your name here. When done, clear it and notify the next in queue.

## Story Log
> The story of building Six Seven Ranch, told one chapter at a time. Add a new entry when something meaningful happens.

### February 12, 2026
We started building Six Seven Ranch — a mobile arcade game where you protect cute number creatures from an alien ship. In one day, three AI platforms (Claude, Codex, and Gemini) built the entire foundation: feature flags, a test harness, mobile-safe layout, enemy AI, an action button system, two support units (a healing firefly and a diving hawk), and made it installable as a phone app. 18 of 22 tasks done.

### February 13, 2026
Built a project dashboard so we can see where everything stands. The game is ready for its first playtest — Steven needs to play it on his phone and see if it's fun.

The game found its story. The numbers aren't just numbers — they're alien kids at recess. The 6s and 7s are having the time of their lives, and the alien ship overhead? That's their parents coming to pick them up. But the kids don't want to go home yet. Your job is to help them stay out a little longer. The harvester's tractor beam is a parent scooping up a kid. The firefly is a friend helping someone hide. The hawk throws a distraction.

We ran our first Codex vs Gemini race on S7R-057 (shared defensive helpers). Both passed all tests, but Codex won — cleaner diff, caught a gotcha Gemini missed, and didn't bloat TICKETS.md. Added three new rules to CLAUDE.md based on lessons learned.

## Merge Log
> Every merge to main gets a one-liner here. Workers: read the last few entries when starting a session to see what changed since you last pulled.

| Date | Ticket | What changed | Who |
|------|--------|-------------|-----|
| 2025-02-12 | S7R-001 | `src/config/flags.js`, `src/config/debug-panel.js` — feature flag system + debug panel | codex |
| 2025-02-12 | S7R-002 | `src/utils/rng.js`, `src/core/run-rng.js` — seeded PRNG | codex |
| 2025-02-12 | S7R-003 | `src/systems/telemetry.js` — telemetry scaffold | codex |
| 2025-02-12 | S7R-004 | `vitest.config.js`, `tests/` — test harness | codex |
| 2025-02-12 | S7R-005 | CSS safe areas via flag class toggle | codex |
| 2025-02-12 | S7R-007 | `src/config/accessibility-settings.js`, `src/ui/settings-panel.js` | codex |
| 2025-02-12 | S7R-008 | `src/systems/adaptive-quality.js` | codex |
| 2025-02-12 | S7R-010 | `src/systems/enemy-registry.js` | codex |
| 2025-02-12 | S7R-011 | `src/systems/enemy-state-machine.js` — enemy lifecycle runtime | codex |
| — | infra | `TICKETS.md`, `CLAUDE.md`, plan updates — multi-platform workflow | claude |
| 2026-02-12 | S7R-046 | `src/ui/action-bar.js`, `action-bar-config.js`, `hud-updates.js` — action button UI framework, flag-gated, main.js -9 lines | claude |
| 2026-02-12 | S7R-018 | `src/enemies/harvester.js`, `tests/unit/enemies/harvester.test.js` — V1 Harvester tractor-beam enemy | codex |
| 2026-02-12 | S7R-038 | `public/manifest.json`, `src/service-worker.js` — PWA manifest + cache-first SW, flag-gated | codex |
| 2026-02-12 | S7R-015 | `src/enemies/skimmer.js`, `tests/unit/enemies/skimmer.test.js` — V1 Skimmer lateral dash harassment enemy | codex |
| 2026-02-12 | S7R-047 | `src/core/input.js`, `src/config/flags.js`, `tests/unit/input/multi-touch.test.js` — flag-gated multi-touch move/action arbitration | codex |
| 2026-02-12 | S7R-048 | `src/ui/action-router.js`, `src/ui/action-bar-config.js`, `src/main.js` — button-mapped powers routing with cooldown/cost gates | codex |
| 2026-02-12 | S7R-050 | `src/systems/support-runtime.js`, `src/systems/support-registry.js` — support runtime lifecycle + registry foundation, flag-gated with unit tests | codex |
| 2026-02-12 | S7R-051 | `src/supports/medic-firefly.js` — healing pulse support unit, fractional heal progress, flag-gated | codex |
| 2026-02-12 | S7R-053 | `src/supports/striker-hawk.js` — dive-strike support unit, threat-priority targeting, flag-gated | gemini |
| 2026-02-13 | S7R-056 | `dashboard.html` — standalone project dashboard, parses TICKETS.md, zero dependencies | codex |
| 2026-02-13 | S7R-057 | `src/utils/defensive.js` — extracted toFinite, toNonNegativeFinite, clamp from 11 files into shared module | codex |
| 2026-02-14 | S7R-058 | `src/config/debug-panel.js` + 6 modules — added destroy() methods, fixed listener leaks | codex |
| 2026-02-14 | S7R-059 | `src/main.js`, `src/systems/adaptive-quality.js` — hard-cap danger embers (300) and sizzles (150) | gemini |
| 2026-02-14 | S7R-060 | `src/main.js`, `src/game-objects/projectile.js`, `src/systems/adaptive-quality.js` — gradient caching, shadow blur gating | codex |
| 2026-02-14 | S7R-061 | `src/main.js`, medic/striker/support-runtime/harvester — swap-and-pop, debug gating, array reuse | codex |
| 2026-02-14 | infra | GitHub Pages deployment, asset path fix, action bar flags enabled, mobile HUD redesign | claude |
| 2026-02-14 | S7R-070 | `src/styles.css`, `src/ui/hud-updates.js` — power bar moved to vertical left rail (retroactive ticket) | codex |
| 2026-02-14 | S7R-073 | `src/game-objects/projectile.js`, `src/constants.js`, `src/ui/action-router.js` — energy bolt orb + 4 color themes + trail VFX + 1.2s cooldown | gemini |
| 2026-02-14 | S7R-071 | `src/game-objects/shield.js`, `src/constants.js`, `src/utils/defensive.js` — sparkle particles, electric arcs, degradation, impact bursts, 4s cooldown, cost 30 | codex |
| 2026-02-14 | S7R-072 | `src/main.js`, `src/ui/action-router.js` — slam shockwave VFX overhaul: dual rings, debris particles, screen shake, ship/entity push, haptic feedback, cost fix (POWER.SLAM_COST) | codex |
| 2026-02-15 | S7R-074 | `tests/integration/flags-boot.test.js` — fix 2 failing tests: check actual flag defaults dynamically instead of assuming all-false | codex |
| 2026-02-15 | S7R-063 | `docs/research/S7R-063-main-extraction.md` — top 5 main.js extraction candidates: laser storm, danger beam, world scenery, badguys, beam harvest (~1300 lines) | gemini |
| 2026-02-15 | S7R-069 | `docs/research/S7R-069-magic-numbers.md` — ~35 hardcoded scene-tuning values cataloged with suggested SCENE.* constant names | gemini |
| 2026-02-15 | S7R-064 | `docs/research/S7R-064-test-gaps.md` — full test gap audit: 16/35 modules untested, 4 pattern violations, 17 prioritized test additions | codex |
| 2026-02-15 | S7R-062 | `docs/research/S7R-062-tunable-constants.md` — 60+ tunable constants cataloged across 6 systems for S7R-054 polish pass | gemini |
| 2026-02-15 | S7R-075 | `tests/unit/game-objects/shield.test.js` — 6 tests: activate/cooldown, update/expire, alpha, draw quality caps | codex |
| 2026-02-15 | S7R-076 | `tests/unit/game-objects/projectile.test.js` — 7 tests: fire/cap, collision, movement/trail, offscreen, trail bounds, draw caps | codex |
| 2026-02-15 | S7R-077 | `tests/unit/systems/progression.test.js` — 11 tests: phase thresholds, victory idempotent, HP ratio, multipliers, effects | codex |
| 2026-02-15 | S7R-078 | `tests/unit/systems/power.test.js` — 11 tests: charge/cap, spend, canAfford, drain, ratio clamp, NaN guards | codex |
| 2026-02-15 | S7R-079 | `tests/unit/config/debug-panel.test.js` — 5 tests: init/destroy lifecycle, keyboard toggle, listener leak check, flag rendering | codex |
| 2026-02-15 | S7R-080 | `src/systems/world-render.js`, `src/constants.js`, `src/main.js` — extracted world scenery (sky, stars, hills, barn, ground, grass) into module, added SCENE.* constants, main.js −230 net lines | claude |
| 2026-02-15 | S7R-081 | `src/systems/badguys.js`, `src/constants.js`, `src/main.js` — extracted badguys flight controller (bounds, targeting, flight physics, state) into module, added SCENE.BADGUYS_* constants, main.js −108 net lines | claude |
| 2026-02-16 | S7R-082 | `src/systems/laser-storm.js`, `src/utils/math.js`, `src/constants.js`, `src/main.js` — extracted laser storm (beams, gradients, smoke) into module, moved quantize() to utils/math.js, added SCENE.LASER_* constants, main.js −345 net lines | claude |
| 2026-02-16 | S7R-087 | `tests/unit/systems/support-registry.test.js` — 6 tests: factory API, registration/normalization, duplicate ID overwrite, invalid input rejection, snapshot immutability | codex |
| 2026-02-16 | S7R-085 | `tests/unit/ui/hud-updates.test.js` — 8 tests: factory isolation, lives display, pulse toggle, HP bar colors/boundaries, power bar near-full, visibility toggles, missing-element fallback, destroy no-op | codex |
| 2026-02-16 | S7R-086 | `tests/unit/systems/lives.test.js` — 7 tests: resetLives, loseLife boundary/underflow, checkExtraLife thresholds/duplicates/MAX cap, isInvincible boundary, alpha range | codex |
| 2026-02-16 | S7R-088 | `tests/unit/core/run-rng.test.js` — 9 tests: deterministic seeding, non-deterministic variation, draw count, tracker API, start() reset, seed override via query string, invalid seed fallback, monotonic draw count | gemini |
| 2026-02-16 | S7R-089 | `tests/unit/utils/sprite.test.js` — 8 tests: alpha sampling bounds, transparent sprite cache + null context, alpha data cache, drawImageWithTransparencyKey, body/hand visibility, hitVisibleCharacterPixel, estimateCharacterNormal + fallbacks | codex |
| 2026-02-16 | S7R-083 | `src/systems/danger-beam.js`, `src/constants.js`, `src/main.js` — extracted danger beam (oscillation, rendering, geometry, ember/sizzle particles) into module, added ~50 SCENE.DANGER_* constants, removed unused sprite/math imports, main.js −314 net lines | claude |
| 2026-02-16 | S7R-084 | `src/systems/beam-harvest.js`, `src/main.js` — extracted beam harvest (portal state, capture, eruption, physics, draw) into module with callback pattern for side effects, main.js −139 net lines | claude |
