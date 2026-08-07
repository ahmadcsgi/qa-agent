---
name: qa-pr-review
description: Review automation PRs (Cypress/Karate/k6). Design, flake, architecture. Pairs with @qa-security-review. Use for review PR or before push.
---

# QA PR Review

Pre-push when `git.review_before_push=true`. Always pair `@qa-security-review`. Fix P0/P1 before offering push. No unasked push.

## Boot

`proj ensure` > `boot` > `project-context` > design flow > private onboard Part A9 **only if needed** (else CONTRIBUTING/PR template) > token-saver lite.

## Angles

1. **Security** > delegate `@qa-security-review` (secrets P0)
2. **Flake / perf** > fixed waits, missing intercepts, bad thresholds, shared state
3. **Tests** > meaningful asserts, reuse, no duplicate AC coverage
4. **Design** > YAGNI > KISS > Rule of Three / DRY > SOLID
5. **Architecture** > repo conventions, PR title/commit from prefs/onboard

## Output

Verdict Approve | Request changes | Block. Sections P0–P3 + what looks good. Cite `path:line`.

Hard rules: never approve P0 secrets. Punctuation core. Related: `coding-principles.mdc`, `@qa-security-review`.
