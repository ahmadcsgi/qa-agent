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

HERE_EARLY="$(cd "$(dirname "$0")" && pwd)"
QA_VERSION="$(tr -d '[:space:]' < "$HERE_EARLY/VERSION" 2>/dev/null || echo dev)"
echo "QA Agent installer v$QA_VERSION"

# ─── Args ────────────────────────────────────────────────────────────────
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
  esac
done

# ─── Colors ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'
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
REFS_SRC="$REPO_DIR/.cursor/references"
MEMORY_SRC="$REPO_DIR/.cursor/qa-memory"
MCP_TOOLS_SRC="$REPO_DIR/.cursor/MCP_TOOLS.md"
AGENTS_MD_SRC="$REPO_DIR/AGENTS.md"
STORE_SRC="$REPO_DIR/scripts/store.js"
CONTEXT_TPL_SRC="$REPO_DIR/.cursor/templates/project-context.current.md"
COMMANDS_SRC="$REPO_DIR/.cursor/commands"

# ─── Global store dir (~/.qa-agent/) ─────────────────────────────────────
GLOBAL_STORE_DIR="${HOME}/.qa-agent"

# ─── Detect install target ────────────────────────────────────────────────
if [ -f "${REPO_DIR}/.cursor/skills/qa-entry/SKILL.md" ]; then
  TARGET_DIR="$REPO_DIR"
  info "Detected project root at $TARGET_DIR (running in-place)"
else
  TARGET_DIR="$(pwd)"
  info "Installing into $TARGET_DIR"
fi

# ─── Create project directories ──────────────────────────────────────────
info "Creating project directory structure..."
mkdir -p "$TARGET_DIR/.cursor/skills"
mkdir -p "$TARGET_DIR/.cursor/agents"
mkdir -p "$TARGET_DIR/.cursor/rules"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/project-context"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/cypress"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/k6"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/karate"
mkdir -p "$TARGET_DIR/.cursor/qa-memory/generated-tests/visual"

# ─── Global memory store (~/.qa-agent/) ──────────────────────────────────
info "Creating global memory store at $GLOBAL_STORE_DIR ..."
mkdir -p "$GLOBAL_STORE_DIR/lib"

# Copy storage engine
if [ -f "$STORE_SRC" ]; then
  cp "$STORE_SRC" "$GLOBAL_STORE_DIR/lib/store.js"
  ok "  Storage engine installed (~/.qa-agent/lib/store.js)"
else
  err "  store.js not found at $STORE_SRC"
fi

