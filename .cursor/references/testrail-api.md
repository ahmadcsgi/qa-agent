# TestRail MCP API Quick Reference

## Installation
```bash
npx @uarlouski/testrail-mcp-server
# Config di ~/.cursor/mcp.json:
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

### get_cases(section_id)
Get all test cases in a section.
```javascript
get_cases(section_id: 123)
// Returns: [{ id, title, type_id, priority_id, estimate, ... }]
```

### get_case(case_id)
Detail satu test case.
```javascript
get_case(case_id: 456)
// Returns: { id, title, section_id, template_id, type_id, priority_id, estimate, custom_steps, custom_expected, ... }
```

### add_case(section_id, title, type_id, priority_id, estimate, custom_steps, custom_expected)
Buat test case baru.
```javascript
add_case({
  section_id: 123,
  title: 'Verify user can login with valid credentials',
  type_id: 1,        // 1=Positive, 2=Negative, 3=Edge, 4=Boundary
  priority_id: 2,    // 1=High, 2=Medium, 3=Low
  estimate: '5m',
  custom_steps: '1. Open login page\n2. Enter email\n3. Enter password\n4. Click Login',
  custom_expected: 'User is redirected to dashboard'
})
```

### update_case(case_id, ...)
Update existing test case.
```javascript
update_case({ case_id: 456, title: 'Updated title', priority_id: 1 })
```

### delete_case(case_id)
Hapus test case.
```javascript
delete_case(case_id: 456)
```

### get_sections(project_id, suite_id)
Ambil daftar section dalam project/suite.
```javascript
get_sections(project_id: 1, suite_id: 1)
// Returns: [{ id, name, description, ... }]
```

### get_section(section_id)
Detail satu section.
```javascript
get_section(section_id: 123)
```

### get_runs(project_id)
Ambil test runs.
```javascript
get_runs(project_id: 1)
// Returns: [{ id, name, passed_count, failed_count, ... }]
```

### add_run(project_id, suite_id, name, description, include_all, case_ids)
Buat test run baru.
```javascript
add_run({
  project_id: 1,
  suite_id: 1,
  name: 'Smoke Test 2024-01-01',
  description: 'Daily smoke test',
  include_all: false,
  case_ids: [123, 456, 789]
})
```

## Type IDs (configurable per project)
| ID | Type | Used when |
|----|------|-----------|
| 1 | Positive | Happy path scenarios |
| 2 | Negative | Error handling, invalid input |
| 3 | Edge | Empty, single item, max items |
| 4 | Boundary | Min/max values, threshold |

## Priority IDs
| ID | Priority | Criteria |
|----|----------|----------|
| 1 | High | Core functionality, blocking |
| 2 | Medium | Important but non-blocking |
| 3 | Low | Nice to have, cosmetic |

## Tips
- Always check existing cases before adding (via `get_cases`)
- Use `section_id` from `get_sections()` for accurate section targeting
- Format `custom_steps` with newline (`\n`) for structured steps
- Always get APPROVAL before `add_case`, `update_case`, `delete_case`
