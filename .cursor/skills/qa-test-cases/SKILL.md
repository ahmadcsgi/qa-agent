---
name: qa-test-cases
description: Generate and maintain TestRail cases from Shortcut stories. Mandatory learn/plan/draft batch-5 ACC gate, checklist, case updates, TC label groom. Ask when unclear.
---

# QA Test Cases

**Generate flow (MANDATORY):** `.cursor/rules/testrail-case-generate.mdc`  
**Also:** `testrail-case-draft.mdc` · `testrail-case-titles.mdc` · `testrail-shortcut-checklist.mdc` · `testrail-section-version.mdc` · `output-punctuation.mdc`  
**Methodology:** `.cursor/references/qa-testcase-methodology.md`  
**Execution:** `@qa-test-execution` (plan / pass / run)  
**Unclear?** Ask or Glean. Never invent AC, copy, or behavior.

## Boot

`proj ensure` then `boot testcases --project auto` · `cor list testcases 1 auto`

## Flow (new cases)

### 1. Learn
- Shortcut: `stories-get-by-id` (full)
- Version + section: `testrail-section-version.mdc`
- Dedup: Phase 2b
- Unclear → **ask user** or **Glean** (`search` / `read_document`). Stop if blocked.

### 2. Plan
- Table of proposed titles (no full steps yet)
- Wait **ACC plan** / **EDIT plan**

### 3. Draft
Fields every case: **Title · Objective · Precondition · Test step · Expectation** (+ Test data if used)  
Preview file: `.cursor/qa-memory/generated-tests/manual/sc-<id>-preview.md` (complete)

### 4. Show ≤5 per turn
If >5 cases: Part 1/N = first 5 only. Wait **ACC / EDIT / REJECT / DELETE** (or **ACC all** for batch). Then next 5. Never dump all at once.

### 5. Write TestRail (only after all ACC)
`addCase` for ACC'd only → checklist per case. No write for REJECT/DELETE.

### 5b. Label groom (optional)
`TC-on-progress` → propose **TC-ready** → ACC → `stories-update`

### 6. Memory
`cor add` on lessons · `proj sync` if mapping changed

### 7. Plan / results / maintenance
- Test plan or mark Passed: `@qa-test-execution`
- Fix existing case: diff preview → ACC → `updateCase`

## MCP

`stories-get-by-id` · `stories-add-task` · `stories-update` · `getCases` · `getCase` · `getSections` · `addSection` · `addCase` · `updateCase` · `moveToSection` · Glean if domain unclear

## References

`testrail-case-generate.mdc` · `qa-testcase-methodology.md` · `testrail-api.md`
