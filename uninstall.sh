#!/usr/bin/env bash
# Remove QA Agent global install (skills, agent, optional memory)
set -euo pipefail

KEEP_MEMORY=false
for arg in "$@"; do
  case "$arg" in
    --keep-memory) KEEP_MEMORY=true ;;
  esac
done

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }

GLOBAL_SKILLS="${HOME}/.cursor/skills"
GLOBAL_AGENT="${HOME}/.cursor/agents/qa.md"
GLOBAL_COMMAND="${HOME}/.cursor/commands/qa.md"
GLOBAL_STORE="${HOME}/.qa-agent"

SKILLS=(
  qa-entry qa-search-tickets qa-defect-triage qa-ui-automation
  qa-perf-test qa-test-cases qa-test-execution qa-api-test qa-project-mapping
  qa-token-saver qa-visual-test qa-pr-review
)

echo -e "${YELLOW}QA Agent uninstall (global Cursor install)${NC}"
echo "This does NOT delete project .cursor/ folders or mcp.json."
echo ""
read -r -p "Continue? (y/N) " answer
if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
  info "Aborted"
  exit 0
fi

for name in "${SKILLS[@]}"; do
  target="${GLOBAL_SKILLS}/${name}"
  if [ -d "$target" ]; then
    rm -rf "$target"
    ok "Removed skill $name"
  fi
done

if [ -f "$GLOBAL_AGENT" ]; then
  rm -f "$GLOBAL_AGENT"
  ok "Removed ~/.cursor/agents/qa.md"
fi

if [ -f "$GLOBAL_COMMAND" ]; then
  rm -f "$GLOBAL_COMMAND"
  ok "Removed ~/.cursor/commands/qa.md"
fi

if [ "$KEEP_MEMORY" = false ]; then
  if [ -d "$GLOBAL_STORE" ]; then
    rm -rf "$GLOBAL_STORE"
    ok "Removed ~/.qa-agent"
  fi
else
  info "Kept ~/.qa-agent memory (--keep-memory)"
  for f in mcp-mode.js mcp-lib.js; do
    if [ -f "$GLOBAL_STORE/lib/$f" ]; then
      rm -f "$GLOBAL_STORE/lib/$f"
      ok "Removed lib/$f (reinstall via installer)"
    fi
  done
fi

echo ""
echo -e "${GREEN}Uninstall complete. Project-local .cursor/ files (if any) were left intact.${NC}"
