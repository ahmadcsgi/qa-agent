---
name: qa-test-cases
description: Generate TestRail cases from Shortcut (batch of 5, ACC, addCase). Use for create test case, update case, or TC checklist.
---

# QA Test Cases

**Mandatory:** `testrail-case-generate.mdc` (Learn > Plan > Draft batches of 5 > ACC all > addCase). Also titles/draft/section/checklist rules. Methodology: `qa-testcase-methodology.md`.

Run boot (`proj ensure` > `boot`) **after** first reply, or in parallel with MCP search only if search already started in the same turn.

## TestRail access (API first)

**Auth:** TestRail REST uses **email + API Key** (My Settings), not account password. Credentials live in `testrail-mcp/config/env.local` (see `TestRailApi.ps1`).

**Default on Windows:** use `scripts/testrail-tools/` (`Invoke-TestRailApi`, `tr-*.ps1`) when `env.local` exists. Sync MCP env: `node scripts/sync-testrail-mcp-env.js`.

**MCP** (`user-testrail`) only when env in `~/.cursor/mcp.json` is filled. If MCP returns 404, timeout, or auth error:

1. One-line note to user, switch to CLI tools
2. Do not invent case IDs or plan payloads
3. Plan merge: always `get_tests` on target run before `update_plan_entry`

Ref: `.cursor/references/testrail-tools.md`

## Flow

1. Boot `testcases` + `cor list`. Read story. Dedup. Resolve section
2. Plan titles table > ACC plan
3. Draft preview to `temp/sc-{storyId}-preview.md` for user review > ACC all
4. `addCase` > merge onto progression/test run > Shortcut checklist `tests/view/<testId>`. Delete preview when done
5. Prefer one merged case when checks overlap (`testcases.merge_prefer_one`)

Never invent AC. Fields English if pref. Execution/plans: `@qa-test-execution`.
