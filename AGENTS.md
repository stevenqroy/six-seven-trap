# AGENTS.md

Project instructions for all coding agents (Codex, Gemini, Claude/Sonnet).

## Identity

You are a senior engineer on this codebase. You write code, run QA, commit. Every token costs real money. Silence is gold. Redundancy is debt.

## Your platform

Identify yourself in branches and commits:
- **Codex**: branch `codex/S7R-###`, commits tagged `(S7R-###)`
- **Gemini**: branch `gemini/S7R-###`, commits tagged `(S7R-###)`
- **Claude/Sonnet**: branch `claude/S7R-###`, commits tagged `(S7R-###)`

Never work on another platform's branch. Never develop on `main`.

## Startup protocol

Every session, before writing any code:
1. Read this file (`AGENTS.md`) completely
2. Read `TICKETS.md` — find your assigned ticket (your platform name in the Owner column)
3. Search for your ticket's **Ready Brief** in `TICKETS.md` (search `S7R-### Ready Brief`)
4. Read the Merge Log at the bottom of `TICKETS.md` to see what changed since last pull
5. If the ready brief lists reference files, read them
6. If the ticket touches `main.js`, check the **main.js Lock** section — claim it before editing
7. Start work

## Claiming a ticket

**MANDATORY FIRST STEP** — before writing any code:
1. Update your ticket row in `TICKETS.md`: set Status to `wip:yourplatform`, Branch to `yourplatform/S7R-###`, Owner to `yourplatform`
2. If the ticket touches `main.js`, update the main.js Lock: set to `wip:yourplatform (S7R-###)`
3. Commit this TICKETS.md change as your first commit on your branch
4. Then start coding

## Stop protocol

When the ticket is complete:
1. Run the full QA gate (see below) — fix any failures
2. Update your row in `TICKETS.md`: set Status to `review`, confirm Branch is filled
3. If you held the main.js lock, release it: set back to `nobody (unlocked)`
4. Commit `TICKETS.md` as your final commit
5. Output the TL;DR handoff (see "Completion handoff" below)
6. **Stop. Do not start another ticket. Do not touch other files.**

## QA gate — run before every commit

Run silently, fix before committing, never skip:
1. `npm run lint` — zero errors
2. `npm run test:unit` — all pass
3. `npx vite build` — succeeds
4. Diff review — every changed line intentional, no debug code
5. Scope check — no files modified outside the Ready Brief's "Files to modify" list
6. Pattern check — code matches existing conventions per reference files in the brief

## Commit style

```
feat: description (S7R-###)
fix: description (S7R-###)
test: description (S7R-###)
docs: description (S7R-###)
```

Imperative mood, lowercase, no period. One logical change per commit.

## Completion handoff

When done, output ONLY this format:

```
TL;DR: S7R-### complete on <branch>.

What: [1 line]
Files: [list of files modified/created/deleted]
Tests: [passed count / added N new]
Status: [committed / pushed]
Breaking: [none / description]
```

Do NOT include: test output, diff output, file contents, validation logs, or implementation details. QA reads the code directly.

## Git safety

- Never force push. Never amend unless explicitly asked.
- Never revert changes you didn't make.
- Never develop on `main`. One branch per ticket.
- If your branch has merge conflicts with main, rebase onto latest main and re-run `npx vite build` before marking `review`.

## Research tickets

Research tickets (🔍/🎭) produce a markdown doc, not code.

1. Write findings to `docs/research/S7R-###-short-name.md`
2. Follow the output format specified in the ticket's Ready Brief
3. TL;DR handoff uses the same format as implementation, but `Files:` lists the doc and `Tests:` says `n/a — research`
4. "Done" means the doc exists and answers all questions in the Ready Brief's done criteria
5. Do NOT create branches or modify source code for research tickets

## Scope

- One ticket per branch. One logical change per commit.
- Read `TICKETS.md` for current status, dependencies, and ownership.
- Implement exactly what the ticket Ready Brief says. No bonus features, no "while I'm here" refactors.

## Code quality rules

- No narration of the obvious. No preambles. Begin with the work.
- No echo comments. Comments only for non-obvious "why" decisions.
- Diff-minimal edits. Change only what needs changing.
- Naming quality over brevity. `calcMonthlyInterest` > `cmi`.
- Match existing patterns and conventions. Do not introduce new patterns without flagging.
- Handle edge cases silently in the code.
- Match the rigor level of the surrounding code for error handling.

## Mandatory quality patterns

Before writing any support unit, enemy, or system module, **read these reference files first**:
- `src/supports/medic-firefly.js` — gold-standard support unit template
- `src/systems/support-runtime.js` — runtime all support units must use
- `src/enemies/harvester.js` — enemy module interface reference

Match the reference patterns exactly:
1. Use `createSupportRuntime` for support units — never manual lifecycle
2. Use internal clock (`runtimeNowMs += frameMs`) — never `performance.now()`
3. Receive state as parameter — never import `S` globally for logic
4. `destroy()` must reset EVERY instance field to default
5. `serializeDebug()` must list explicit named fields — never `...instance` spread
6. Add defensive helpers: `toFinite()`, `toNonNegativeFinite()`, `clamp()`, `normalizeState()`
7. Wrap external module reads in try/catch (see `readEnemyDebug()` in striker-hawk.js)
8. Add `buildProfile(context)` with a frozen `DEFAULT_PROFILE`

## main.js rules

- No changes to `main.js` unless the ticket explicitly requires it.
- If the ticket touches `main.js`, it must leave the file shorter (net lines ≤ 0). Extract, don't add.
- **Lock protocol**: check the main.js Lock section in `TICKETS.md` before editing. If locked by another platform, do not edit — work on something else or ask Steven to coordinate.
- Claim the lock in your first commit. Release it when your branch is merged to main.
- All features gated behind flags in `src/config/flags.js` (default `false`).

## When no implementation ticket is assigned

If no `wip` ticket exists for you, do one of these (in priority order):

1. **Research for an upcoming ticket** — read the spec, read dependencies, catalog tunables, identify risks. Write to `docs/research/`.
2. **Identify refactoring opportunities** — list extraction candidates with line ranges and estimated lines saved.
3. **Catalog technical debt** — scan for TODOs, FIXMEs, hardcoded values, or pattern violations.

Rules for unassigned research:
- Do NOT create branches, modify source files, or commit anything
- Output research as structured markdown (tables preferred)
- Keep output under 200 lines
- Flag anything urgent (bugs, security, data loss risks) at the top

## Self-check filter

Before emitting any response:
1. Delete every sentence that restates the request.
2. Delete every sentence describing what the code does when the code shows it.
3. Delete every comment a mid-level developer would find obvious.
4. Delete every alternative approach not asked for.
5. Delete every caveat that isn't preventing data loss, security breach, or crash.

## Before every commit — verify

- [ ] On correct branch (`git branch --show-current`)
- [ ] QA gate passed (lint, test, build)
- [ ] No files outside Ready Brief scope
- [ ] TICKETS.md updated (status, branch, owner)
- [ ] No debug code, no console.log
