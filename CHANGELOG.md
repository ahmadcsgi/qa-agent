# Changelog

All notable changes to QA Agent are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project uses [SemVer](https://semver.org/).

## [1.5.0] - 2026-07-21

### Added
- `onboard-progress.js`: live Ready table, `--resume`, `--tools`, `--json`
- Wizard: `--resume`, `--print-tools`, `--print-form [--lang id|en]`, `--dry-run`
- Path re-ask (interactive) and `--apply` exit 2 when UI/API/perf path missing on disk
- Chat onboard: TodoWrite steps include tooling detect + Part C optional
- Clearer Reload banner when MCP profile switches (`prev > next`)
- Boot one-liner guidance: `MCP: <profile> (auto)`
- DEMO ≈3-minute path

### Changed
- Private/public onboard agent instructions aligned to resume/apply flow
- Multi-product note: prefs follow opened folder (`proj ensure`)

## [1.4.10] - 2026-07-21

### Changed
- `/qa onboard` chat UX: TodoWrite checklist (tick per step) + spaced question form (not one crammed line)

## [1.4.9] - 2026-07-21

### Added
- Chat onboard: `--print-learn` / `--apply --squad --ui --api --perf --tools`
- `onboard-learn.js`: parse onboard.md links into prefs `links.*` + learn table rows
- User `sessionStart` hook (`install-mcp-hook.js` / `hooks/mcp-auto-session.js`) for path-aware auto
- Multi-path prefs (`pathA|pathB`), path validation warnings
- `setup-tooling.js --only k6,java,mvn` for targeted installs
- `mcp-mode.js --quiet --if-changed`
- Wizard end summary (copy for chat). Sync Cypress/k6/karate env paths

### Changed
- Learn table distinguishes **catalog** vs **active** mcp.json
- `/qa onboard` and `@qa-entry` use chat wizard flow
- ONBOARDING / MCP / FIRST_RUN / onboard.example document wizard as primary

## [1.4.8] - 2026-07-21

### Added
- Path-aware MCP: `mcp-mode.js auto|ui|api|perf` (lite outside test paths; Cypress only under UI path)
- `scripts/onboard-wizard.js`: learn table → full MCP → squad/paths → tooling picker (`1,2` or `5`=all)
- Pref `mcp.path_aware` set by wizard

### Changed
- `/qa onboard` prefers onboard-wizard
- Docs MCP / FIRST_RUN / onboard.example updated for path-aware model

## [1.4.7] - 2026-07-21

### Fixed
- `install.ps1`: define missing `Ensure-Dir` (was called when copying rules, caused CommandNotFoundException on Windows)

## [1.4.6] - 2026-07-21

### Added
- `docs/FIRST_RUN.md`: clone → install → **Reload** → `/qa onboard` (fixes chicken-egg for new clones)
- `scripts/onboard-status.js`: Ready table dry-run (✓/✗)
- Entry smart-detect: automate from TestRail `C…` **or** Shortcut story
- `setup-prefs.js` offers Cypress MCP path sync from `paths.ui_tests`
- Sample `/qa` prompts in project-context template

### Changed
- README remote install URLs → `ahmadcsgi/qa-agent`
- Installer / DEMO / ONBOARDING stress Reload before `/qa`
- `@qa-entry` + `/qa` command: onboard status + FIRST_RUN gate

## [1.4.5] - 2026-07-21

### Added
- `ensureProfileServersInCatalog`: `mcp-mode full|optional` fills missing servers from examples without wiping secrets
- `scripts/mcp-catalog-scrub.js`: scan secret-looking fields, write `catalog.redacted.json`
- `scripts/setup-prefs.js`: squad + paths wizard
- `scripts/check-version.js`: local vs remote VERSION
- `onboard.example.md` + `docs/ONBOARDING.md` (public stub vs private share)
- Docs: `docs/SETUP.md`, `docs/MCP.md`, `docs/README.md`, expanded `docs/DEMO.md` skill matrix
- `/qa onboard` routing in command + `@qa-entry`
- CI: setup-mcp/setup-git tests, qa-test-execution, new scripts/docs checks

### Changed
- Boot prefs: undotted keys (e.g. `default_env`) always included. Domain `ui` mapped
- Uninstall removes `mcp-mode.js`/`mcp-lib.js` when `--keep-memory`. Includes `qa-test-execution`
- Doctor warns on catalog secrets + checks new docs/scripts

## [1.4.4] - 2026-07-21

### Added
- `scripts/mcp-lib.js` + `scripts/mcp-mode.js` (profiles: `lite` | `full` | `optional` | `all` | `status`). `normal` = alias of `full`
- `scripts/setup-tooling.js`: detect/install k6, Java, Maven (winget/brew)
- `scripts/setup-mcp.test.js`: merge/profile/placeholder self-checks
- `mcp.json.optional.md`: when to skip karate MCP (Maven-first CSG repos)
- Installer seeds `~/.qa-agent/mcp/catalog.json` from examples if missing (never overwrites existing catalog)
- Installer optional one-shot: setup-mcp + setup-git + setup-tooling
- Doctor checks optional MCP CLIs, catalog, k6/java/mvn, mcp-mode install

### Changed
- `setup-mcp.js` syncs catalog, auto-fills paths from `paths.*` prefs
- `docs/DEMO.md` uses setup scripts (not hand-copy only)
- MCP profile language aligned: full (not legacy "normal" as primary)

## [1.4.3] - 2026-07-21

### Added
- `scripts/setup-mcp.js`: interactive Cursor MCP setup (`--full` default / `--lite`). Writes `~/.cursor/mcp.json`, prompts for TestRail (and optional) tokens. `--normal` = alias of `--full`
- `mcp.json.optional.example`: optional **k6** + **karate** MCP (`k6 x mcp`, `karate mcp --stdio`). Not required when using `paths.perf_tests` / `paths.api_tests`
- `scripts/setup-git.js`: detect Git, optional auto-install (winget / Homebrew), configure `user.name` / `user.email` (+ Windows gpg.program helper)
- `setup-mcp.js --with-optional`: merge k6 + karate into `mcp.json`

### Changed
- Installer next steps point to `setup-mcp.js` + `setup-git.js`
- `mcp.json.example` defaults for CSG TestRail + Glean URLs
- Doctor warns on missing full MCP servers, TestRail placeholders, or missing Git identity
- Onboard A3 documents MCP setup + optional k6/karate + Git setup
- Default MCP mode **full** (6 servers). Clarify Git is CLI. k6/Karate optional MCP

## [1.4.2] - 2026-07-20

### Added
- `testrail-case-generate.mdc`: mandatory Learn > Plan > Draft > **batch of 5** > ACC/EDIT/REJECT/DELETE > then TestRail write
- Boot prefs filter by domain prefix (`filterPrefsForBoot`) to shrink session payload

### Changed
- `@qa-test-cases` + methodology enforce generate flow and batch-of-5 chat gate
- DNA / `AGENTS.md` point to generate rule as must-follow for new cases

## [1.4.1] - 2026-07-20

### Changed
- **Neutral repo:** no org/product hardcodes. Incident templates (`incident-email.md`) replace Helix-named docs. Generic TestRail section/checklist rules
- **Cursor lite:** only `qa-agent-rules.mdc` is `alwaysApply: true`. Domain rules (TestRail draft/titles/section/checklist, punctuation, bug description) are requestable
- Slimmer `AGENTS.md` + `@qa-entry`. Boot defaults: `n=3`, context excerpt 400 chars

### Removed
- `helix-email.md` (replaced by `incident-email.md`)

## [1.4.0] - 2026-07-20

### Added
- `@qa-test-execution` skill: TestRail plans, runs, mark Passed/Failed (ACC / explicit request)
- Methodology Phase **2b** (duplicate case check) and Phase **7** (plan / results)
- Case maintenance + Shortcut **TC-on-progress to TC-ready** label groom flows
- Portable TestRail rules in repo: `testrail-case-draft`, `testrail-case-titles`, `testrail-section-version`, `testrail-shortcut-checklist`, `output-punctuation`, `shortcut-bug-description`
- Installer scaffolds `generated-tests/manual/` and copies all `.cursor/rules/*.mdc`
- Project-context template fields: TestRail IDs, section map, TC labels, product notes
- DEMO steps 6–7 for plan/pass and label groom

### Changed
- `@qa-test-cases` / `@qa-entry` route plan, pass, update case, label groom
- `MCP_TOOLS.md` + `testrail-api.md` + `shortcut-api.md` document plans, results, tasks, labels
- `doctor.js` checks new skill, draft rule, methodology

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
