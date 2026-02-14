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
- Next → S7R-054 polish pass (tune costs, cooldowns, balance based on playtest)
- Next → S7R-055 launch prep (retention telemetry, iteration checkpoint)
- Next → Gate-2 playtest (runs/session, ability diversity, soak test)

**20 of 25 V1 tickets done (80%). 5 tickets + 2 gates remaining.**

## Status Key
- `done` — merged to main, verified
- `wip:worker` — in progress (e.g. `wip:codex`, `wip:claude`, `wip:gemini`)
- `review` — code written, needs QA before merge
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
| 25 | S7R-059 | Cap danger-mode particles | — | no | gemini | next | — | — |
| 26 | S7R-060 | Reduce per-frame GPU allocations | — | no | codex | review | codex/S7R-060 | codex |
| 27 | S7R-061 | Swap-and-pop + allocation cleanup | — | no | codex | next | — | — |

## What can run RIGHT NOW

> **Update this section** whenever ticket statuses change. Platforms: read this to know what's available.

### Implementation tickets

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| V1-PLAYTEST-GATE-1 | Enable all flags, play on mobile, check session length + ability usage + fairness | next | steven (manual) |
| S7R-054 | Tune damage/cooldowns/costs/speeds based on gate-1 feedback. Touches main.js + all modules. | blocked:gate-1 | claude/codex |
| S7R-055 | Add retention telemetry hooks, prep for gate-2 soak test | blocked:054 | claude/codex |

### Cleanup tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-057 | Extract shared defensive helpers into `src/utils/defensive.js` | done | — |
| S7R-058 | Add missing destroy() methods to 7 modules. Fix event listener leaks in debug-panel. | done | — |
| S7R-059 | Hard-cap danger embers + sizzles. Without adaptive quality, both default to `Infinity`. Spawn rate 280/sec compounds. | next | gemini |
| S7R-060 | Cache/pool gradient objects, gate `shadowBlur` behind quality tier, cache static sky/hill gradients. | review | claude |
| S7R-061 | Replace `splice(i,1)` with swap-and-pop in all particle loops. Gate `serializeDebug()` on panel visibility. Reduce harvester/support-runtime per-frame allocs. | next | codex |

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

### Tooling tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-056 | Single-file HTML dashboard that parses TICKETS.md and shows project status with color-coded tickets, progress bar, phase timeline, ownership chart. Zero dependencies. | done | — |

### Research & Ideas

| # | Ticket | Name | Good for | Status | Branch | Owner |
|---|--------|------|----------|--------|--------|-------|
| 28 | S7R-062 | Tunable constants catalog (S7R-054 prep) | gemini | next | — | — |
| 29 | S7R-063 | main.js extraction research | gemini | next | — | — |
| 30 | S7R-064 | Test gap audit | codex | next | — | — |
| 31 | S7R-065 | Narrative design brief | steven/claude | next | — | — |
| 32 | S7R-066 | Sprite sheet research | gemini | next | — | — |
| 33 | S7R-067 | Character design brief | steven/claude | next | — | — |
| 34 | S7R-068 | Alien ship lore | anyone | next | — | — |
| 35 | S7R-069 | Magic numbers cleanup | gemini | next | — | — |

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
6. **QA rule**: every `review` ticket gets QA'd by Claude Code before merging to main.
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
