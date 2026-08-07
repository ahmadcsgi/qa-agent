---
name: qa-pr-review
description: Review PRs in test automation repos (Cypress, Karate, k6). Design principles, flake, architecture. Pairs with @qa-security-review. Use for review PR, before push, check test changes, or before merge.
---

# QA PR Review

Review pull requests for **test automation** repos (Cypress, Karate, k6). Inspired by [awesome-cursorrules PR Review](https://github.com/PatrickJS/awesome-cursorrules) patterns, scoped to QA Agent conventions.

Also run on **local branch/diff before push** when pref `git.review_before_push=true`. Always pair with `@qa-security-review` (secrets, XSS/injection coverage, authz, deps). Do not push unasked. Fix P0/P1 first, then offer push commands.

Walk `coding-principles.mdc` decision flow on the diff: needed now? > simpler? > seen 3x?

## Boot

1. `proj ensure` then `boot testcases --project auto` (or matching domain)
2. Read `project-context/current.md` if present
3. Load `.cursor/rules/coding-principles.mdc` (decision flow: needed now? > simpler? > seen 3x?)
4. **Private `onboard.md` Part A9** (if user attached or file exists in workspace): PR title, commit prefixes, squad list from prefs/`squad.name`, signing, amend rules. **Do not** hardcode machine paths or org squad names in this skill.
5. Else read target repo `CONTRIBUTING.md` + `PULL_REQUEST_TEMPLATE.md` from cwd
6. `@qa-token-saver` lite: flag over-engineered tests

## Inputs

| Source | How |
|--------|-----|
| PR URL | `gh pr view` / `gh pr diff` |
| Branch / pre-push | `git diff main...HEAD` or `git diff` / staged |
| Files | User pastes paths or attaches diff |

Ask once if repo type unclear: UI / API / perf.

## Review angles (run all, report separately)

### 1. Security (delegate depth to `@qa-security-review`)

Run `@qa-security-review` on the same diff. At minimum flag:

- Hardcoded passwords, API keys, client secrets in tests or fixtures
- Vault/EncryptSecret patterns ignored (perf repos)
- PCI/PHI in test data or logs
- `.env` or credentials committed
- Obvious XSS/injection coverage gaps when AC implies risk

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

### 4. Design principles (KISS / YAGNI / Rule of Three / DRY / SOLID)

Conflict order: **KISS > YAGNI > Rule of Three > DRY > SOLID**.

- **KISS**: unnecessary complexity, deep nesting, clever one-liners that hurt readability
- **YAGNI**: speculative helpers, unused options, cases beyond AC
- **Rule of Three**: shared util after one similar block (too early) or third identical copy left unshared
- **DRY**: same setup/assert copied in 3+ places without shared step/helper
- **SOLID**: god files, mixed unrelated concerns, hard-wired deps that block reuse

Severity: usually **P2**. Promote to **P1** if it causes flake, duplication of secrets handling, or blocks maintainability of the suite.

### 5. Architecture

- Matches repo conventions (POM, step defs, feature layout)
- PR title `[Squad][TaskId] Short title` (`squad.name` pref or onboard Part A9a)
- Commit prefix: `feat:` · `fix:` · `revert:` · `docs:` · `test:` · `chore:` · `refactor:` (onboard Part A9b)
- PR body follows repo `PULL_REQUEST_TEMPLATE.md`
- Signed commits expected for product test repos (soft check)
- No force-push unless user explicitly asks (CONTRIBUTING amend note)

## Output format

```markdown
## PR Review: <title>

**Repo type:** UI | API | perf
**Verdict:** Approve | Request changes | Block (P0)

### P0: Must fix
- `path:line` - issue - suggested fix

### P1: Should fix
...

### P2: Nice to have
...

### P3: Nit
...

### What looks good
- bullet
```

Cite **file:line** from diff. Separate FACTS vs suggestions.

## Rules

- Do **not** approve P0 security issues
- Do **not** rewrite the PR unless user asks
- Pre-push: if `git.review_before_push=true`, review local diff before offering `git push` / `gh pr create`
- Match user language. Code paths English
- Punctuation: `output-punctuation.mdc`

## MCP / CLI

- `gh pr view`, `gh pr diff`, `gh pr checks`
- Grep/glob in repo for patterns
- No Shortcut/TestRail writes

## Related

- `.cursor/rules/coding-principles.mdc` - decision flow + KISS / YAGNI / Rule of Three / DRY / SOLID
- `@qa-security-review` - secrets, XSS, authz, CVE hygiene
- `@qa-token-saver` - minimal test justification
- `@qa-ui-automation` / `@qa-api-test` / `@qa-perf-test` - repo patterns
- [OPTIONAL_INTEGRATIONS.md](../../../docs/OPTIONAL_INTEGRATIONS.md)
