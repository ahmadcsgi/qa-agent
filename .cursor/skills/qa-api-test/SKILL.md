---
name: qa-api-test
description: Generate Karate API tests from Shortcut, OpenAPI, or endpoint. Use for Karate, API test, or REST automation.
---

# QA API Test (Karate)

## Flow (short)

1. Ask source (story / OpenAPI / endpoint), coverage, method, env, auth
2. **Memory gate:** `automation-memory-gate.mdc` + `paths.api_tests` + `cor list api-test`
3. Research if needed: `karate-testing.md` / Context7 / Confluence (`confluence-search.md`)
4. Ladder + security lite (authz/free-text) > generate `.feature` > reflexion > preview ACC > optional run > memory
5. **Before commit:** `automation-bugbot-commit-gate.mdc`

Reuse callonce/helpers. Never hardcode secrets. Detail: `.cursor/references/karate-testing.md`.
