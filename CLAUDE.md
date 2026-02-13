# CLAUDE.md

Repository workflow rules for Claude Code in this project.

## Scope

- Follow ticket-by-ticket delivery from `docs/SIX_SEVEN_RANCH_IMPLEMENTATION_PLAN.md`.
- Keep changes scoped to one ticket at a time.
- If a ticket is already complete on `main`, do not create a retroactive branch for it.

## Branching

- Use one branch per ticket.
- Branch name format: `<platform>/S7R-###` or `<platform>/S7R-###-short-name`
  - Platforms: `codex`, `gemini`, `claude`
- Do not develop directly on `main` for ticket work.

## Git safety

- Never run destructive commands (`git reset --hard`, `git checkout --`, history rewrites) unless explicitly requested.
- Do not amend commits unless explicitly requested.
- Do not revert unrelated local changes you did not make.

## Commit policy

- Keep commits focused and atomic.
- Suggested commit style:
  - `feat: ... (S7R-###)`
  - `fix: ... (S7R-###)`
  - `test: ... (S7R-###)`
  - `docs: ... (S7R-###)`

## Validation policy

- During implementation, run targeted tests for touched modules.
- Before opening/merging a ticket PR, run:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run lint`
  - `npm run build`
- Run `npm run test:all` when the ticket affects cross-system runtime behavior or release readiness checks.

## Asset/LFS policy

- Git LFS tracks:
  - `*.mp4`
  - `*.gif`
  - `src/assets/**/*-best.png`
- Raw/intermediate assets are ignored via `.gitignore` and should not be committed.

## PR expectations

- Include ticket id, scope, acceptance criteria, and test evidence.
- Note feature flag behavior and rollback path when applicable.
- Mention residual risks/follow-ups explicitly.

## Communication protocol (multi-platform)

### Code quality rules (all platforms)

- No narration of the obvious. No preambles. Begin with the work.
- No echo comments. Comments only for non-obvious "why" decisions.
- Diff-minimal edits. Change only what needs changing.
- Naming quality over brevity. `calcMonthlyInterest` > `cmi`.
- Match existing patterns and conventions. Do not introduce new patterns without flagging.

### Handoff format: implementation complete → QA

Platforms (Codex, Gemini) report completion using this exact format:

```
TL;DR: S7R-### complete on <branch>.

What: [1 line]
Files: [list of files modified/created/deleted]
Tests: [passed count / added N new]
Status: [committed / pushed]
Breaking: [none / description]
```

Do NOT include: test output, diff output, file contents, validation logs, or implementation details. QA reads the code directly.

### Handoff format: QA result → user

```
S7R-### QA: PASS / FAIL
[If FAIL: what's wrong, 1-2 lines]
[If PASS: merged to main, tests N/N]
```

### Handoff format: new work → implementation platform

Prompts must include:
1. Branch name and base
2. What to build (behavior spec)
3. Reference files to read first
4. Mandatory quality requirements
5. Test requirements
6. Rules (main.js policy, build gate, commit style)

### QA gate (mandatory before merge)

Run silently, fix before merge, never skip:
1. `npm run lint` — zero errors
2. `npm run test:unit` — all pass
3. `npx vite build` — succeeds
4. Diff review — every changed line intentional, no debug code

### Self-check filter (all platforms)

Before emitting any response:
1. Delete every sentence that restates the request.
2. Delete every sentence describing what the code does when the code shows it.
3. Delete every comment a mid-level developer would find obvious.
4. Delete every alternative approach not asked for.
5. Delete every caveat that isn't preventing data loss, security breach, or crash.
