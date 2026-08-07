---
name: qa-test-execution
description: TestRail plans, runs, and results (mark Passed/Failed), plus TC label groom. Preview then ACC. Use for test plan, add to run, mark pass/fail, centang, or TC-ready.
---

# QA Test Execution

**Lite skill** for post-case lifecycle. Case *creation* stays in `@qa-test-cases`.

**Methodology:** Phase 7 in `.cursor/references/qa-testcase-methodology.md`  
**Punctuation:** `.cursor/rules/output-punctuation.mdc`

## Boot

`proj ensure` then `boot testcases --project auto`

## When to use

| Trigger | Action |
|---------|--------|
| "buat test plan", plan name + milestone | Preview plan then ACC then `addPlan` |
| "centang / set passed / mark fail" + story or case IDs | Resolve cases then `addResultsForCases` |
| Link `plans/view` or `runs/view` | Operate on that plan/run |
| `TC-on-progress` / `TC-ready` / "label groom" | Shortcut label update (ACC) |

## Flow — Test plan

1. Resolve from prefs / project-context / user: `projectId`, `milestoneId`, plan **name**, `suiteId`
2. Resolve **case IDs** (section children, checklist, or explicit list). State **exclusions**
3. Preview table: name · milestone · entry/run name · case count · excludes
4. Wait for **ACC**
5. `addPlan` (`include_all: false` + `case_ids` when selective)
6. Return plan URL + run URL

Naming pattern (if team uses it): `[TEST PLAN] <version> <Squad>` e.g. `[TEST PLAN] 26.3 MySquad`

**Description (plan / entry / milestone):** feature under test only (e.g. `Checkout`, `Login`). Never story/case/plan/run IDs, format reminders, or AI post-create summaries. Prefer **empty** over robotic text. Pref: `testrail.plan_description=feature_only`.

## Flow — Add cases to an existing plan

1. Resolve plan from prefs / know / URL / private `.cursor/qa-memory/org-context.md` (never hardcode org plan IDs in this skill).
2. Split entries by product area when the plan uses them. Never merge unrelated areas into one entry.
3. **Plan runs:** MCP `updateRun` returns **403** on runs that belong to a plan. Use TestRail API `update_plan_entry/{planId}/{entryId}` with `suite_id`, `include_all: false`, and **full** `case_ids` (existing + new). Then `addResultsForCases` on the run id.
4. If MCP has no `getPlan` / `update_plan_entry`, use REST with credentials from local MCP env (never print secrets). Prefer prefs/know for plan/run ids before listing all plans.

## Flow — Mark results

1. Resolve `runId` + case IDs (Shortcut checklist `cases/view/<id>` preferred)
2. Confirm status (Passed = default when user says centang/passed)
3. If user was explicit ("centang di plan ini") then proceed. Else brief confirm
4. `addResultsForCases` with `statusId`: `1` Pass · `2` Blocked · `4` Retest · `5` Fail
5. Comment: story id + short note

Never invent results. Never mark cases the user did not name (or that are not on the story checklist they pointed to).

After cases are in plan + Passed (when user asked), optionally offer Shortcut label groom `TC-on-progress` > `TC-ready`.

## Flow — Label groom (Shortcut)

| From | To | When |
|------|-----|------|
| (none) / draft | `TC-on-progress` | Cases being written / in review |
| `TC-on-progress` | `TC-ready` | Cases ACC'd in TestRail + checklist links done |

1. Resolve story id
2. Preview: current labels → proposed change
3. **ACC** then `stories-update` (labels)
4. Cite story URL

Do not remove unrelated labels. Ask if multiple TC labels conflict.

## MCP

`getPlans` · `addPlan` · `addPlanEntry` · `getRuns` · `getTests` · `addResultsForCases` · `addResultForCase` · `stories-get-by-id` · `stories-update` · `labels-list`

**Missing in MCP (use REST):** `get_plan` · `update_plan_entry` (required to add cases to an existing plan run)

## References

`testrail-api.md` · `MCP_TOOLS.md` · `shortcut-api.md` · project-context · prefs `testrail.*_plan_*` / private `qa-memory/org-context.md`
