# QA Test Cases — full flow (reference)

Load with `@qa-test-cases`. Rules: `testrail-case-generate.mdc`, `external-edit-backup-gate.mdc`, `testrail-temp-preview-lifecycle.mdc`.

## Before any MCP write (checklist)

| Step | Action |
| --- | --- |
| 1 | Load mandatory rules above |
| 2 | `cor list testrail 1` + `know search testrail` |
| 3 | TestRail: prefer `scripts/testrail-tools/` when `env.local` exists (`tools.testrail_via=api` pref) |
| 4 | MCP error (404, auth, timeout) > one-line note > CLI. Never invent case or run IDs |
| 5 | External mutation (not new ACC'd cases) > fetch full state > `node scripts/backup-external-edit.js …` > preview > user ACC |

## TestRail access

**Auth:** email + API Key in `testrail-mcp/config/env.local` (`TestRailApi.ps1`).

Sync MCP env: `node scripts/sync-testrail-mcp-env.js`. Pref: `paths.testrail_mcp` or `TESTRAIL_MCP_ROOT`.

**Plan merge:** always `get_tests` on target run before `update_plan_entry`. Never `updateRun` on plan-owned runs (403).

Ref: `testrail-tools.md` · `testrail-api.md`

## Case generate (new cases)

1. **Learn:** `stories-get-by-id` + full comments thread. Section (`testrail-section-version.mdc`). Dedup. Confluence if unclear. `refs` = full Shortcut URL.
2. **Plan:** titles table, no overlap. User ACC plan.
3. **Draft:** batches of 5 in `temp/sc-{storyId}-preview.md`. ACC / EDIT / REJECT per batch.
4. **Write:** `addCase` only after ACC. Merge run via `update_plan_entry` or `tr-update-plan-entry.ps1`.
5. **Shortcut:** checklist link `tests/view/<testId>` (not `cases/view`). `testrail-shortcut-checklist.mdc`.
6. **Cleanup:** delete preview when write path complete or abandoned (`testrail-temp-preview-lifecycle.mdc`).

Prefer one merged case when checks overlap (`testcases.merge_prefer_one`).

## Execution handoff

Plans, bulk Pass, label groom, plan entry merge: `@qa-test-execution` (not this skill).

Methodology depth: `qa-testcase-methodology.md`.
