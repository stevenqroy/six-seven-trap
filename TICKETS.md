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

**24 of 30 V1 tickets done (80%). 6 tickets + 2 gates remaining.**

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
| 32 | S7R-074 | Fix flags-boot integration tests (2 failing) | — | no | codex/gemini | reviewing | codex/S7R-074 | codex |

## What can run RIGHT NOW

> **Update this section** whenever ticket statuses change. Platforms: read this to know what's available.

### Implementation tickets

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| V1-PLAYTEST-GATE-1 | Enable all flags, play on mobile, check session length + ability usage + fairness | next | steven (manual) |
| S7R-054 | Tune damage/cooldowns/costs/speeds based on gate-1 feedback. Touches main.js + all modules. | blocked:gate-1 | claude/codex |
| S7R-055 | Add retention telemetry hooks, prep for gate-2 soak test | blocked:054 | claude/codex |

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
| S7R-074 | Fix 2 failing flags-boot integration tests (assume all defaults false, but 4 are now true) | review | codex |
| S7R-059 | Hard-cap danger embers + sizzles. Without adaptive quality, both default to `Infinity`. Spawn rate 280/sec compounds. | done | — |
| S7R-060 | Cache/pool gradient objects, gate `shadowBlur` behind quality tier, cache static sky/hill gradients. | done | — |
| S7R-061 | Replace `splice(i,1)` with swap-and-pop in all particle loops. Gate `serializeDebug()` on panel visibility. Reduce harvester/support-runtime per-frame allocs. | done | — |

### Research tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-062 | Catalog every tunable constant (damage, cooldown, speed, radius, cost) across all modules. Output markdown table for S7R-054 polish pass. | next | gemini |
| S7R-063 | Identify top 5 blocks in main.js that should become standalone modules. Line ranges, what they do, lines saved. | next | gemini |
| S7R-064 | Review all modules for missing test coverage, edge cases, pattern violations. Output gap report. | next | codex |
| S7R-065 | Write a one-page story brief: who are the characters, what's the tone, what do enemies/supports represent in-story. 6 and 7 are alien kids at recess, the ship is their parents' minivan. | next | steven/claude |
| S7R-066 | Research sprite sheet formats and tools for small 2D characters (16x16 or 32x32). What format works with canvas? How to animate idle/walk/hit? Free pixel art tools? | next | gemini |
| S7R-067 | Design visual identity for alien kids — what do they look like? Sketch descriptions for all characters. | next | steven/claude |
| S7R-068 | Brainstorm alien ship personality and visual ideas. Does it hover impatiently? Honk? Send stern messages? | next | anyone |
| S7R-069 | Catalog ~30 hardcoded scene-tuning values in main.js (parallax, gradients, wave freq, etc.). Move to constants.js or scene-config module. | next | gemini |

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

### Tooling tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-056 | Single-file HTML dashboard that parses TICKETS.md and shows project status with color-coded tickets, progress bar, phase timeline, ownership chart. Zero dependencies. | done | — |

### Research & Ideas

| # | Ticket | Name | Good for | Status | Branch | Owner |
|---|--------|------|----------|--------|--------|-------|
| 29 | S7R-062 | Tunable constants catalog (S7R-054 prep) | gemini | next | — | — |
| 30 | S7R-063 | main.js extraction research | gemini | next | — | — |
| 31 | S7R-064 | Test gap audit | codex | next | — | — |
| 32 | S7R-065 | Narrative design brief | steven/claude | next | — | — |
| 33 | S7R-066 | Sprite sheet research | gemini | next | — | — |
| 34 | S7R-067 | Character design brief | steven/claude | next | — | — |
| 35 | S7R-068 | Alien ship lore | anyone | next | — | — |
| 36 | S7R-069 | Magic numbers cleanup | gemini | next | — | — |

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
**Currently held by**: _nobody (unlocked)_
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
