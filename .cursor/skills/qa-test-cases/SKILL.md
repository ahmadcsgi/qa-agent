---
name: qa-test-cases
description: Generate TestRail cases from Shortcut (batch of 5, ACC, addCase). Use for create test case, update case, or TC checklist.
---

# QA Test Cases

**Mandatory:** `testrail-case-generate.mdc` (Learn > Plan > Draft batches of 5 > ACC all > addCase). Also titles/draft/section/checklist rules. Methodology: `qa-testcase-methodology.md`.

Run boot (`proj ensure` > `boot`) **after** first reply, or in parallel with MCP search only if search already started in the same turn.

## TestRail MCP fallback

If TestRail MCP returns 404, timeout, or auth error on read/write:

1. Tell user MCP failed (one line) and switch to `scripts/testrail-tools/` or org `TestRailApi.ps1`
2. Do not invent case IDs or plan payloads
3. Plan merge: always `get_tests` on target run before `update_plan_entry`

Ref: `.cursor/references/testrail-tools.md`

## Flow

1. Boot `testcases` + `cor list`. Read story. Dedup. Resolve section
2. Plan titles table > ACC plan
3. Draft preview under `qa-memory/generated-tests/` > ACC all
4. `addCase` + Shortcut checklist links. Delete preview when done
5. Prefer one merged case when checks overlap (`testcases.merge_prefer_one`)

Never invent AC. Fields English if pref. Execution/plans: `@qa-test-execution`.
