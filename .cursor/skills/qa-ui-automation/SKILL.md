---
name: qa-ui-automation
description: Generate Cypress Cucumber UI automation from TestRail or Shortcut. POM, auto-run, auto-heal. Use for Cypress, UI automation, E2E, or C12345.
---

# QA UI Automation

## Flow (short)

1. Ask source (TestRail / Shortcut), env, test user
2. **Memory gate:** `automation-memory-gate.mdc` + `paths.ui_tests`
3. Check existing steps/aliases. Read case/story via MCP
4. Research if needed: `cypress-testing.md` / `playwright-browser.md`
5. Plan > decision ladder (`@qa-token-saver` + coding flow) > generate alias/steps/feature
6. Security lite if auth/HTML/upload/free-text (`@qa-security-review`)
7. Reflexion > preview ACC > Cypress run > heal max 2x > memory/`cor`

Detail (POM selectors, heal, conventions, MCP list): `.cursor/references/qa-ui-automation-flow.md` (or `~/.cursor/references/`).
