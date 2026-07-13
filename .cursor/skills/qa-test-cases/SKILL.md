---
name: qa-test-cases
description: Generate TestRail test cases from Shortcut stories. Interactive flow: ask for test type coverage (positive/negative/edge/boundary), generates structured cases, saves to TestRail via MCP. Use when asked to create test cases, generate test plan, or write test scenarios.
---

# QA Test Cases

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Source**: "Do you have a Shortcut story ID or link?"
   - If yes → read the story via Shortcut MCP (`get_story`)
   - If not → ask for a brief feature description
2. **Coverage**: "What test cases are needed?"
   - **Positive only** — just the happy path
   - **Positive + Negative** — functional + error handling
   - **All** — positive + negative + edge cases + boundary
3. **Priority**: "Happy path only or full coverage?"
4. **Section**: "Save to a specific TestRail section, or let me decide?"

### Step 2: Understand Context
- Read Shortcut story → understand acceptance criteria + description
- Check `.cursor/qa-memory/project-context/current.md` for domain knowledge
- Check decision memory: `node ~/.qa-agent/lib/store.js cor list "test-cases" "good"` — apply proven patterns
- Check TestRail existing cases in related section (via `get_cases`) — avoid duplicates

### Step 3: Research (if needed)
- Context7 for domain-specific testing patterns
- Glean for internal product docs / Confluence
- `.cursor/references/testrail-api.md` for TestRail format

### Step 3b: Climb Decision Ladder
Call the decision ladder from `@qa-token-saver` before generating:
1. **YAGNI**: Is all coverage really needed? Is positive+negative enough?
2. **Reuse**: Any similar test case in TestRail? Can duplicate + edit?
3. **Stdlib**: Standard TestRail template sufficient?
4. **Native**: Is the story's acceptance criteria enough as test cases?
5. **Existing dep**: Can existing test case patterns be reused?
6. **One-liner**: Can test cases be parameterized?
7. **Minimum**: How many test cases are really needed? Don't create 20 if 5 is enough.

### Step 4b: Reflexion — Self-Review Before Preview
BEFORE showing to the user, review the generated output:
1. **Correctness**: Do test cases match the story's AC?
2. **Minimality**: Is the number of test cases matching requested coverage? Or too many?
3. **Reuse**: Any similar test case in TestRail that could be used as reference?
4. **Clarity**: Are steps clear and reproducible?
5. **If there is an issue → refine automatically** (reduce if too many, add if too few)
6. **Then show** to the user for APPROVE/EDIT/REJECT

### Step 5: Generate Test Cases
Create structured test cases based on requested coverage:

**Format per test case:**
```
Title: [action] should [expected result]
Section: [functional area]
Type: Positive | Negative | Edge | Boundary
Steps:
  1. [step]
  2. [step]
Expected: [expected result]
```

**Rules:**
- **Positive**: valid flow, happy path, every AC covered
- **Negative**: invalid input, error states, unauthorized access, null/empty values
- **Edge**: empty list, single item, max items, concurrent access
- **Boundary**: min/max values, just below/above threshold, 0, negative numbers

**Estimated counts:**
- Positive only: 3-5 cases
- Positive + Negative: 6-10 cases
- All: 10-20 cases

### Step 6: Preview & User Loop
Show to the user in a clean format:
```markdown
## Test Cases Preview
| # | Title | Type | Section |
|---|-------|------|---------|
| 1 | ... | Positive | ... |

Details:
### TC1: ...
**Steps:** ...
**Expected:** ...
```

Ask: "APPROVE, EDIT, or REJECT?"
- **APPROVE** → Save to TestRail via `add_case()` one by one
- **EDIT** → Ask for correction → apply → preview again → loop
- **REJECT** → Save rejection reason to memory

### Step 7: Save to TestRail
Use TestRail MCP:
```
add_case(section_id: ..., title: "...", type_id: ..., priority_id: ..., estimate: ..., steps: "...", expected: "...")
```

- type_id: 1=Positive, 2=Negative, 3=Edge, 4=Boundary (per TestRail config)
- priority_id: based on story priority

### Step 8: Save to Memory
- Update `.cursor/qa-memory/generated-tests/` with references
- Simpan ke decision memory: `node ~/.qa-agent/lib/store.js cor add "test-cases" "<context>" "<issue>" "<correction>" "<lesson>" "good|bad"`

## MCP Tools
- **Shortcut**: `get_story()` — read story + AC
- **TestRail**: `get_cases()`, `add_case()`, `get_sections()`, `get_section()` — manage test cases
- **Context7**: domain testing patterns
- **Glean**: internal docs

## References
- `.cursor/references/testrail-api.md` — TestRail format
- `~/.qa-agent/` — global memory store
