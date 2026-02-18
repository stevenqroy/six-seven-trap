#!/bin/bash
# S7R-091: Scan for agent branches ahead of main on session start.
# Checks both remote (origin/) and local branches for codex/* and gemini/*.
# Outputs additionalContext with any new agent activity.

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD="$(pwd)"
cd "$CWD" || exit 0

# Fetch quietly (timeout after 10s to avoid blocking session start)
timeout 10 git fetch --quiet 2>/dev/null || true

RESULTS=""
SEEN=""

# --- Scan remote agent branches (pushed to origin) ---
for ref in $(git for-each-ref --format='%(refname:short)' 'refs/remotes/origin/codex/' 'refs/remotes/origin/gemini/' 2>/dev/null); do
  branch="${ref#origin/}"

  ahead=$(git rev-list --count origin/main.."$ref" 2>/dev/null)
  [ "$ahead" = "0" ] || [ -z "$ahead" ] && continue

  ticket=$(echo "$branch" | grep -oE 'S7R-[0-9]+')
  [ -z "$ticket" ] && continue

  if git show origin/main:TICKETS.md 2>/dev/null | grep -q "$ticket.*|.*done"; then
    continue
  fi

  status="wip"
  if git show "$ref":TICKETS.md 2>/dev/null | grep -q "$ticket.*|.*review"; then
    status="review"
  fi

  SEEN="${SEEN}${branch}\n"
  RESULTS="${RESULTS}  - ${branch} (${ahead} commits ahead, status: ${status})\n"
done

# --- Scan local agent branches (worktrees, not yet pushed) ---
for ref in $(git for-each-ref --format='%(refname:short)' 'refs/heads/codex/' 'refs/heads/gemini/' 2>/dev/null); do
  branch="$ref"

  # Skip if already reported from remote scan
  if echo -e "$SEEN" | grep -qF "$branch"; then
    continue
  fi

  ahead=$(git rev-list --count main.."$ref" 2>/dev/null)
  [ "$ahead" = "0" ] || [ -z "$ahead" ] && continue

  ticket=$(echo "$branch" | grep -oE 'S7R-[0-9]+')
  [ -z "$ticket" ] && continue

  if git show main:TICKETS.md 2>/dev/null | grep -q "$ticket.*|.*done"; then
    continue
  fi

  status="wip"
  if git show "$ref":TICKETS.md 2>/dev/null | grep -q "$ticket.*|.*review"; then
    status="review"
  fi

  RESULTS="${RESULTS}  - ${branch} (${ahead} commits ahead, local only, status: ${status})\n"
done

# --- Scan for stray files in main workspace ---
STRAY=""
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$CURRENT_BRANCH" = "main" ]; then
  UNTRACKED=$(git ls-files --others --exclude-standard -- 'tests/' 'src/' 2>/dev/null)
  if [ -n "$UNTRACKED" ]; then
    STRAY="Stray untracked files in main workspace (likely from Gemini writing outside worktree):\n"
    while IFS= read -r f; do
      STRAY="${STRAY}  - ${f}\n"
    done <<< "$UNTRACKED"
    STRAY="${STRAY}Clean up with: git clean -f -- tests/ src/\n"
  fi
fi

# Only output if there's something to report
if [ -n "$RESULTS" ] || [ -n "$STRAY" ]; then
  MSG=""
  [ -n "$RESULTS" ] && MSG="Agent branches detected:\n${RESULTS}\nFor 'review' branches, you can offer to start QA. For 'wip' branches, agents are still working.\n"
  [ -n "$STRAY" ] && MSG="${MSG}\n⚠️ ${STRAY}"
  jq -n --arg ctx "$MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "additionalContext": $ctx
    }
  }'
fi

exit 0
