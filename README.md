# QA Agent - AI-Powered Quality Engineering Assistant

> Version: see [`VERSION`](VERSION) · Changes: [`CHANGELOG.md`](CHANGELOG.md) · Demo: [`docs/DEMO.md`](docs/DEMO.md)

> **Prompt for Cursor:** Read this README and execute the setup steps. Then ask me what I want to do.

QA Agent turns Cursor into a Quality Engineering assistant that stays **lite, fast, and small** — then gets **smarter with every correction**. Search bugs, triage incidents, generate Cypress/k6/API tests, manage TestRail cases, and run visual regression from chat, while learning your prefs and never repeating scored mistakes.

**DNA:** hemat token · `boot` sekali per tugas · simpan setiap APPROVE/EDIT/REJECT · bertumbuh lewat `prefs` + `corrections`.

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
- Install subagent, rules, AGENTS.md, MCP_TOOLS.md, and `.cursor/references/`
- Scaffold project memory from `.cursor/templates/project-context.current.md`
- Create the memory directory structure
- Optionally install visual regression dependencies (Playwright + pixelmatch) on Windows and Unix

Then configure MCP servers:

1. Copy [`mcp.json.example`](mcp.json.example) → `~/.cursor/mcp.json`
2. Replace placeholders with your credentials
3. Restart Cursor

> ⚠️ Do NOT commit `~/.cursor/mcp.json` — it contains personal credentials.

Health check & session brain:

```bash
node scripts/doctor.js
node ~/.qa-agent/lib/store.js boot          # prefs + top lessons (tiny)
node ~/.qa-agent/lib/store.js pref set output.verbosity min
```

