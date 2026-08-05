---
name: qa-pr-review
description: Focused PR review for test automation repos (UI/API/perf). Security, performance, tests, architecture angles with severity ranking and file citations. Use for review my PR, check test changes, or before merge.
---

# QA PR Review

Review pull requests for **test automation** repos (Cypress, Karate, k6). Inspired by [awesome-cursorrules PR Review](https://github.com/PatrickJS/awesome-cursorrules) patterns, scoped to QA Agent conventions.

## Boot

1. `proj ensure` then `boot testcases --project auto` (or matching domain)
2. Read `project-context/current.md` if present
3. `@qa-token-saver` lite: flag over-engineered tests

## Inputs

| Source | How |
|--------|-----|
| PR URL | `gh pr view` / `gh pr diff` |
| Branch diff | `git diff main...HEAD` or user-provided range |
| Files | User pastes paths or attaches diff |

Ask once if repo type unclear: UI / API / perf.

## Review angles (run all, report separately)

### 1. Security

- Hardcoded passwords, API keys, client secrets in tests or fixtures
- Vault/EncryptSecret patterns ignored (perf repos)
- PCI/PHI in test data or logs
- `.env` or credentials committed

Severity: **P0** if live secret in diff. **P1** if test creds without vault pattern.

### 2. Performance / flake

- Fixed `cy.wait(ms)` without network alias
- Missing intercept/waitFor patterns (Cypress)
- k6 thresholds missing or unrealistic
- Shared state between tests (order dependency)
- Unbounded loops or huge datasets in CI

### 3. Tests

- Assertions meaningful (not `expect(true)`)
- Negative / edge cases where AC requires
- Reuse: existing steps, POM, fixtures (decision ladder)
- TestRail ref or `@test_id` traceability when repo uses it
- No duplicate coverage of same AC

### 4. Architecture

- Matches repo conventions (POM, step defs, feature layout)
- PR title `[Squad][TaskId] …` when `squad.name` pref set
- Commit prefix: `test:` · `fix:` · `chore:` per CONTRIBUTING
- Signed commits expected for product test repos (soft check)

## Output format

```markdown
## PR Review — <title>

**Repo type:** UI | API | perf
**Verdict:** Approve | Request changes | Block (P0)

### P0 — Must fix
- `path:line` — issue — suggested fix

### P1 — Should fix
...

### P2 — Nice to have
...

### P3 — Nit
...

### What looks good
- bullet
```

Cite **file:line** from diff. Separate FACTS vs suggestions.

## Rules

- Do **not** approve P0 security issues
- Do **not** rewrite the PR unless user asks
- Match user language. Code paths English
- Punctuation: `output-punctuation.mdc`

## MCP / CLI

- `gh pr view`, `gh pr diff`, `gh pr checks`
- Grep/glob in repo for patterns
- No Shortcut/TestRail writes

## Related

- `@qa-token-saver` — minimal test justification
- `@qa-ui-automation` / `@qa-api-test` / `@qa-perf-test` — repo patterns
- [OPTIONAL_INTEGRATIONS.md](../../../docs/OPTIONAL_INTEGRATIONS.md)
