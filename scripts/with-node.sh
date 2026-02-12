#!/bin/zsh
set -euo pipefail

# Prefer the pinned FNM Node install path in environments where fnm shell hooks
# are not active (for example, restricted sandboxes).
NODE_BIN="$HOME/.local/share/fnm/node-versions/v24.13.0/installation/bin"
if [[ -d "$NODE_BIN" ]]; then
  export PATH="$NODE_BIN:$PATH"
fi

exec "$@"
