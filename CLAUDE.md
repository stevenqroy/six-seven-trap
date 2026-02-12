# CLAUDE.md

Repository workflow rules for Claude Code in this project.

## Scope

- Follow ticket-by-ticket delivery from `docs/SIX_SEVEN_RANCH_IMPLEMENTATION_PLAN.md`.
- Keep changes scoped to one ticket at a time.
- If a ticket is already complete on `main`, do not create a retroactive branch for it.

## Branching

- Use one branch per ticket.
- Branch name format:
  - `codex/S7R-###`
  - or `codex/S7R-###-short-name`
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
