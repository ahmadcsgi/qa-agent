#!/usr/bin/env bash
# Update QA Agent (git pull + install + sync tools)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
VER="$(tr -d '[:space:]' < "$HERE/VERSION" 2>/dev/null || echo unknown)"
echo "QA Agent update → v$VER"
export CI=1
node "$HERE/scripts/update-agent.js" "$@"
echo ""
echo "See CHANGELOG.md for what changed."
