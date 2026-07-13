#!/usr/bin/env bash
#
# QA Agent Installer — macOS & Linux
# For Windows, use install.ps1 (PowerShell)
#
# Usage:
#   # Clone and install:
#   git clone <repo-url> && cd qa-agent && chmod +x install.sh && ./install.sh
#
#   # Remote install (macOS/Linux):
#   curl -fsSL https://raw.githubusercontent.com/ahmad-ubaidillah/qa-agent/main/install.sh | bash
#
#   # Force overwrite existing global skills:
#   ./install.sh --force
#
set -euo pipefail

# ─── Args ────────────────────────────────────────────────────────────────
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
  esac
done

# ─── Colors ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}${BOLD}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}${BOLD}[OK]${NC}    $*"; }
err()   { echo -e "${RED}${BOLD}[ERR]${NC}   $*"; }

# ─── OS Detection ────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Linux*)   OS_TYPE="linux" ;;
  Darwin*)  OS_TYPE="macos" ;;
  CYGWIN*|MINGW*|MSYS*) 
    err "Detected Windows shell. Please use install.ps1 (PowerShell) instead."
    err "  Open PowerShell as Admin and run:"
    err "    .\\install.ps1"
    exit 1
    ;;
  *)        OS_TYPE="other" ;;
esac
info "Detected OS: $OS_TYPE"

# ─── Paths ────────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "$0")" && pwd 2>/dev/null || pwd)"
SKILLS_SRC="$REPO_DIR/.cursor/skills"
AGENTS_SRC="$REPO_DIR/.cursor/agents"
RULES_SRC="$REPO_DIR/.cursor/rules"
MEMORY_SRC="$REPO_DIR/.cursor/qa-memory"
MCP_TOOLS_SRC="$REPO_DIR/.cursor/MCP_TOOLS.md"
AGENTS_MD_SRC="$REPO_DIR/AGENTS.md"

# ─── Detect install target ────────────────────────────────────────────────
if [ -f ".cursor/skills/qa-entry/SKILL.md" ]; then
  TARGET_DIR="$REPO_DIR"
  info "Detected project root at $TARGET_DIR (running in-place)"
else
  TARGET_DIR="$(pwd)"
  info "Installing into $TARGET_DIR"
fi

# ─── Create directories ──────────────────────────────────────────────────
info "Creating directory structure..."
mkdir -p "$TARGET_DIR/.cursor/skills"
mkdir -p "$TARGET_DIR/.cursor/agents"
mkdir -p "$TARGET_DIR/.cursor/rules"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/project-context"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/search-cache"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/corrections"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/cypress"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/k6"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/karate"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/visual"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/knowledge"

# ─── Global skills directory ──────────────────────────────────────────────
GLOBAL_SKILLS_DIR="${HOME}/.cursor/skills"
mkdir -p "$GLOBAL_SKILLS_DIR"

