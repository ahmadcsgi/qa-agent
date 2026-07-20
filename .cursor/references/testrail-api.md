# TestRail MCP API Quick Reference

Actual tool names from `@uarlouski/testrail-mcp-server` (camelCase).

## Installation
```bash
npx @uarlouski/testrail-mcp-server
# Config in ~/.cursor/mcp.json:
# {
#   "command": "npx",
#   "args": ["-y", "@uarlouski/testrail-mcp-server"],
#   "env": {
#     "TESTRAIL_URL": "https://your-org.testrail.io",
#     "TESTRAIL_USERNAME": "email",
#     "TESTRAIL_API_KEY": "key"
#   }
# }
```

## Cases

### getCases
```javascript
getCases({ projectId: 1, suiteId: 1, sectionId: 100, limit: 250 })
getCases({ projectId: 1, suiteId: 1, refs: "12345" })
```

### getCase / addCase / updateCase / deleteCase / moveToSection
```javascript
getCase({ caseId: 456 })
addCase({ sectionId: 100, title: "When …, then …", templateId: 1, customSteps: "…", customExpected: "…", customPrerequisites: "…" })
updateCase({ caseId: 456, title: "…", customSteps: "…", customExpected: "…" })
moveToSection({ caseIds: [456], sectionId: 100 })
```

**ACC required** before `addCase` · `updateCase` · `deleteCase` · `addSection` (see `testrail-case-draft.mdc`).

## Sections

```javascript
getSections({ projectId: 1, suiteId: 1, limit: 250 })
getSection({ sectionId: 100 })
addSection({ projectId: 1, suiteId: 1, parentId: 100, name: "Child section" })
```

## Plans · runs · results

### addPlan
```javascript
addPlan({
  projectId: 1,
  name: "[TEST PLAN] <version> <Squad>",
  milestoneId: 10,
  description: "…",
  entries: [{
    suite_id: 1,
    name: "Feature area",
    include_all: false,
    case_ids: [101, 102]
  }]
})
```

### getPlans / addPlanEntry
```javascript
getPlans({ projectId: 1 })
addPlanEntry({ planId: 50, suiteId: 1, name: "Feature area", includeAll: false, caseIds: [101] })
```

### getRuns / getTests / addRun
```javascript
getRuns({ projectId: 1 })
getTests({ runId: 60 })
addRun({ projectId: 1, suiteId: 1, name: "Smoke", includeAll: false, caseIds: [101] })
```

### addResultsForCases
```javascript
addResultsForCases({
  runId: 60,
  results: [
    { caseId: 101, statusId: 1, comment: "Passed for sc-12345" },
    { caseId: 102, statusId: 1, comment: "Passed for sc-12345" }
  ]
})
```

| statusId | Meaning |
|---------:|---------|
| 1 | Pass |
| 2 | Blocked |
| 3 | Untested |
| 4 | Retest |
| 5 | Fail |

### getMilestones
```javascript
getMilestones({ projectId: 1 })
```

## Tips
- Dedup before draft: `getCases` by section **and** refs story id
- Prefer Text template (`templateId: 1`) with `customSteps` / `customExpected` / `customPrerequisites`
- Objective / testdata often live in custom fields (`custom_case_testcaseobjective`, `custom_case_testdata`)
- Always APPROVAL before write tools
- Plan naming (if used): `[TEST PLAN] <version> <Squad>`
- Real project/suite/section IDs: from `project-context/current.md`, not hardcoded here
