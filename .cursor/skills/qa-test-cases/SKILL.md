---
name: qa-test-cases
description: Generate TestRail cases from Shortcut (batch of 5, ACC, addCase). Use for create test case, update case, or TC checklist.
---

# QA Test Cases

**Mandatory:** `testrail-case-generate.mdc` (Learn > Plan > Draft batches of 5 > ACC all > addCase). Also titles/draft/section/checklist rules. Methodology: `qa-testcase-methodology.md`.

## Flow

1. Boot `testcases` + `cor list`. Read story. Dedup. Resolve section
2. Plan titles table > ACC plan
3. Draft preview under `qa-memory/generated-tests/` > ACC all
4. `addCase` + Shortcut checklist links. Delete preview when done
5. Prefer one merged case when checks overlap (`testcases.merge_prefer_one`)

Never invent AC. Fields English if pref. Execution/plans: `@qa-test-execution`.
