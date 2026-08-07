# QA Agent skills (`@qa-*`)

Lite index for Cursor discoverability. Behavior lives in each `SKILL.md`. Single agent: `@qa`.

| Skill | Purpose |
|-------|---------|
| `@qa-entry` | Route vague asks to one skill |
| `@qa-search-tickets` | Search Shortcut stories/bugs |
| `@qa-defect-triage` | Triage Helix/incidents > draft bug |
| `@qa-test-cases` | Generate TestRail cases (ACC gate) |
| `@qa-test-execution` | TestRail plans / mark pass-fail |
| `@qa-ui-automation` | Cypress Cucumber UI automation |
| `@qa-api-test` | Karate API tests |
| `@qa-perf-test` | k6 perf / load (host or WSL xk6) |
| `@qa-project-mapping` | Map repo > project-context |
| `@qa-visual-test` | Screenshot visual regression |
| `@qa-token-saver` | YAGNI decision ladder |
| `@qa-pr-review` | PR review for test automation repos |
| `@qa-security-review` | Security review (secrets, XSS, authz, CVE hygiene) |

Invoke via `@qa` or the skill name. Global copies: `~/.cursor/skills/`.
