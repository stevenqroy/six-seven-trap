#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_PORT=5173
MAX_PORT=5205
PORT="${1:-$DEFAULT_PORT}"
HOST="127.0.0.1"

# Prefer pinned fnm install path in terminals where shell hooks are not active.
NODE_BIN="$HOME/.local/share/fnm/node-versions/v24.13.0/installation/bin"
if [[ -d "$NODE_BIN" ]]; then
  export PATH="$NODE_BIN:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node is not available. Run: fnm use v24.13.0"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available. Run: fnm use v24.13.0"
  exit 1
fi

is_port_busy() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  return 1
}

cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

ORIGINAL_PORT="$PORT"
while is_port_busy "$PORT"; do
  PORT=$((PORT + 1))
  if [[ "$PORT" -gt "$MAX_PORT" ]]; then
    echo "Could not find a free local port between $ORIGINAL_PORT and $MAX_PORT."
    echo "Close other local dev servers and retry."
    exit 1
  fi
done

if [[ "$PORT" -ne "$ORIGINAL_PORT" ]]; then
  echo "Port $ORIGINAL_PORT is in use; starting on $PORT instead."
fi

URL="http://$HOST:$PORT"
echo "Starting Six Seven Ranch at $URL"
echo "If browser does not open automatically, paste this URL into your browser:"
echo "$URL"

# Attempt to open the browser on macOS; ignore failures.
if command -v open >/dev/null 2>&1; then
  (sleep 1; open "$URL" >/dev/null 2>&1 || true) &
fi

exec node ./node_modules/vite/bin/vite.js --host "$HOST" --port "$PORT"
