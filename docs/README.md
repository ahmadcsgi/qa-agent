# Documentation index

| Doc | What it covers |
|-----|----------------|
| [FIRST_RUN.md](FIRST_RUN.md) | **New clone:** install → Reload → `/qa onboard` |
| [SETUP.md](SETUP.md) | Clone → install → MCP → Git → tooling → prefs → doctor |
| [MCP.md](MCP.md) | Path-aware profiles (lite/ui/api/perf/auto) + secrets |
| [DEMO.md](DEMO.md) | Smoke walkthrough + skill prompt matrix |
| [ONBOARDING.md](ONBOARDING.md) | Public stub vs private `onboard.md` sharing |
| [MULTI_PROJECT_MEMORY.md](MULTI_PROJECT_MEMORY.md) | Global / project / workspace memory |
| [../onboard.example.md](../onboard.example.md) | Public onboard stub |
| [../AGENTS.md](../AGENTS.md) | Agent DNA (source of truth for Cursor) |
| [../.cursor/MCP_TOOLS.md](../.cursor/MCP_TOOLS.md) | MCP tool → skill map |
| [../.cursor/references/README.md](../.cursor/references/README.md) | Offline skill references |
| [../CHANGELOG.md](../CHANGELOG.md) | Release notes |
| [../mcp.json.optional.md](../mcp.json.optional.md) | When to skip karate MCP |

## Quick commands

```bash
node scripts/onboard-wizard.js --resume
node scripts/onboard-wizard.js --print-learn
node scripts/onboard-wizard.js --print-form
node scripts/onboard-wizard.js --dry-run --squad "Team" --ui "C:\ui"
node scripts/onboard-progress.js
node scripts/mcp-mode.js auto
node scripts/doctor.js
```
