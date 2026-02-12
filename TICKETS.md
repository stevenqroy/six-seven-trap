# V1 Ticket Tracker

> **Single source of truth.** Every worker (Claude Code, Codex, Gemini) reads this before starting and updates it when done.
> Commit changes to this file on the working branch. Merge conflicts = discussion needed.

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
| 10 | S7R-046 | Action button UI | — | yes | claude | next | — | — |
| 11 | S7R-047 | Multi-touch move+action | S7R-046 | yes | claude | blocked:046 | — | — |
| 12 | S7R-048 | Button-mapped existing powers | S7R-047 | yes | claude | blocked:047 | — | — |
| 13 | S7R-050 | Support unit runtime | S7R-048 | yes | claude | blocked:048 | — | — |
| 14 | S7R-051 | Medic Firefly support | S7R-050 | no (new module) | codex/gemini | blocked:050 | — | — |
| 15 | S7R-053 | Striker Hawk support | S7R-050 | no (new module) | codex/gemini | blocked:050 | — | — |
| 16 | S7R-018 | V1 Lean Harvester | S7R-010,011 | no (new module) | codex/gemini | next | — | — |
| 17 | S7R-015 | V1 Lean Skimmer | S7R-010,011 | no (new module) | codex/gemini | next | — | — |
| 18 | S7R-038 | PWA foundation | — | no | codex/gemini | next | — | — |
| 19 | — | V1-PLAYTEST-GATE-1 | 10-18 all done | — | steven | blocked:all | — | — |
| 20 | S7R-054 | Polish pass | gate-1 | yes | claude | blocked:gate-1 | — | — |
| 21 | S7R-055 | Launch prep | gate-1 | yes | claude | blocked:gate-1 | — | — |
| 22 | — | V1-PLAYTEST-GATE-2 | 20-21 | — | steven | blocked:all | — | — |

## What can run RIGHT NOW (in parallel)

| Ticket | Platform | Why it's ready |
|--------|----------|----------------|
| S7R-046 | Claude Code | No deps, touches main.js |
| S7R-018 | Codex | Deps (010,011) done, new module only |
| S7R-015 | Gemini | Deps (010,011) done, new module only |
| S7R-038 | Codex or Gemini | No deps, no main.js |

> **Update this section** whenever ticket statuses change.

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

## main.js Lock
**Currently held by**: _nobody (unlocked)_
**Queue**: _(empty)_
> When you need main.js, write your name here. When done, clear it and notify the next in queue.
