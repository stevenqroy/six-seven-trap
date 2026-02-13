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

**18 of 22 V1 tickets done (82%). 2 tickets + 2 gates remaining.**

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

## What can run RIGHT NOW

> **Update this section** whenever ticket statuses change. Platforms: read this to know what's available.

### Implementation tickets

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| V1-PLAYTEST-GATE-1 | Enable all flags, play on mobile, check session length + ability usage + fairness | next | steven (manual) |
| S7R-054 | Tune damage/cooldowns/costs/speeds based on gate-1 feedback. Touches main.js + all modules. | blocked:gate-1 | claude/codex |
| S7R-055 | Add retention telemetry hooks, prep for gate-2 soak test | blocked:054 | claude/codex |

### Tooling tickets (no blockers, can start now)

| Ticket | TL;DR | Status | Available to |
|--------|-------|--------|-------------|
| S7R-056 | Single-file HTML dashboard that parses TICKETS.md and shows project status with color-coded tickets, progress bar, phase timeline, ownership chart. Zero dependencies. | done | — |

### Research tasks (no ticket needed)

| Task | TL;DR | Good for |
|------|-------|----------|
| S7R-054 prep | Catalog every tunable constant (damage, cooldown, speed, radius, cost) across all modules. Output markdown table. | codex or gemini |
| main.js extraction | Identify top 5 blocks in main.js that should become standalone modules. Line ranges, what they do, lines saved. | gemini |
| Test gap audit | Review all modules for missing test coverage, edge cases, pattern violations. | codex or gemini |

## Optional / Post-V1
| Ticket | Name | Status | Notes |
|--------|------|--------|-------|
| S7R-049 | Command Energy | skip | Reuse power meter unless proven insufficient |

## Rules
1. **Claim before you start**: set status to `wip:yourname` and fill in branch + owner.
2. **One owner per ticket**: no two workers on the same ticket.
3. **main.js lock**: only one worker modifies `src/main.js` at a time. Current lock holder noted below.
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
**Queue**: _(empty)_
> When you need main.js, write your name here. When done, clear it and notify the next in queue.

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