# ─── Copy skills ──────────────────────────────────────────────────────────
if [ -d "$SKILLS_SRC" ]; then
  info "Copying skills to project '$TARGET_DIR/.cursor/skills/'..."
  cp -r "$SKILLS_SRC"/* "$TARGET_DIR/.cursor/skills/"
  ok "Project skills installed ($(ls -d "$TARGET_DIR/.cursor/skills"/*/ 2>/dev/null | wc -l) skills)"

  info "Copying skills to global '$GLOBAL_SKILLS_DIR/'..."
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    target="$GLOBAL_SKILLS_DIR/$skill_name"
    if [ -d "$target" ]; then
      if [ "$FORCE" = true ]; then
        cp -r "$skill_dir"/* "$target/"
        ok "  Global skill '$skill_name' updated (--force)"
      else
        info "  Global skill '$skill_name' exists — skipping (use --force to overwrite)"
      fi
    else
      cp -r "$skill_dir" "$target"
      ok "  Global skill '$skill_name' installed"
    fi
  done
else
  err "Skills directory not found at '$SKILLS_SRC'. Clone the full repo."
  exit 1
fi

# ─── Copy subagent ────────────────────────────────────────────────────────
if [ -f "$AGENTS_SRC/qa-agent.md" ]; then
  cp "$AGENTS_SRC/qa-agent.md" "$TARGET_DIR/.cursor/agents/qa-agent.md"
  ok "Custom subagent installed (.cursor/agents/qa-agent.md)"
fi

# ─── Copy rules ───────────────────────────────────────────────────────────
if [ -f "$RULES_SRC/qa-agent-rules.mdc" ]; then
  cp "$RULES_SRC/qa-agent-rules.mdc" "$TARGET_DIR/.cursor/rules/qa-agent-rules.mdc"
  ok "Project rules installed (.cursor/rules/qa-agent-rules.mdc)"
fi

# ─── Copy AGENTS.md ───────────────────────────────────────────────────────
if [ -f "$AGENTS_MD_SRC" ]; then
  cp "$AGENTS_MD_SRC" "$TARGET_DIR/AGENTS.md"
  ok "AGENTS.md installed at project root"
fi

# ─── Copy MCP_TOOLS.md ────────────────────────────────────────────────────
if [ -f "$MCP_TOOLS_SRC" ]; then
  cp "$MCP_TOOLS_SRC" "$TARGET_DIR/.cursor/MCP_TOOLS.md"
  ok "MCP_TOOLS.md installed"
fi

# ─── Copy MEMORY_PROTOCOL.md (if exists) ──────────────────────────────────
if [ -f "$MEMORY_SRC/MEMORY_PROTOCOL.md" ]; then
  if [ ! -f "$TARGET_DIR/.cursor/qa-memory/MEMORY_PROTOCOL.md" ] || [ "$FORCE" = true ]; then
    cp "$MEMORY_SRC/MEMORY_PROTOCOL.md" "$TARGET_DIR/.cursor/qa-memory/MEMORY_PROTOCOL.md"
    ok "MEMORY_PROTOCOL.md installed"
  else
    info "MEMORY_PROTOCOL.md exists — skipping (use --force to overwrite)"
  fi
fi

# ─── Visual test npm install (optional) ───────────────────────────────────
VISUAL_SCRIPTS_DIR="$TARGET_DIR/.cursor/skills/qa-visual-test/scripts"
if [ -f "$VISUAL_SCRIPTS_DIR/package.json" ]; then
  if [ ! -d "$VISUAL_SCRIPTS_DIR/node_modules" ]; then
    info "Visual regression dependencies found. Install now? (y/N)"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
      (
        cd "$VISUAL_SCRIPTS_DIR"
        npm install --silent
        npx playwright install chromium --with-deps 2>/dev/null || true
      )
      ok "Visual regression dependencies installed"
      info "  Run: node .cursor/skills/qa-visual-test/scripts/run.js init"
    else
      info "  Skip npm install. Run manually when needed:"
      info "    cd $VISUAL_SCRIPTS_DIR && npm install && npx playwright install chromium"
    fi
  else
    ok "Visual regression dependencies already installed"
  fi
fi

# ─── Done ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  QA Agent installed successfully!       ${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo "  1. Configure MCP servers → ~/.cursor/mcp.json"
echo "     See $TARGET_DIR/.cursor/MCP_TOOLS.md for required servers"
echo ""
echo "  2. Paste User Rules into Cursor Settings > Rules > User Rules:"
echo "     (Open Cursor → Cmd/Ctrl+Shift+P → 'Preferences: Open User Rules')"
echo "     Paste the content from the README.md 'User Rules' section"
echo ""
echo "  3. Restart Cursor"
echo ""
echo "  4. Type @qa in chat to start using the QA Agent!"
echo ""
echo -e "${CYAN}Tip:${NC} Skills are also available globally at ~/.cursor/skills/"
echo -e "${CYAN}     so you can use @qa-* in ANY Cursor project.${NC}"
echo ""
echo -e "${BOLD}Agent Selection:${NC}"
echo "  After restarting Cursor, select 'qa-agent' from the agent dropdown"
echo "  (top-left of chat panel) or type @qa-agent in chat."
echo ""
