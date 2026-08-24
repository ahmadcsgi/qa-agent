# Contributing to QA Agent

Thanks for improving QA Agent. This project is mostly Markdown skills + a small Node toolkit.

## Before you start

1. Read `README.md`, `AGENTS.md`, and `docs/DEMO.md`
2. Run `node scripts/doctor.js`
3. Run tests:
   ```bash
   node scripts/store.test.js
   node scripts/store.test.js
   node scripts/update-agent.js --skip-pull --dry-run
   ```

## What to change where

| Change | Edit |
|--------|------|
| Agent behavior / memory protocol | **`AGENTS.md` only** (`.cursor/agents/qa.md` must stay a thin pointer) |
| Always-on Cursor rules | `.cursor/rules/qa-agent-rules.mdc` |
| MCP tool names | `.cursor/MCP_TOOLS.md` + matching `.cursor/references/*` + skill MCP sections |
| One workflow | `.cursor/skills/<name>/SKILL.md` (+ `reference/` for detail) |
| Memory CLI | `scripts/store.js` (+ `scripts/store.test.js`) |
| Install / update | `install.*`, `update.*`, `uninstall.*` |

## Guidelines

- Prefer small, focused PRs
- Keep skill files terse; put long detail in `reference/`
- Never commit secrets, `~/.cursor/mcp.json`, or `.cursor/qa-memory/`
- Use **actual** MCP tool names from live schemas (see `MCP_TOOLS.md`)
- After behavior changes: update `CHANGELOG.md` and bump `VERSION` when appropriate
- Mirror user language in agent-facing skill copy; keep code/paths in English

## PR checklist

- [ ] `node scripts/doctor.js` passes (warnings OK if optional deps missing)
- [ ] `node scripts/store.test.js` passes
- [ ] Visual `compare.test.js` passes if you touched visual scripts
- [ ] Docs updated (`README` / `CHANGELOG` / skill refs)
- [ ] No credentials or personal memory files

## Release notes

Version is `VERSION` (SemVer). Document changes in `CHANGELOG.md` under `[Unreleased]` or the next version heading.
