# Changelog

All notable changes to QA Agent are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project uses [SemVer](https://semver.org/).

## [1.3.0] - 2026-07-15

### Added
- **Multi-project memory (3 layers):** global + `~/.qa-agent/projects/<id>/` + workspace `.cursor/qa-memory/`
- CLI: `proj ensure|list|get|sync`; `boot --project auto|*|<id>`; scoped `cor`/`pref`/`know`
- Scope tags on entries (`proj: "*"` or project id)
- Docs: `docs/MULTI_PROJECT_MEMORY.md`

## [1.2.1] - 2026-07-15

### Added
- Slash command `/qa` via `.cursor/commands/qa.md` (project + global install)
- Ignore `.cursor/plugins/` cache; rules forbid attaching `superpowers` / `.cache-complete`

### Fixed
- `/qa` no longer depends on conflicting Cursor plugins — local command owns the name

## [1.2.0] - 2026-07-15

### Added
- Agent **DNA**: lite / fast / small / smart / learns / grows / token-thrifty / adapts
- `prefs.json` + `pref get|set|del` for durable user preferences
- `boot [domain]` — tiny session brain (prefs + top good/bad lessons)
- Always-on learn loop in rules: every correction → memory; prefs from chat

### Changed
- `AGENTS.md` + `.mdc` rules rewritten around growth and token thrift
- `@qa` agent description emphasizes co-evolution with the user

## [1.1.0] - 2026-07-15

### Added
- `cache hash` CLI on `store.js`; `cor list` supports max score filter
- Project context template (`.cursor/templates/`)
- Installer copies `.cursor/references/` and offers visual npm install on Windows
- `scripts/doctor.js` health check
- `update.ps1` / `update.sh` and `uninstall.ps1` / `uninstall.sh`
- `mcp.json.example` (no secrets)
- `docs/DEMO.md` walkthrough
- Visual compare smoke test + CI job
- `LICENSE` (MIT), `CONTRIBUTING.md`, PR template
- This `CHANGELOG.md` and `VERSION` file

### Changed
- MCP tool names synced to live Shortcut / TestRail / Playwright / Cypress APIs
- Visual temp paths use `os.tmpdir()` (Windows-safe)
- `@qa` agent file is a thin pointer to `AGENTS.md` (single source of truth)
- Org-specific hardcodes replaced with project-memory placeholders
- Token-efficiency section describes design intent (not unverified %)

### Fixed
- Negative correction lookup (`cor list domain -999 -1`)
- Documentation drift (agent filename, Karate roadmap status)

## [1.0.0] - 2026-07-13

### Added
- Initial modular skills, memory store, installers, visual regression skill
