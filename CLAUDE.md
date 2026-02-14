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

**Step 0 — mark reviewing (MANDATORY, do this FIRST):**
1. Confirm you are on main (`git branch --show-current`)
2. Set ticket status to `reviewing` in TICKETS.md on main
3. Commit and push so the dashboard reflects the review is in progress
4. THEN switch to the feature branch to begin QA

**Step 1 — QA gate on the feature branch:**
Run the AGENTS.md gate (lint, test, build, diff review) plus:
5. Ready brief check — verify every acceptance criterion in the Ready Brief
6. Scope check — no files modified outside "Files to modify", nothing in "DO NOT modify" touched
7. Pattern check — code matches conventions per reference files listed in the brief

**Merge method**: Cherry-pick code commits only — never `git merge` the full branch. Agent branches have stale TICKETS.md/AGENTS.md/CLAUDE.md that would regress main. After cherry-pick, update TICKETS.md status on main manually.

On PASS: switch to main, cherry-pick code, set to `done`, output:
```
S7R-### QA: PASS
Merged to main, tests N/N
```

On FAIL: switch to main, set back to `review` with notes, output:
```
S7R-### QA: FAIL
[what's wrong, 1-2 lines]
```

## Intake — when a TL;DR handoff arrives

When the user shares a TL;DR handoff from Codex/Gemini:
1. Switch to main (stash current work if needed — same-branch stash only)
2. Update TICKETS.md on main: set the ticket's status to `review`, fill Branch and Owner
3. If agent released the main.js lock, update that on main too
4. Commit and push to main so the dashboard reflects reality
5. Switch back to previous branch, restore stash
6. Then proceed with QA (or note it for later)

**Why**: Agents only update TICKETS.md on their own branch. Main won't reflect the status until Claude syncs it.

## Dispatch — when sending work to an agent

The dispatch prompt must follow this exact template:

```
<Agent>: please start S7R-### — <ticket name>.
Branch: <agent>/S7R-###

STEP 1: Read AGENTS.md — follow the startup protocol exactly.
STEP 2: Create your branch from latest main:
        git fetch origin
        git checkout -b <agent>/S7R-### origin/main 2>/dev/null || (git checkout <agent>/S7R-### && git rebase origin/main)
        Run git branch --show-current and confirm it says <agent>/S7R-###. STOP if it doesn't.
STEP 3: Update TICKETS.md — set status to wip:<agent>, Branch to <agent>/S7R-###, Owner to <agent>. Commit this change first.
STEP 4: Read your ticket's Ready Brief in TICKETS.md (search for "S7R-### Ready Brief").
STEP 5: Implement. Follow AGENTS.md rules, QA gate, and completion handoff format.
STEP 6: Before marking review — rebase onto latest main: git fetch origin && git rebase origin/main. Re-run build after rebase.
STEP 7: Commit code and TICKETS.md SEPARATELY (code first, TICKETS.md last). Set status to review. Output the TL;DR handoff from AGENTS.md.
```

**After dispatching — MANDATORY SYNC (do not skip, do not defer):**
- [ ] TICKETS.md on main: set ticket to `wip:<agent>`, fill Branch and Owner
- [ ] If ticket touches main.js: set main.js Lock to `wip:<agent> (S7R-###)`
- [ ] `git add TICKETS.md && git commit && git push`
- [ ] Verify push succeeded

**This sync must happen in the SAME response as the dispatch prompt.** Not later. Not next turn. Immediately. Claude forgot this step during S7R-072 dispatch and the dashboard showed stale data.

**Why**: The agent will claim the ticket on its branch, but main must also reflect it to prevent double-assignment.

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
- **Always return to main** when done with any task. Claude's home branch is main.

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

## After QA — verify

- [ ] Step 0 was done FIRST (reviewing status on main, committed and pushed)
- [ ] QA gate passed (lint, test, build)
- [ ] Ready Brief acceptance criteria — every checkbox verified
- [ ] Cherry-pick to main, tests pass on main
- [ ] TICKETS.md status → done, merge log entry added
- [ ] Deploy to GitHub Pages
- [ ] Commit and push

## After dispatch — verify

- [ ] Dispatch prompt includes branch creation + verification + rebase steps
- [ ] TICKETS.md on main: ticket set to `wip:<agent>`, Branch and Owner filled
- [ ] main.js Lock updated if ticket touches main.js
- [ ] Committed and pushed to main
