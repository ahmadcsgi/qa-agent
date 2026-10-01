---
name: qa-test-execution
description: TestRail plans, add cases to plan runs, mark pass/fail, Shortcut label groom. Use for test plan, centang, mark results, or TC-ready.
---

# QA Test Execution

**Before ad-hoc `tmp-*.ps1`:** use `scripts/testrail-tools/` (see `.cursor/references/testrail-tools.md`).

**External writes** (bulk field update, Shortcut label/metadata): `external-edit-backup-gate.mdc` + `node scripts/backup-external-edit.js`.

## Pre-flight (batch plan/result work)

1. `node scripts/qa-health.js` optional when env feels wrong.
2. Resolve plan/run from prefs / `know search testrail` / URL / `org-context.md` (no hardcoded org IDs in chat).
3. Plan-owned runs: **never** `updateRun` (403). Merge via `update_plan_entry` or `tr-update-plan-entry.ps1`.
4. **Merge safety:** `get_tests/{runId}` for existing case IDs, then append. Replace-only wipes results.
5. MCP TestRail error > CLI tools + one-line note.

## Create plan

Preview name/milestone/entries > ACC > `addPlan`. Name: `[TEST PLAN] <version> <Squad>`. Description: feature only or empty (`testrail.plan_description=feature_only`).

## Add cases to existing plan

Split entries by product area. Never merge unrelated areas (Lifecycle / Docflow / Process separate).

```powershell
cd scripts/testrail-tools
.\tr-update-plan-entry.ps1 -PlanId <id> -EntryId '<uuid>' -SuiteId 282 -CaseIds @(<ids>)
```

Verify count with `get_tests` after merge.

## Mark results

Resolve run + cases. Checklist may use `cases/view/<id>` for lookup. Status: 1 Pass · 2 Blocked · 4 Retest · 5 Fail. Never invent results. Done-story flow: merge checklist cases onto correct Q3 run, fix checklist to `tests/view/<testId>`, bulk Pass via `add_result` when user confirms executed.

## Label groom

`TC-on-progress` while writing > `TC-ready` after ACC + checklist links. Preview labels first.

## Router hint

Story **Done** + "tandai Pass" / centang / groom > this skill, not `@qa-test-cases`.

Refs: `testrail-api.md` · prefs `testrail.*_plan_*` · `org-context.md`.
