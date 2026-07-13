# QA Agent — AI-Powered Quality Engineering Assistant

> **Prompt for Cursor:** Read this README and execute the setup steps. Then ask me what I want to do.

QA Agent turns Cursor into a Quality Engineering assistant. Search bugs, triage incidents, generate Cypress/k6/API tests, manage TestRail cases, and run visual regression — all from chat.

## Quick Start

Choose your OS and run the installer:

| OS | Installer | Command |
|----|-----------|---------|
| **macOS / Linux** | `install.sh` | `chmod +x install.sh && ./install.sh` |
| **Windows** | `install.ps1` | `.\install.ps1` (PowerShell) |
| **macOS / Linux (remote)** | `install.sh` | `curl -fsSL https://raw.githubusercontent.com/ahmad-ubaidillah/qa-agent/main/install.sh \| bash` |
| **Windows (remote)** | `install.ps1` | `iwr -Uri https://raw.githubusercontent.com/ahmad-ubaidillah/qa-agent/main/install.ps1 \| iex` |

The installer will:
- Copy all 10 skills to `.cursor/skills/` (project) and `~/.cursor/skills/` (global)
- Install subagent, rules, AGENTS.md, MCP_TOOLS.md
- Create the memory directory structure
- Optionally install visual regression dependencies (Playwright + pixelmatch)

Then configure your MCP servers (**`~/.cursor/mcp.json`**):

```json
{
  "mcpServers": {
    "shortcut": { "url": "https://mcp.shortcut.com/mcp" },
    "testrail": {
      "command": "npx", "args": ["-y", "@uarlouski/testrail-mcp-server"],
      "env": {
        "TESTRAIL_URL": "<your-url>",
        "TESTRAIL_USERNAME": "<your-email>",
        "TESTRAIL_API_KEY": "<your-api-key>"
      }
    },
    "glean": { "url": "https://<tenant>-be.glean.com/mcp/default" },
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "<your-key>" }
    },
    "cypress": {
      "command": "npx", "args": ["-y", "cypress-mcp"],
      "env": { "CYPRESS_PROJECT_PATH": "." }
    },
    "playwright": {
      "command": "npx", "args": ["-y", "@playwright/mcp"],
      "env": {}
    }
  }
}
```

> ⚠️ Do NOT commit `~/.cursor/mcp.json` — contains personal credentials.