> **Windows users:** Cursor AI agent has a [known bug](https://forum.cursor.com/t/ide-agent-ignores-terminal-integrated-defaultprofile-windows-always-uses-powershell-even-with-nushell-bash-configured/151859) where it ignores your default terminal profile and always uses PowerShell. To fix: **Settings → Agents → Legacy Terminal Tool: ON**. If using PowerShell 7 instead of PowerShell 5, add `pwsh` to the top of your system PATH.

### Start a session (`/qa` or `@qa`)

After restarting Cursor, use either:
- **`/qa`** — project slash command (`.cursor/commands/qa.md`) — recommended if you like `/` shortcuts
- **`@qa`** — custom agent from the agent dropdown

Do **not** attach or open anything under `.cursor/plugins/` (e.g. `superpowers` / `.cache-complete`). That is IDE plugin cache noise; QA Agent ignores it.

Then describe your task.

### Fully Customizable

QA Agent is designed to be customized by whoever uses it. You can add, remove, or change any rule or behavior just by telling the agent directly in chat - no config files to edit, no restart needed.

Examples of what you can do:
- **"From now on, always ask for severity level before triaging"** - adds a new step to the workflow
- **"Skip the cache check for search tickets"** - removes a step
- **"Change the preview format to show diff only"** - edits an existing rule
- **"Don't use Glean at all, just use Shortcut"** - restricts tool usage
- **"Add a new skill that does X"** - extends capabilities

The agent saves every correction, preference, and pattern to its decision memory (`~/.qa-agent/`). The more you use it, the more it adapts to how you work.

## What QA Agent Can Do

| Task | Say this | Skill |
|------|----------|-------|
| Search Shortcut tickets | `"search bug quote generation"`, paste error message | `@qa-search-tickets` |
| Triage incident | Incident ID/link, bug report | `@qa-defect-triage` |
| Generate Cypress tests | TestRail case ID, `"create automation for C23768"` | `@qa-ui-automation` |
| Generate k6 perf tests | Story ID, `"create perf test for login flow"` | `@qa-perf-test` |
| Create TestRail cases | Story ID, `"create test cases for story 12345"` | `@qa-test-cases` |
| Test plan / mark Passed | `"buat test plan"`, `"centang di run …"` | `@qa-test-execution` |
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
│  @qa-test-execution  @qa-project-mapping @qa-token-saver │
│  @qa-entry           @qa-visual-test                       │
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

**Single source of truth:** [`AGENTS.md`](AGENTS.md)

When a user says "follow the README" or asks for QA help:
1. Follow `AGENTS.md` (memory, routing, safety, language)
2. Apply `.cursor/rules/qa-agent-rules.mdc`
3. Route to the matching skill under `.cursor/skills/`
4. Use tool names from `.cursor/MCP_TOOLS.md`

Skill quick map and architecture are above; do not fork a second copy of the protocol in this README.

Install / lifecycle:

| Action | Windows | macOS / Linux |
|--------|---------|---------------|
| Install | `.\install.ps1` | `./install.sh` |
| Update | `.\update.ps1` | `./update.sh` |
| Uninstall global | `.\uninstall.ps1` | `./uninstall.sh` |
| Doctor | `node scripts\doctor.js` | `node scripts/doctor.js` |

## File Structure

```
~/.qa-agent/                     ← Global memory (shared across projects)
├── search-cache.json             ← Shortcut/Glean cache
├── corrections.json              ← User corrections
└── knowledge.json                ← Patterns & tips

AGENTS.md                            ← Agent SSOT (behavior / memory / routing)
VERSION · CHANGELOG.md · mcp.json.example · docs/DEMO.md
scripts/store.js · doctor.js · store.test.js
install.* · update.* · uninstall.*

.cursor/
├── MCP_TOOLS.md                    ← MCP tool reference (live tool names)
├── agents/qa.md                    ← Thin @qa pointer → AGENTS.md
├── rules/qa-agent-rules.mdc        ← Always-active rules
├── references/                     ← Offline MCP/framework docs
├── templates/                      ← project-context template for install
├── qa-memory/                      ← Project-specific (gitignored)
└── skills/                         ← 10 modular skills (+ qa-visual-test/scripts)
```

## Visual Regression - Zero-Token Design

Comparison runs in Node.js (pixelmatch), not in AI context. Illustrative chat cost (order-of-magnitude, not a benchmark):

| Scenario | Chat payload | What Happens |
|----------|--------------|-------------|
| All PASS | Tiny text status | "✅ 3/3 passed" |
| Has FAIL | Short summary + HTML path | Open report under OS temp (`qa-visual-report/`) |
| User asks "what changed?" | Optional diff image | Only if explicitly requested |
| HTML report itself | Outside the LLM | Self-contained file, user opens directly |

**Quick start:**
```bash
node .cursor/skills/qa-visual-test/scripts/run.js init   # scaffold config
node .cursor/skills/qa-visual-test/scripts/run.js          # run with config
node .cursor/skills/qa-visual-test/scripts/run.js list     # list baselines
```

## Memory System

Two layers - universal data is global, project data stays local.

### 3-layer memory

```
~/.qa-agent/                         ← Layer 1: global user memory
├── prefs.json / corrections.json / knowledge.json / search-cache.json
└── projects/<id>/                   ← Layer 2: per-project slice
    ├── prefs.json / corrections.json / knowledge.json
    └── context.md                   ← snapshot (via proj sync)

.cursor/qa-memory/                   ← Layer 3: this workspace (gitignored)
├── project-context/current.md
└── generated-tests/
```

```bash
node ~/.qa-agent/lib/store.js proj ensure
node ~/.qa-agent/lib/store.js boot --project auto
node ~/.qa-agent/lib/store.js proj sync
```

See [`docs/MULTI_PROJECT_MEMORY.md`](docs/MULTI_PROJECT_MEMORY.md).

## Token Efficiency (design intent)

These are **architecture choices**, not independently measured savings. Prefer short context over loading everything:

| Strategy | Intent |
|----------|--------|
| Modular skills | Load one skill workflow per task |
| Search cache (24h TTL) | Avoid repeat MCP calls for the same query |
| `reference/` files | Keep `SKILL.md` short; pull detail on demand |
| Memory protocol | Read corrections/knowledge before new research |
| Visual regression | Run pixel math in Node (no image bytes in the LLM loop) |

For a first successful path, see [`docs/DEMO.md`](docs/DEMO.md).

## Testing

```bash
node scripts/doctor.js
node scripts/store.test.js
cd .cursor/skills/qa-visual-test/scripts && npm install && node compare.test.js
```

CI (GitHub Actions) runs store checks, skill structure, and the visual compare smoke test.

## Future Enhancements

| Feature | Status |
|---------|--------|
| Visual regression (`@qa-visual-test`) | ✅ Done |
| Karate API test skill (`@qa-api-test`) | ✅ Done |
| Multi-project memory (3-layer) | ✅ Done — see `docs/MULTI_PROJECT_MEMORY.md` |
| Slack integration | 🔮 Research |
| CI/CD integration (store + compare smoke) | ✅ Partial |
| AI test data generator | 🔮 Research |
| Performance regression dashboard | 🔮 Research |

---

> **Zero code deployment.** Clone the `.cursor/` structure to any project and QA Agent is ready. Type `@qa` or any trigger phrase to start.