# Initialize JSON stores (compact format with short field names)
for pair in 'search-cache.json:map' 'corrections.json:array' 'knowledge.json:array' 'prefs.json:map'; do
  file="${pair%%:*}"
  if [ ! -f "$GLOBAL_STORE_DIR/$file" ]; then
    echo "{\"v\":2,\"c\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"d\":$( [ "${pair##*:}" = "map" ] && echo '{}' || echo '[]' )}" > "$GLOBAL_STORE_DIR/$file"
    ok "  Created $file (v2 compact)"
  else
    info "  $file exists — skipping"
  fi
done

# ─── Global skills directory ──────────────────────────────────────────────
GLOBAL_SKILLS_DIR="${HOME}/.cursor/skills"
mkdir -p "$GLOBAL_SKILLS_DIR"

# ─── Copy skills ──────────────────────────────────────────────────────────
if [ ! -d "$SKILLS_SRC" ]; then
  err "Skills directory not found at '$SKILLS_SRC'. Clone the full repo."
  exit 1
fi

SKILL_COUNT="$(ls -d "$SKILLS_SRC"/*/ 2>/dev/null | wc -l)"
if [ "$TARGET_DIR" != "$REPO_DIR" ]; then
  info "Copying skills to project '$TARGET_DIR/.cursor/skills/'..."
  cp -r "$SKILLS_SRC"/* "$TARGET_DIR/.cursor/skills/"
  ok "Project skills installed ($SKILL_COUNT skills)"
else
  info "Running in-place — project skills already present ($SKILL_COUNT skills)"
fi

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

# ─── Global agents directory ──────────────────────────────────────────────
GLOBAL_AGENTS_DIR="${HOME}/.cursor/agents"
mkdir -p "$GLOBAL_AGENTS_DIR"

# ─── Copy subagent (project + global) ─────────────────────────────────────
if [ -f "$AGENTS_SRC/qa.md" ]; then
  if [ "$TARGET_DIR" != "$REPO_DIR" ]; then
    cp "$AGENTS_SRC/qa.md" "$TARGET_DIR/.cursor/agents/qa.md"
    ok "Custom subagent installed (.cursor/agents/qa.md)"
  fi

  GLOBAL_TARGET="$GLOBAL_AGENTS_DIR/qa.md"
  if [ ! -f "$GLOBAL_TARGET" ] || [ "$FORCE" = true ]; then
    cp "$AGENTS_SRC/qa.md" "$GLOBAL_TARGET"
    ok "Global custom agent installed (~/.cursor/agents/qa.md)"
  else
    info "Global custom agent exists — skipping (use --force to overwrite)"
  fi
elif [ -f "$AGENTS_SRC/qa-agent.md" ]; then
  # Legacy fallback: rename old file
  if [ "$TARGET_DIR" != "$REPO_DIR" ]; then
    cp "$AGENTS_SRC/qa-agent.md" "$TARGET_DIR/.cursor/agents/qa.md"
    ok "Custom subagent installed (.cursor/agents/qa.md) [legacy]"
  fi
  GLOBAL_TARGET="$GLOBAL_AGENTS_DIR/qa.md"
  if [ ! -f "$GLOBAL_TARGET" ] || [ "$FORCE" = true ]; then
    cp "$AGENTS_SRC/qa-agent.md" "$GLOBAL_TARGET"
    ok "Global custom agent installed (~/.cursor/agents/qa.md) [legacy]"
  fi
fi

# ─── Copy rules ───────────────────────────────────────────────────────────
if [ -f "$RULES_SRC/qa-agent-rules.mdc" ] && [ "$TARGET_DIR" != "$REPO_DIR" ]; then
  cp "$RULES_SRC/qa-agent-rules.mdc" "$TARGET_DIR/.cursor/rules/qa-agent-rules.mdc"
  ok "Project rules installed (.cursor/rules/qa-agent-rules.mdc)"
fi

# ─── Copy AGENTS.md ───────────────────────────────────────────────────────
if [ -f "$AGENTS_MD_SRC" ] && [ "$TARGET_DIR" != "$REPO_DIR" ]; then
  cp "$AGENTS_MD_SRC" "$TARGET_DIR/AGENTS.md"
  ok "AGENTS.md installed at project root"
fi

# ─── Copy MCP_TOOLS.md ────────────────────────────────────────────────────
if [ -f "$MCP_TOOLS_SRC" ] && [ "$TARGET_DIR" != "$REPO_DIR" ]; then
  cp "$MCP_TOOLS_SRC" "$TARGET_DIR/.cursor/MCP_TOOLS.md"
  ok "MCP_TOOLS.md installed"
fi

# ─── Slash command /qa (beats plugin noise) ───────────────────────────────
CMD_SRC="$COMMANDS_SRC/qa.md"
GLOBAL_COMMANDS_DIR="${HOME}/.cursor/commands"
mkdir -p "$GLOBAL_COMMANDS_DIR"
if [ -f "$CMD_SRC" ]; then
  mkdir -p "$TARGET_DIR/.cursor/commands"
  if [ "$TARGET_DIR" != "$REPO_DIR" ]; then
    cp "$CMD_SRC" "$TARGET_DIR/.cursor/commands/qa.md"
    ok "Slash command installed (.cursor/commands/qa.md → /qa)"
  fi
  cp "$CMD_SRC" "$GLOBAL_COMMANDS_DIR/qa.md"
  ok "Global slash command installed (~/.cursor/commands/qa.md → /qa)"
fi

# ─── Copy offline references ──────────────────────────────────────────────
if [ -d "$REFS_SRC" ]; then
  if [ "$TARGET_DIR" != "$REPO_DIR" ]; then
    mkdir -p "$TARGET_DIR/.cursor/references"
    cp -r "$REFS_SRC"/* "$TARGET_DIR/.cursor/references/"
    ok "Offline references installed (.cursor/references/)"
  else
    info "Running in-place — references already present"
  fi
fi

# ─── Copy project-context template ────────────────────────────────────────
TARGET_PC="$TARGET_DIR/.cursor/qa-memory/project-context/current.md"
if [ ! -f "$TARGET_PC" ]; then
  if [ -f "$MEMORY_SRC/project-context/current.md" ]; then
    cp "$MEMORY_SRC/project-context/current.md" "$TARGET_PC"
    ok "project-context/current.md installed"
  elif [ -f "$CONTEXT_TPL_SRC" ]; then
    cp "$CONTEXT_TPL_SRC" "$TARGET_PC"
    ok "project-context/current.md installed from template"
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
echo "  1. Copy mcp.json.example → ~/.cursor/mcp.json and fill secrets"
echo "     See $TARGET_DIR/.cursor/MCP_TOOLS.md for required servers"
echo ""
echo "  2. node scripts/doctor.js"
echo ""
echo "  3. Restart Cursor, then type /qa (or select @qa)"
echo "     Demo: docs/DEMO.md"
echo ""
echo -e "${CYAN}Lifecycle: ./update.sh  |  ./uninstall.sh  |  CHANGELOG.md${NC}"
echo ""
echo -e "${CYAN}Memory:${NC}"
echo -e "${CYAN}  Global (shared across projects): $GLOBAL_STORE_DIR${NC}"
echo -e "${CYAN}  Project (this project only):     .cursor/qa-memory/${NC}"
echo ""
echo -e "${YELLOW}Windows users:${NC}"
echo -e "${YELLOW}  Cursor Agent has a known bug using wrong shell on Windows.${NC}"
echo -e "${YELLOW}  Fix: Settings → Agents → Legacy Terminal Tool: ON${NC}"
echo ""
