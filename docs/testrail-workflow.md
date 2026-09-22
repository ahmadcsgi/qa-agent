# TestRail workflow (QA Agent)

**Default:** REST via `scripts/testrail-tools/` + `testrail-mcp/config/env.local` (email + API Key).

Pref **`tools.testrail_via=api`** omits TestRail from the active MCP profile. Optional MCP: `node scripts/sync-testrail-mcp-env.js` after `setup-mcp.js`.

## When to use what

| Task | Tool |
|------|------|
| Read/write cases, sections (agent) | `TestRailApi.ps1` / `Invoke-TestRailApi` |
| Export cases JSON/CSV | `tr-get-cases.ps1` |
| Bulk squad/feature only | `tr-update-fields.ps1` (never steps/refs unless asked) |
| Add cases to plan run | `tr-update-plan-entry.ps1` (merge via `get_tests`, not `get_plan`) |
| Automation audit vs suite | `tr-audit-automation.ps1` |
| Draft cases from Shortcut | `@qa-test-cases` + `testrail-case-generate.mdc` |

## Plan merge safety

1. `get_tests` on the target run for existing case IDs
2. Merge IDs, then `update_plan_entry`
3. Never `updateRun` on plan-owned runs (403)

## Credentials

| File | Role |
|------|------|
| `AI/MCP/testrail-mcp/config/env.local` | Source of truth |
| `~/.cursor/mcp.json` | Optional MCP copy (`sync-testrail-mcp-env.js`) |

## Related

`.cursor/references/testrail-tools.md` · `.cursor/references/testrail-api.md` · `@qa-test-execution`
