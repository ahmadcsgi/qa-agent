#!/usr/bin/env bash
#
# QA Agent Installer
# Usage:
#   git clone <repo-url> && cd qa-agent && ./install.sh
#   # OR from remote:
#   curl -fsSL https://raw.githubusercontent.com/<user>/qa-agent/main/install.sh | bash
#
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}${BOLD}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}${BOLD}[OK]${NC}    $*"; }
err()   { echo -e "${RED}${BOLD}[ERR]${NC}   $*"; }

# ─── Detect mode ─────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "$0")" && pwd 2>/dev/null || pwd)"
SKILLS_SRC="$REPO_DIR/.cursor/skills"
AGENTS_SRC="$REPO_DIR/.cursor/agents"
RULES_SRC="$REPO_DIR/.cursor/rules"
MEMORY_SRC="$REPO_DIR/.cursor/qa-memory"
MCP_TOOLS_SRC="$REPO_DIR/.cursor/MCP_TOOLS.md"
AGENTS_MD_SRC="$REPO_DIR/AGENTS.md"

# ─── Detect install target ────────────────────────────────────────────
if [ -f ".cursor/skills/qa-entry/SKILL.md" ]; then
  TARGET_DIR="$REPO_DIR"
  info "Detected project root at $TARGET_DIR (running in-place)"
else
  TARGET_DIR="$(pwd)"
  info "Installing into $TARGET_DIR"
fi

# ─── Create directories ───────────────────────────────────────────────
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
mkdir -p "$TARGET_DIR/.cursor/qa-memory/knowledge"

# ─── Global skills directory ──────────────────────────────────────────
GLOBAL_SKILLS_DIR="${HOME}/.cursor/skills"
mkdir -p "$GLOBAL_SKILLS_DIR"

# ─── Copy skills ──────────────────────────────────────────────────────
if [ -d "$SKILLS_SRC" ]; then
  info "Copying skills to project '$TARGET_DIR/.cursor/skills/'..."
  cp -r "$SKILLS_SRC"/* "$TARGET_DIR/.cursor/skills/"
  ok "Project skills installed ($(ls -d "$TARGET_DIR/.cursor/skills"/*/ 2>/dev/null | wc -l) skills)"

  info "Copying skills to global '$GLOBAL_SKILLS_DIR/'..."
  for skill_dir in "$SKILLS_SRC"/*/; do
    skill_name="$(basename "$skill_dir")"
    target="$GLOBAL_SKILLS_DIR/$skill_name"
    if [ -d "$target" ]; then
      info "  Global skill '$skill_name' exists — skipping (use --force to overwrite)"
    else
      cp -r "$skill_dir" "$target"
      ok "  Global skill '$skill_name' installed"
    fi
  done
else
  err "Skills directory not found at '$SKILLS_SRC'. Clone the full repo."
  exit 1
fi

# ─── Copy subagent ────────────────────────────────────────────────────
if [ -f "$AGENTS_SRC/qa-agent.md" ]; then
  cp "$AGENTS_SRC/qa-agent.md" "$TARGET_DIR/.cursor/agents/qa-agent.md"
  ok "Custom subagent installed (.cursor/agents/qa-agent.md)"
fi

# ─── Copy rules ────────────────────────────────────────────────────────
if [ -f "$RULES_SRC/qa-agent-rules.mdc" ]; then
  cp "$RULES_SRC/qa-agent-rules.mdc" "$TARGET_DIR/.cursor/rules/qa-agent-rules.mdc"
  ok "Project rules installed (.cursor/rules/qa-agent-rules.mdc)"
fi

# ─── Copy AGENTS.md ────────────────────────────────────────────────────
if [ -f "$AGENTS_MD_SRC" ]; then
  cp "$AGENTS_MD_SRC" "$TARGET_DIR/AGENTS.md"
  ok "AGENTS.md installed at project root"
fi

# ─── Copy MCP_TOOLS.md ─────────────────────────────────────────────────
if [ -f "$MCP_TOOLS_SRC" ]; then
  cp "$MCP_TOOLS_SRC" "$TARGET_DIR/.cursor/MCP_TOOLS.md"
  ok "MCP_TOOLS.md installed"
fi

# ─── Copy MEMORY_PROTOCOL.md (if exists) ───────────────────────────────
if [ -f "$MEMORY_SRC/MEMORY_PROTOCOL.md" ]; then
  # Don't overwrite if target already has one (user may have modified it)
  if [ ! -f "$TARGET_DIR/.cursor/qa-memory/MEMORY_PROTOCOL.md" ]; then
    cp "$MEMORY_SRC/MEMORY_PROTOCOL.md" "$TARGET_DIR/.cursor/qa-memory/MEMORY_PROTOCOL.md"
    ok "MEMORY_PROTOCOL.md installed"
  else
    info "MEMORY_PROTOCOL.md exists — skipping (use --force to overwrite)"
  fi
fi

# ─── Done ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  QA Agent installed successfully!       ${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo "  1. Configure MCP servers → ~/.cursor/mcp.json"
echo "     See $(pwd)/.cursor/MCP_TOOLS.md for required servers"
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
