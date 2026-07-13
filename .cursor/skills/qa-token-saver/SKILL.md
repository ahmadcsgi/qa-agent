---
name: qa-token-saver
description: Decision ladder for saving tokens — Ponytail adaptation (DietrichGebert/ponytail) for QA context. Before generating any test, climb the ladder. Prevents over-engineering test scenarios, reuses existing patterns. Always-on for all automation skills.
---

# QA Token Saver

## Philosophy
Inspired by [Ponytail](https://github.com/DietrichGebert/ponytail) (81K★) — "The best code is the code you never wrote."
For QA: **The best test is the test you never had to write.**

This doesn't mean we are lazy about writing tests. Every test must be justified:
- Does this test provide value?
- Is the risk already covered?
- Is there a simpler way?

## Decision Ladder (Ponytail for QA)
BEFORE generating any test, climb this ladder from top to bottom:

### Rung 1: YAGNI (You Ain't Gonna Need It)
Ask: **"Is this test case truly necessary?"**
- Is this test already covered by an existing test?
- Is this a low-risk feature? (internal tool, minor UI, rarely used)
- Is the acceptance criteria sufficiently covered by 1 test?
- If the answer is "not needed" → SKIP this test

> Example: "Back to Home" button on an error page — 1 test is enough, no need for 3.

### Rung 2: Reuse Existing
Ask: **"Does the project already have this?"**
- Is there a step definition that can be reused?
- Is there an alias/POM/page object for this element?
- Is there a helper function (login, selectQuote, etc.)?
- Is there a test data fixture that can be used?
- DO NOT duplicate — use what already exists

### Rung 3: Stdlib / Framework Covers It
Ask: **"Are the framework built-in commands sufficient?"**
- Cypress: `cy.click()`, `cy.type()`, `cy.select()`, `cy.get()` enough?
- Karate: `match response`, `status 200`, `def var` enough?
- k6: `check()`, `sleep()`, built-in metrics enough?
- Don't create custom commands if built-in already works

### Rung 4: Native Platform Feature
Ask: **"Can the browser/platform native handle this?"**
- Browser native validation (required, minlength, pattern) verifiable without JS?
- HTML constraint validation covers the use case?
- CSS pseudo-classes (:valid, :invalid) usable as assertions?
- API status code directly from response, without parsing body?

### Rung 5: Existing Dependency
Ask: **"Can existing installed dependencies handle this?"**
- Lodash, moment, faker, chance.js — already available?
- Cypress plugins (cypress-map, cypress-real-events)?
- Karate shared utils?
- DO NOT install new dependencies if existing ones are sufficient

### Rung 6: One-Liner
Ask: **"Can this be done in one line?"**
- Can the test case be just 1 step? (instead of 5)
- Can the assertion be 1 line instead of 10?
- Can scenarios be combined into parameterized?
- Example:
  ```gherkin
  # Instead of 3 scenarios:
  Scenario Outline: Create user <role>
    Given user with role '<role>'
    When create user
    Then status 201
    Examples:
      | role |
      | admin |
      | viewer |
  ```

### Rung 7: Minimum Viable Test
Ask: **"What is the minimum test that gives confidence?"**
- Happy path only → POSITIVE is enough
- Error handling critical → add NEGATIVE
- High risk → then add EDGE + BOUNDARY
- Don't add tests because "it might be useful later" — add only if justified now

### Rung 8: Reflexion — Self-Review (Post-Generation)
AFTER generating, BEFORE previewing to the user:
1. Review your own output: "Is this correct, minimal, and necessary?"
2. If something can be improved → refine automatically
3. Then show to the user

> This is what makes "think once, do correctly" — we refine ourselves first, not the user finding errors and asking for repeats.

## Intensity Modes
Like Ponytail, we have modes:

| Mode | Meaning | When |
|------|---------|------|
| **Lite** | Ladder as guidance, can override | Default — safe |
| **Full** | Ladder MUST be followed, deviations require justification | When token saving is critical |
| **Ultra** | Extreme YAGNI — don't create what wasn't asked for. "As long as it works" | When budget is extremely tight |

Default: **Lite**

## How to Use
- This skill is automatically called via `@qa` entry before other automation skills
- Can be called manually: `@qa token lite|full|ultra`
- Every automation skill has a "Climb Decision Ladder" step before generating

## References
- Ponytail original: https://github.com/DietrichGebert/ponytail
- Global memory: `~/.qa-agent/`
