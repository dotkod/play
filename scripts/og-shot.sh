#!/usr/bin/env bash
# Regenerates the OG art from the live 3D scene. Needs the dev server running.
#   ./scripts/og-shot.sh [base-url]
set -euo pipefail
BASE="${1:-http://localhost:3210}"
BROWSER="${BROWSER_BIN:-/Applications/Brave Browser.app/Contents/MacOS/Brave Browser}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/og"
mkdir -p "$OUT"

shot() {
  local path="$1" name="$2"
  "$BROWSER" --headless=new \
    --hide-scrollbars --window-size=1200,630 --virtual-time-budget=15000 \
    --screenshot="$OUT/$name.png" "$BASE$path" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 82 "$OUT/$name.png" --out "$OUT/$name.jpg" >/dev/null
  rm "$OUT/$name.png"
  echo "wrote public/og/$name.jpg"
}

shot /anne-maju/poster anne-maju
shot /anne-maju/poster/bare anne-maju-bare
