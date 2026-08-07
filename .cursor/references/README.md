# QA Agent - Offline Reference Docs

## Index

| File | Topic | Used by |
|------|-------|---------|
| `shortcut-api.md` | Shortcut MCP API - search, get, create, update, tasks, labels | `@qa-search-tickets`, `@qa-defect-triage`, `@qa-test-cases` |
| `testrail-api.md` | Cases, sections, plans, runs, results | `@qa-test-cases`, `@qa-test-execution`, `@qa-ui-automation` |
| `qa-testcase-methodology.md` | Analysis, dedup, risk, preview, Phase 7 plan/results, maintenance, label groom | `@qa-test-cases`, `@qa-test-execution` |
| `incident-email.md` | Incident email templates - duplicate, defect, user error, need help | `@qa-defect-triage` |
| `playwright-browser.md` | Playwright browser actions - navigate, click, type, POM builder | `@qa-ui-automation` |
| `cypress-testing.md` | Cypress selectors, intercept, cy.session, flake (cherry-pick) | `@qa-ui-automation` |
| `karate-testing.md` | Karate API testing - feature syntax, assertions, data-driven | `@qa-api-test` |
| `k6-testing.md` | k6 performance testing - script structure, scenarios, thresholds | `@qa-perf-test` |
| `git-workflow.md` | Git workflow - branch naming, commit conventions, PR | All automation skills |
| `qa-security-review.md` | Secrets, XSS/injection coverage, authz, CVE hygiene (defensive) | `@qa-security-review`, `@qa-pr-review` |
| `qa-ui-automation-flow.md` | POM, heal, conventions (detail) | `@qa-ui-automation` |
| `qa-perf-test-flow.md` | Runner matrix, vault, thresholds (detail) | `@qa-perf-test` |
| `qa-pr-review-flow.md` | PR review output template | `@qa-pr-review` |
| `qa-token-saver-ladder.md` | Full YAGNI ladder rungs | `@qa-token-saver` |

## Skills (discoverability)

All `@qa-*` skills live under `.cursor/skills/*/SKILL.md` (global: `~/.cursor/skills/`). Short index: `.cursor/skills/README.md`.

| Skill | One-line |
|-------|----------|
| `@qa-entry` | Route vague QA asks |
| `@qa-search-tickets` | Search Shortcut |
| `@qa-defect-triage` | Triage incidents / draft bugs |
| `@qa-test-cases` | TestRail case generate |
| `@qa-test-execution` | Plans / mark results |
| `@qa-ui-automation` | Cypress Cucumber |
| `@qa-api-test` | Karate API |
| `@qa-perf-test` | k6 / xk6 WSL |
| `@qa-project-mapping` | Repo map / memory gate |
| `@qa-visual-test` | Visual regression |
| `@qa-token-saver` | Decision ladder |
| `@qa-pr-review` | Automation PR review |
| `@qa-security-review` | Security / XSS / CVE hygiene |

## How to use
- Read a file directly: `.cursor/references/{topic}.md`
- Or ask in Cursor: "Look at the Karate reference" (agent opens it)
- Perf WSL custom k6: `.cursor/rules/wsl-xk6-install.mdc`
