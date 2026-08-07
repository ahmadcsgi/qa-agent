---
name: qa-api-test
description: Generate Karate API tests from Shortcut stories, OpenAPI, or endpoint URL. Feature files, assertions, data-driven. Use for Karate, API test, API automation, REST endpoint, or Maven API repo.
---

# QA API Test (Karate)

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Source**: "Do you have a Shortcut story ID, OpenAPI spec, or endpoint URL?"
   - Story → read via Shortcut MCP
   - OpenAPI → ask for file path or URL
   - Endpoint → ask for details
2. **Coverage**: "What test coverage?"
   - **Happy path only** - 200/201 responses
   - **Happy + Error** - success + 4xx/5xx
   - **All** - happy + error + schema validation + edge cases
3. **Method**: "HTTP method? (GET, POST, PUT, DELETE, PATCH)"
4. **Environment**: "Base URL environment? (e.g. staging, production)"
5. **Auth**: "Is there authentication? (Bearer token, Basic auth, API key, or none)"

### Step 2: Memory gate (mandatory) then Understand API

Load `.cursor/rules/automation-memory-gate.mdc`.

1. Resolve `paths.api_tests`. If unset → ask for API test repo path. Do not invent.
2. Read `.cursor/qa-memory/project-context/current.md`.
3. If missing, empty, >7d, or mapped root ≠ `paths.api_tests` → **`@qa-project-mapping`** on that path → save → `proj sync`.
4. If fresh → reuse memory.
5. Then:
   - Read the story/AC to understand the business logic
   - Use memory for base URL and auth patterns
   - Check decision memory: `node ~/.qa-agent/lib/store.js cor list "api-test" "1"` - apply proven patterns (score >= 1)
   - Avoid past mistakes: `node ~/.qa-agent/lib/store.js cor list "api-test" "-999" "-1"` - score <= -1
   - If OpenAPI spec is available → read to get request/response schema

### Step 3: Research (if needed)
- Context7: `resolve-library-id("karate", "Karate")` + `query-docs` for latest syntax
- Glean: internal API docs / Confluence
- `.cursor/references/karate-testing.md` - offline quick reference

### Step 3b: Climb Decision Ladder
Call `@qa-token-saver` and `coding-principles.mdc` flow (needed now? > simpler? > seen 3x?):
1. **YAGNI**: Does this endpoint need testing? Already covered?
2. **Reuse**: Any existing Karate helper/callonce/feature?
3. **Stdlib**: `match response`, `status` sufficient?
4. **Native**: HTTP status codes enough for assertions?
5. **Existing dep**: Existing utils/library sufficient?
6. **One-liner**: Can Scenario Outline save lines?
7. **Minimum**: Is happy path enough or need error tests?

If authz, free-text filter/search, or file upload: `@qa-security-review` lite (no secrets in feature files).

### Step 4: Generate Karate Feature

Create `.feature` file with Karate structure:

```
Feature: [API feature name]
  Background:
    * url '[base_url]'
    * configure headers = { Authorization: '#(authToken)' }
    # or callonce for login

  Scenario: [scenario name]
    Given path '/api/v1/resource'
    And request { key: 'value' }
    When method [METHOD]
    Then status [expected_code]
    And match response == { ... }
    And match response.*.field == '##string'
```

**Coverage rules:**

Happy path:
- 1 scenario for success response
- Validate response body structure
- Validate status code

Error:
- Invalid request body (missing fields, wrong types)
- Invalid auth (no token, expired token)
- Resource not found (404)
- Validation errors (400/422)
- Unauthorized (401) / Forbidden (403)

Edge:
- Empty payload
- Max payload size
- Special characters in input
- Concurrent requests (if relevant)

### Step 5b: Reflexion - Self-Review Before Preview
BEFORE showing to the user, review the generated output:
1. **Correctness**: Are endpoint, method, and payload correct?
2. **Minimality**: Can Scenario Outline save lines?
3. **Reuse**: Any missed callonce / helper feature?
4. **Consistency**: Karate format matching standards? (match response, status code)
5. **If there is an issue → refine automatically**
6. **Then show** to the user for APPROVE/EDIT/REJECT

### Step 6: Preview & User Loop
Show the preview file:
```karate
Feature: ...
  Background: ...
  Scenario: Create resource successfully
    ...
```

Ask user (type number or custom):
1. APPROVE - save file + notify path
2. EDIT - ask for correction -> apply -> preview again
3. REJECT - save rejection reason to memory
or type your own answer

### Step 7: Auto-Run (Optional)
Ask the user: "Would you like to run it now?"
- `mvn test -Dkarate.options="classpath:features/..."` or
- `java -jar karate.jar features/...`

### Step 8: Auto-Healing (if run fails)
- Read error log → identify the issue
- Fix: endpoint typo, request format, auth issue
- Re-run max 2x
- If still failing → show error + ask for guidance

### Step 9: Save to Memory
- Update `.cursor/qa-memory/generated-tests/karate/` with references
- Update `.cursor/qa-memory/project-context/current.md` if new endpoint info

## MCP Tools
- **Shortcut**: `stories-get-by-id` - read story context
- **Glean**: `search`, `read_document` - internal API docs
- **Context7**: Karate framework docs
- (No direct Karate MCP - run via terminal)

## References
- `.cursor/references/karate-testing.md` - Karate syntax reference
- `.cursor/references/git-workflow.md` - branching for PR
- `~/.qa-agent/`
