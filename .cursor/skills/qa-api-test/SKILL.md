---
name: qa-api-test
description: Generate Karate API tests from Shortcut stories or OpenAPI specs. Interactive flow: ask for endpoint, method, request/response patterns, coverage type, generates Karate feature files. Use when asked for API testing, Karate tests, API automation, or endpoint testing.
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
   - **Happy path only** — 200/201 responses
   - **Happy + Error** — success + 4xx/5xx
   - **All** — happy + error + schema validation + edge cases
3. **Method**: "HTTP method? (GET, POST, PUT, DELETE, PATCH)"
4. **Environment**: "Base URL environment? (e.g. staging, production)"
5. **Auth**: "Is there authentication? (Bearer token, Basic auth, API key, or none)"

### Step 2: Understand API
- Read the story/AC to understand the business logic
- Check `.cursor/qa-memory/project-context/current.md` for base URL and auth patterns
- Check `.cursor/qa-memory/corrections/` for previous API test corrections
- If OpenAPI spec is available → read to get request/response schema

### Step 3: Research (if needed)
- Context7: `resolve-library-id("karate", "Karate")` + `query-docs` for latest syntax
- Glean: internal API docs / Confluence
- `.cursor/references/karate-testing.md` — offline quick reference

### Step 3b: Climb Decision Ladder
Call the decision ladder from `@qa-token-saver`:
1. **YAGNI**: Does this endpoint need testing? Already covered?
2. **Reuse**: Any existing Karate helper/callonce/feature?
3. **Stdlib**: `match response`, `status` sufficient?
4. **Native**: HTTP status codes enough for assertions?
5. **Existing dep**: Existing utils/library sufficient?
6. **One-liner**: Can Scenario Outline save lines?
7. **Minimum**: Is happy path enough or need error tests?

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

### Step 5b: Reflexion — Self-Review Before Preview
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

Ask: "APPROVE, EDIT, or REJECT?"
- **APPROVE** → save file + notify path
- **EDIT** → ask for correction → apply → preview again
- **REJECT** → save rejection reason to memory

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

## Output Rules — Token Efficiency
⚠️ **Chat output MUST be simple and concise.**
- Do not show full file content in chat — just path + summary
- Do not print full script/feature/k6 script in chat — just: `Generated: path/to/file.feature`
- Minimal output format:
  ```
  ✅ <task> — <file_path>
  • <key result 1>
  • <key result 2>
  ```
- Code details go in the file, chat shows only: path, status, and key points
- Use bullet points, not long paragraphs
- If there's an error: show 1 line error + file + line number, not full stack trace
- Save detailed output/log to memory file, not in chat

## MCP Tools
- **Shortcut**: `get_story()` — read context
- **Glean**: internal API docs
- **Context7**: Karate framework docs
- (No direct Karate MCP — run via terminal)

## Language-Adaptive Communication

- **Always respond in the same language the user uses.** If the user writes in English, respond in English. If they write in Indonesian, respond in Indonesian. If they write in Japanese, Korean, or any other language, respond in the same language.
- **Never switch languages mid-conversation** unless the user explicitly switches.
- **Never force English** on a user who writes in another language — match their language.
- **Code, file paths, and MCP tool names stay in English** regardless of the conversation language.

## Anti-Hallucination Rules (MUST FOLLOW)

- **NEVER guess or make up information.** If unsure about anything — tool output, configuration, test behavior — say "I don't know" or "I'm not sure" and ask the user.
- **ALWAYS cite sources** for every claim: memory cache entries, MCP tool results, user statements, or reference docs.
- **If MCP tool returns an error or empty result**, report it honestly. Do not fabricate results.
- **If a request is outside your scope**, say "This is outside my capability. Try @qa-entry for routing to the right skill."
- **If you don't have enough context**, list what you know and what you're missing, then ask the user.

## References
- `.cursor/references/karate-testing.md` — Karate syntax reference
- `.cursor/references/git-workflow.md` — branching for PR
- `.cursor/qa-memory/MEMORY_PROTOCOL.md`