> **Windows users:** Cursor AI agent has a [known bug](https://forum.cursor.com/t/ide-agent-ignores-terminal-integrated-defaultprofile-windows-always-uses-powershell-even-with-nushell-bash-configured/151859) where it ignores your default terminal profile and always uses PowerShell. To fix: **Settings → Agents → Legacy Terminal Tool: ON**. If using PowerShell 7 instead of PowerShell 5, add `pwsh` to the top of your system PATH.

### Select the Agent in Chat

After restarting Cursor, select **@qa** from the **agent dropdown** (top-left of the chat panel) or type `@qa` in chat. The agent already has all the instructions built-in — just describe your task.

## What QA Agent Can Do

| Task | Say this | Skill |
|------|----------|-------|
| Search Shortcut tickets | `"search bug quote generation"`, paste error message | `@qa-search-tickets` |
| Triage Helix incident | Helix ID/link, bug report | `@qa-defect-triage` |
| Generate Cypress tests | TestRail case ID, `"create automation for C23768"` | `@qa-ui-automation` |
| Generate k6 perf tests | Story ID, `"create perf test for login flow"` | `@qa-perf-test` |
| Create TestRail cases | Story ID, `"create test cases for story 12345"` | `@qa-test-cases` |
| API tests (Karate) | Endpoint URL, `"api test for /users"` | `@qa-api-test` |
| Map project structure | `"scan project structure"` | `@qa-project-mapping` |
| **Visual regression** | `"check UI visually"`, `"run visual test on login page"` | `@qa-visual-test` |
| Optimize token usage | `"save tokens"`, decision ladder | `@qa-token-saver` |
| Not sure where to start | `"@qa"`, vague request | `@qa-entry` |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  SKILLS (Layer 3)                                       │
│  @qa-search-tickets  @qa-defect-triage  @qa-ui-automation│
│  @qa-perf-test       @qa-test-cases     @qa-api-test     │
│  @qa-project-mapping @qa-token-saver    @qa-entry        │
│  @qa-visual-test  ← NEW: visual regression (0 token)    │
├──────────────────────────────────────────────────────────┤
│  MEMORY SYSTEM (Layer 2)                                │
│  ~/.qa-agent/ (global)  .cursor/qa-memory/ (project)   │
│  search-cache, corrections, knowledge | project-context │
├──────────────────────────────────────────────────────────┤
│  MCP SERVERS (Layer 1)                                  │
│  Shortcut  TestRail  Glean  Context7  Cypress  Playwright│
└──────────────────────────────────────────────────────────┘
```

## AI Agent Instructions (Prompt)

When a user says "follow the README" or asks for QA help, follow these instructions:

### Memory Protocol

Memory is split into two layers. Gunakan `~/.qa-agent/lib/store.js` (zero-dep Node.js CLI) untuk semua operasi global — lebih kompak, O(1) cache lookup, support decision memory.

#### Global Memory (`~/.qa-agent/`) — Shared across ALL projects

Storage engine:
- `lib/store.js` — CLI untuk akses data
- `search-cache.json` — cache MCP results (Map-based, short keys)
- `corrections.json` — decision memory dengan outcome (good/bad)
- `knowledge.json` — patterns & tips

**Protocol:**

1. **Before MCP search**: cek cache dulu → `node ~/.qa-agent/lib/store.js cache get <hash>` — if returns non-null and <24h, use it
2. **After MCP call**: simpan ke cache → `node ~/.qa-agent/lib/store.js cache set <hash> "<query>" '<results>'`
3. **After user correction**: simpan dengan outcome
   - If correction benar: `node ~/.qa-agent/lib/store.js cor add <domain> <context> <issue> <correction> <lesson> good`
   - If user rejected our output: `node ~/.qa-agent/lib/store.js cor add <domain> <context> <issue> <fix> <lesson> bad`
4. **Before generating**: cari pola yang berhasil
   - `node ~/.qa-agent/lib/store.js cor list <domain> good` → apply proven patterns
   - `node ~/.qa-agent/lib/store.js knowledge search <topic>` → cari knowledge relevan
5. **Before accepting user suggestion**: cek histori kegagalan
   - `node ~/.qa-agent/lib/store.js cor search <topic>` → if ada outcome=bad, TOLAK dengan penjelasan
6. **After learning**: `node ~/.qa-agent/lib/store.js know add <domain> <topic> <content> '<tags>'`

#### Project Memory (`.cursor/qa-memory/`) — THIS project only

| File | Purpose |
|------|---------|
| `project-context/current.md` | Framework, conventions, test patterns |
| `generated-tests/` | Generated test references (cypress, k6, karate, visual) |

### Skill Routing — Match task to skill

**@qa-search-tickets:** User pastes error / asks "search ticket about..."
1. Expand their words into 3-4 search queries
2. Check `~/.qa-agent/search-cache.json` first — return cached if < 24h
3. Call Shortcut `search_stories()` — if no results, try Glean
4. Show: similar tickets + relevance score + ownership prediction

**@qa-defect-triage:** User gives Helix link / bug report
1. Search duplicate tickets in Shortcut
2. Classify: type (bug/feature/infra) + severity (crash/major/minor)
3. Draft ticket summary + RCA + test coverage
4. Ask approval before creating ticket

**@qa-ui-automation:** User says "create automation" or gives TestRail ID
1. Ask: environment + user credentials
2. Read project context from memory
3. Read TestRail case for AC
4. Use Playwright to explore page → build POM
5. Generate: alias file + step definitions + `.feature` file
6. Run via Cypress MCP → auto-heal if failed (max 2 attempts)
7. Show preview → wait for APPROVE/EDIT/REJECT

**@qa-perf-test:** User says "create perf test" or gives Story ID
1. Read Shortcut story for AC
2. Research via Context7 for k6 patterns
3. Generate k6 script with thresholds + risk analysis
4. Create git branch `perf/<id>-<desc>`
5. Run & validate

**@qa-test-cases:** User says "create test cases"
1. Ask: coverage type (positive/negative/all)
2. Read Shortcut story
3. Check existing TestRail cases to avoid duplicates
4. Generate + preview → APPROVE → save to TestRail

**@qa-visual-test:** User says "check UI" / "visual regression"
1. Ask: URL + pages to test
2. If first time: run with `--update-baselines`
3. Run: `node .cursor/skills/qa-visual-test/scripts/run.js --url <url> --pages <names>`
4. Parse JSON report — on failure, HTML report is auto-generated
5. Never load full screenshots into chat. Use diff image only if asked.

### Safety Gates (NEVER violate)

- NEVER create Shortcut tickets or TestRail cases without user approval
- NEVER commit `.cursor/qa-memory/` or `~/.cursor/mcp.json`
- ALWAYS use the decision ladder before generating tests: `YAGNI → Reuse → Stdlib → Native → Existing Dep → One-liner → Minimum → Reflexion`
- ALWAYS preview generated tests before writing to disk
- ALWAYS follow memory protocol before MCP calls
- NEVER suppress types with `as any` or `@ts-ignore`
- NEVER paste full screenshots into chat
- NEVER load full images into conversation — visual regression uses text reports

### Output Rules — Be Terse

```
✅ Generated: .cursor/skills/qa-visual-test/baselines/login.png
• login:     PASS (0% diff)
• dashboard: PASS (0.0003% diff)
• settings:  NEW (baseline created)
```

- Show paths and status, not full file contents
- Bullet points, not paragraphs
- On error: 1-line summary + file + line, not stack trace
- Save details to memory, not in chat

### Language-Adaptive Communication

- Mirror the user's language (English, Indonesian, Japanese, etc.)
- Code, file paths, and MCP tool names stay in English

## File Structure

```
~/.qa-agent/                     ← Global memory (shared across projects)
├── search-cache.json             ← Shortcut/Glean cache
├── corrections.json              ← User corrections
└── knowledge.json                ← Patterns & tips

.cursor/
├── MCP_TOOLS.md                    ← MCP tool reference
├── agents/qa-agent.md              ← Cursor subagent
├── rules/qa-agent-rules.mdc        ← Always-active rules
├── qa-memory/                      ← Project-specific (gitignored)
│   ├── project-context/current.md
│   └── generated-tests/
└── skills/                         ← 10 modular skills
    ├── qa-visual-test/             ← Visual regression (NEW)
    │   ├── SKILL.md
    │   ├── reference/
    │   └── scripts/
    │       ├── run.js              ← CLI runner
    │       ├── compare.js          ← pixelmatch engine
    │       └── report.js           ← HTML report generator
    ├── qa-search-tickets/
    ├── qa-defect-triage/
    ├── qa-ui-automation/
    ├── qa-perf-test/
    ├── qa-test-cases/
    ├── qa-api-test/
    ├── qa-project-mapping/
    ├── qa-token-saver/
    └── qa-entry/
```

## Visual Regression — Zero-Token Design

Comparison runs in Node.js (pixelmatch), not in AI context. Cost per scenario:

| Scenario | AI Tokens | What Happens |
|----------|-----------|-------------|
| All PASS | ~10 | "✅ 3/3 passed" |
| Has FAIL | ~30 + HTML report | "❌ 1 failed — see /tmp/qa-visual-report/xxx.html" |
| User asks "what changed?" | ~300 | `look_at` diff image once |
| HTML report itself | **0** | Self-contained file, user opens directly |

**Quick start:**
```bash
node .cursor/skills/qa-visual-test/scripts/run.js init   # scaffold config
node .cursor/skills/qa-visual-test/scripts/run.js          # run with config
node .cursor/skills/qa-visual-test/scripts/run.js list     # list baselines
```

## Memory System

Two layers — universal data is global, project data stays local.

### Global (`~/.qa-agent/`) — shared across ALL projects
```
~/.qa-agent/
├── search-cache.json      ← Shortcut/Glean cache (TTL: 24h)
├── corrections.json       ← User corrections (universal patterns)
└── knowledge.json         ← Accumulated tips & patterns
```

### Project (`.cursor/qa-memory/`) — THIS project only
```
.cursor/qa-memory/
├── project-context/current.md   ← Framework, conventions, test patterns
└── generated-tests/             ← Generated test references
    ├── cypress/
    ├── k6/
    ├── karate/
    └── visual/
```

## Token Efficiency

| Strategy | Saving |
|----------|--------|
| Modular skills — load only 1 per task | ~70% |
| Search cache — 24h TTL, no repeat MCP calls | ~60% |
| Reference files — detail in `reference/`, not SKILL.md | ~40% |
| Memory protocol — read before MCP call | ~50% |
| Visual regression — pixelmatch (0 token math) | ~99% vs AI-based comparison |

**Estimated per session:** < 500 tokens for instructions (User Rules + 1 skill + relevant memory).

## Future Enhancements

| Feature | Status |
|---------|--------|
| Visual regression (`@qa-visual-test`) | ✅ Done |
| Karate API test skill | 📋 Planned |
| Multi-project memory | 📋 Planned |
| Slack integration | 🔮 Research |
| CI/CD integration | 🔮 Research |
| AI test data generator | 🔮 Research |
| Performance regression dashboard | 🔮 Research |

---

> **Zero code deployment.** Clone the `.cursor/` structure to any project and QA Agent is ready. Type `@qa` or any trigger phrase to start.
