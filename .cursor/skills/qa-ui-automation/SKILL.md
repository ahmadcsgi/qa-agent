---
name: qa-ui-automation
description: Generate Cypress Cucumber UI automation from TestRail cases or Shortcut stories. Handles interactive flow: asks for env, user, does POM building via Playwright, auto-run, auto-heal. Use when user asks for UI automation or mentions TestRail/Shortcut story for testing.
---

# QA UI Automation

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Source**: "Do you have a Shortcut story ID or TestRail link?"
2. **Environment**: "Which environment? (e.g. 26.2, 25.4, 26.1, or production)"
3. **User**: "Use default user `telflow_pa` or custom?"
   - If custom → "Please provide username and password"

### Step 2: Learn Project
Read `.cursor/qa-memory/project-context/current.md`.
If empty → explore project → save to memory.

### Step 3: Check Existing
- Read `.cursor/testrail-coverage.json` to check existing automation
- Grep `STEP_REGISTRY.md` + features/aliases/steps to check reuse potential

### Step 4: Understand Context
Read TestRail via MCP (`getCases`) or Shortcut story.
Understand: feature, workflow, acceptance criteria.

### Step 5: Research
If unclear → Context7 or `.cursor/references/` for framework documentation.
Glean for product documentation/Confluence.

### Step 6: POM Builder — Playwright Exploration
Use Playwright MCP for page exploration:
1. `browser_navigate(url)` — open the page in the requested environment
2. Log in with the provided user credentials
3. `browser_get_accessibility_tree()` — get accessibility structure
4. Identify elements: form inputs, buttons, dropdowns, tables
5. Collect element details:
   - `data-testid` (priority 1)
   - `data-namespace` / `data-id` (priority 2)
   - `#id` (priority 3)
   - CSS selectors (last resort)
6. Save exploration log to `exploration-logs/{featureName}-{YYYY-MM-DD}.md`

**Alibaba Page-Agent pattern**: https://github.com/alibaba/page-agent
The idea: collect elements from the page → generate Page Object Model → reuse element aliases in tests.
Use the same pattern: explore once → save element mapping → generate alias file.

### Step 7: Plan
Write an implementation plan:
- Alias files to create/modify
- Step definitions to add
- .feature file structure

### Step 7b: Climb Decision Ladder
Call the decision ladder from `@qa-token-saver`:
1. **YAGNI**: Is this test necessary? Already covered?
2. **Reuse**: Any existing alias/step def to reuse?
3. **Stdlib**: Cypress built-in commands sufficient?
4. **Native**: Browser validation works?
5. **Existing dep**: Existing plugin/library sufficient?
6. **One-liner**: Can it be 1-3 lines parameterized?
7. **Minimum**: Is this the minimum viable test?
→ Record decision: "YAGNI skip" / "Reuse existing" / "Generate minimal"

### Step 8: Generate
1. **Aliases** (`.js`) — element selectors from POM builder results
2. **Step definitions** (`.js`) — action steps
3. **.feature file** — with `@test_id=C{number}` tag
   - camelCase for feature file names
   - Sentence case for scenario names

### Step 9b: Reflexion — Self-Review Before Preview
BEFORE showing to the user, review the generated output:
1. **Correctness**: Does the test match AC/requirements? Are selectors correct?
2. **Minimality**: Is every step necessary? Can they be combined?
3. **Reuse**: Any missed step def / alias?
4. **Consistency**: Does the format match project conventions? (camelCase feature, @test_id tag?)
5. **If there is an issue → refine automatically** — no need to ask for permission first
6. **Then show** to the user for APPROVE/EDIT/REJECT

> Principle: "Think once, do correctly." Instead of the user seeing it, correcting it, us fixing it, the user correcting again — it's better to refine ourselves first before preview.

### Step 10: Auto-Run
Run the test via Cypress MCP:
```bash
npm run test:{suite} -- -e TAGS="@test_id=C{id}"
```

### Step 11: Auto-Healing
If the test FAILED:
1. Read the error message — identify which selector failed
2. Playwright MCP: re-explore the page → find alternative selectors
3. Update alias with new selector
4. Re-run test
5. Max 2 healing iterations
6. If still failing → show error to user + ask for guidance

### Step 12: User Loop
- **APPROVE** → Save to memory, update testrail-coverage.json
- **EDIT** → Apply correction → simpan ke decision memory: `node ~/.qa-agent/lib/store.js cor add "ui-automation" "<context>" "<issue>" "<correction>" "<lesson>" "good|bad"`
- **REJECT** → Save rejection reason to memory

### Step 13: Save to Memory
- Update `.cursor/qa-memory/generated-tests/cypress/` with new test reference
- Update `project-context/current.md` if there's new info
- Update `testrail-coverage.json` if section is complete

## Project Conventions
- Framework: Cypress 13 + Cucumber/Gherkin
- Format: `.feature` files (not `.cy.js`)
- Selector priority: alias → `data-testid` → `data-namespace` → `#id` → CSS
- Auth: Vault-based, never hardcode
- TestRail tag: `@test_id=C{number}`
- Feature tag: `@docflow-list-template`
- Suite tag: `@flex_quote`, `@daily_run`

## MCP Tools
- **TestRail**: `get_cases()`, `get_case()` — get context
- **Playwright**: `browser_navigate()`, `browser_click()`, `browser_type()`, `browser_get_accessibility_tree()`, `browser_screenshot()` — POM builder
- **Cypress**: `run_spec()` — auto-run + auto-heal
- **Context7**: framework docs
- **Glean**: product docs

## References
- Step registry: `cypress/support/step_definitions/STEP_REGISTRY.md`
- Offline docs: `.cursor/references/playwright-browser.md`
- Page-agent pattern: https://github.com/alibaba/page-agent
- Global memory: `~/.qa-agent/`
