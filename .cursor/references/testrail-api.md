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

## Available Tools

### getCases
Get test cases (filter by project/suite/section as supported by the server).
```javascript
getCases({ projectId: 1, suiteId: 1, sectionId: 123 })
// Returns: [{ id, title, type_id, priority_id, estimate, ... }]
```

### getCase
Detail for one test case.
```javascript
getCase({ caseId: 456 })
// Returns: { id, title, section_id, template_id, type_id, priority_id, estimate, custom_steps, custom_expected, ... }
```

### addCase
Create a new test case (ONLY after APPROVAL).
```javascript
addCase({
  sectionId: 123,
  title: 'Verify user can login with valid credentials',
  typeId: 1,        // project-specific type IDs
  priorityId: 2,
  estimate: '5m',
  customSteps: '1. Open login page\n2. Enter email\n3. Enter password\n4. Click Login',
  customExpected: 'User is redirected to dashboard'
})
```

### updateCase
Update an existing test case.
```javascript
updateCase({ caseId: 456, title: 'Updated title', priorityId: 1 })
```

### deleteCase
Delete a test case.
```javascript
deleteCase({ caseId: 456 })
```

### getSections / getSection
```javascript
getSections({ projectId: 1, suiteId: 1 })
getSection({ sectionId: 123 })
```

### getRuns / addRun
```javascript
getRuns({ projectId: 1 })
addRun({
  projectId: 1,
  suiteId: 1,
  name: 'Smoke Test 2024-01-01',
  description: 'Daily smoke test',
  includeAll: false,
  caseIds: [123, 456, 789]
})
```

## Type / Priority IDs
Type and priority IDs vary per TestRail project. Prefer `getCaseTypes` / project fields over hardcoded IDs.

| Typical priority | Meaning |
|------------------|---------|
| High | Core functionality, blocking |
| Medium | Important but non-blocking |
| Low | Nice to have, cosmetic |

## Tips
- Always check existing cases before adding (`getCases`)
- Use `sectionId` from `getSections` for accurate section targeting
- Format steps with newline (`\n`) for structured steps
- Always get APPROVAL before `addCase`, `updateCase`, `deleteCase`
