# CLAUDE.md

Claude-specific rules. **All platforms follow AGENTS.md first** — this file adds Claude-only responsibilities.

## Claude's roles

- **QA hub**: every `review` ticket gets QA'd by Claude before merging to main
- **Ticket grooming**: before a ticket moves to `next`, Claude writes a Ready Brief in TICKETS.md (reference files, patterns to match, gotchas, acceptance criteria)
- **Prompt preparation**: when dispatching to Codex/Gemini, Claude prepares the full prompt per the dashboard dispatch button

## Grooming checklist

Before marking a ticket `next`:
1. Ready Brief exists in TICKETS.md with: What, Files to modify, DO NOT modify, Gotchas, Acceptance criteria
2. Reference files listed and verified to exist
3. Test requirements specified
4. FRIENDLY entry added to dashboard.html

## QA protocol

Before starting QA, set ticket status to `reviewing` in TICKETS.md and commit.

QA runs the AGENTS.md gate (lint, test, build, diff review) plus:
5. Ready brief check — verify every acceptance criterion in the Ready Brief
6. Scope check — no files modified outside "Files to modify", nothing in "DO NOT modify" touched
7. Pattern check — code matches conventions per reference files listed in the brief

On PASS: set to `done`, merge to main, output:
```
S7R-### QA: PASS
Merged to main, tests N/N
```

On FAIL: set back to `review` with notes, output:
```
S7R-### QA: FAIL
[what's wrong, 1-2 lines]
```

## Dispatch format

When preparing work for Codex/Gemini, the prompt must include:
1. Branch name and base
2. What to build (behavior spec)
3. Reference files to read first
4. Test requirements
5. "Read AGENTS.md, then TICKETS.md for the Ready Brief"

## Branch hygiene (hard gate)

**No edits until branch is confirmed.**

Before ANY file edit or commit:
1. Run `git branch --show-current` — confirm you're on the expected branch.
2. If wrong branch: stop. Switch first. Do not stash-and-switch.
3. Run `git status` — confirm working tree matches expectations.
4. Only then proceed.

After any `git merge`, `git checkout`, `git cherry-pick`, or `git stash pop`:
1. Run `git branch --show-current` — confirm branch.
2. Run `git status` — confirm working tree.
3. Verify key file content with a targeted grep (e.g. `grep -c "Story Log" TICKETS.md`).
4. If anything is unexpected, stop and investigate before proceeding.

## Stash policy

- **Never stash to transfer work between branches.** Commit or discard.
- Stash is only for pausing work on the CURRENT branch to resume later on the SAME branch.
- If you need changes on a different branch, cherry-pick the commit.

## One branch at a time

- Finish current branch work, commit, and push before switching.
- No interleaving grooming (main) with QA (feature branch).
- If QA reveals a grooming fix needed on main, note it and finish QA first.

## Session handoff

When context is getting heavy or a session is ending, add an entry to the TICKETS.md Merge Log:
- Decisions made this session
- Open questions
- Exact next action
- What NOT to re-read next session

## Before every action — verify

- [ ] Confirmed branch with `git branch --show-current`
- [ ] Working tree clean or as expected (`git status`)
- [ ] Not interleaving branches — finish current work first
- [ ] QA gate + ready brief acceptance criteria checked
- [ ] TICKETS.md status updated
