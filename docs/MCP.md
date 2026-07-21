# MCP guide

QA Agent uses Cursor MCP for Ticket / TestRail / docs / UI runners. Git, k6 CLI, and Maven/Karate are **not** required as MCP (skills use shell + `paths.*`).

## Files

| Path | Role |
|------|------|
| `~/.cursor/mcp.json` | **Active** servers Cursor loads (profile switch) |
| `~/.qa-agent/mcp/catalog.json` | **Catalog** full install (may contain secrets) |
| `~/.qa-agent/mcp/catalog.redacted.json` | Safe copy from scrub script |
| `~/.qa-agent/mcp/backups/` | Automatic backups before profile switch |
| `~/.cursor/hooks/qa-mcp-auto.js` | sessionStart auto profile (after onboard) |
| `mcp.json.example` | Template for the recommended **full** set (6) |
| `mcp.json.optional.example` | Optional **k6** + **karate** |

Never commit personal mcp/catalog files.

## Onboard = install full once

```bash
node scripts/onboard-wizard.js
# chat: --print-learn then --apply --squad … --ui … --tools 1,2
# or: node scripts/setup-mcp.js --full
```

Wizard fills catalog with all 6 servers (tokens once). Day-to-day activation is path-aware.

## Path-aware profiles

| Profile | When | Active servers |
|---------|------|----------------|
| **lite** | cwd outside UI/API/perf paths | Shortcut, TestRail, Glean |
| **ui** | cwd under `paths.ui_tests` | lite + Context7 + Cypress + Playwright |
| **api** | cwd under `paths.api_tests` | lite + Context7 (+ karate MCP if catalogued) |
| **perf** | cwd under `paths.perf_tests` | lite + Context7 (+ k6 MCP if catalogued) |
| **full** | manual | all 6 |
| **optional** | manual | full + k6 + karate |
| **auto** | recommended | picks ui/api/perf/lite from cwd |

Multi-path prefs: `C:\ui-a|C:\ui-b` (pipe-separated).

```bash
node scripts/mcp-mode.js auto
node scripts/mcp-mode.js auto --if-changed
node scripts/mcp-mode.js status
node scripts/mcp-mode.js lite
node scripts/mcp-mode.js ui
```

Cypress/Playwright are **not deleted** from catalog when switching to lite. Only the active `mcp.json` changes. Reload Cursor after a switch.

Pref: `mcp.path_aware=true` (set by onboard wizard).

### Auto on new chat

`node scripts/install-mcp-hook.js` wires a **user** `sessionStart` hook so opening any workspace (UI/API/perf or not) can rewrite active MCP. Also `/qa` boot runs `mcp-mode auto --if-changed`.

### Full always means 6 in catalog

`full` / `ui` / `optional` merge missing keys from `mcp.json.example` into the catalog (placeholders only). Existing tokens are **not** overwritten.

## Setup flow

```bash
node scripts/onboard-wizard.js
# Reload Cursor
# Open UI test repo → new chat (hook) or: node scripts/mcp-mode.js auto
```

Path prefs sync env (first path if multi):

- `paths.ui_tests` → Cypress `CYPRESS_PROJECT_PATH`
- `paths.perf_tests` → k6 `K6_PROJECT_PATH` (if catalogued)
- `paths.api_tests` → karate `KARATE_PROJECT_PATH` (if catalogued)

## Optional k6 / Karate MCP

See [mcp.json.optional.md](../mcp.json.optional.md).

## Secrets hygiene

```bash
node scripts/mcp-catalog-scrub.js
node scripts/mcp-catalog-scrub.js --write-redacted
```

Related: [SETUP.md](SETUP.md) · [FIRST_RUN.md](FIRST_RUN.md) · [MCP_TOOLS.md](../.cursor/MCP_TOOLS.md)
