---
name: qa-test-execution
description: TestRail plans, add cases to plan runs, mark pass/fail, Shortcut label groom. Use for test plan, centang, mark results, or TC-ready.
---

# QA Test Execution

## Create plan

Preview name/milestone/entries > ACC > `addPlan`. Name pattern if used: `[TEST PLAN] <version> <Squad>`. Description: feature only (or empty). Pref `testrail.plan_description=feature_only`.

## Add cases to existing plan

1. Resolve plan/run from prefs / know / URL / private `org-context.md` (never hardcode org IDs here)
2. Split entries by product area. Never merge unrelated areas
3. Plan runs: MCP `updateRun` often **403**. Use REST `update_plan_entry` with full `case_ids`
4. Then `addResultsForCases` on the run id

## Mark results

Resolve run + cases (checklist `cases/view/<id>` preferred). Status: 1 Pass · 2 Blocked · 4 Retest · 5 Fail. Never invent results.

## Label groom

`TC-on-progress` while writing > `TC-ready` after ACC + checklist links. Preview labels first.

Refs: `testrail-api.md` · prefs `testrail.*_plan_*` · `org-context.md`.
