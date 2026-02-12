#!/bin/zsh
set -euo pipefail

TMP_DIR="$(mktemp -d /tmp/testmp4_frames.XXXXXX)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ffmpeg -hide_banner -loglevel error -y \
  -ss 0 -t 10 \
  -i "src/assets/test.mp4" \
  -vf "fps=12.8,scale=480:270:flags=lanczos" \
  -frames:v 128 \
  "$TMP_DIR/frame_%03d.png"

FRAME_COUNT="$(find "$TMP_DIR" -name 'frame_*.png' | wc -l | tr -d ' ')"
if [[ "$FRAME_COUNT" -lt 120 ]]; then
  echo "Expected around 128 frames from test.mp4, got $FRAME_COUNT" >&2
  exit 1
fi

ffmpeg -hide_banner -loglevel error -y \
  -framerate 12.8 \
  -i "$TMP_DIR/frame_%03d.png" \
  -frames:v 1 \
  -vf "tile=8x16:padding=0:margin=0" \
  "src/assets/test-sheet-opaque.png"

./scripts/with-node.sh node scripts/build-testmp4-best-sheet.mjs
