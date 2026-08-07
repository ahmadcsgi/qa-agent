---
name: qa-security-review
description: Defensive security review for tests and coverage gaps. Secrets, XSS/injection, authz, CVE hygiene. Use for security review, XSS, CVE, OWASP, or before push.
---

# QA Security Review

Defensive only. **Never** write exploits or attack payloads. Never invent CVE IDs.

## When

Security review ask · before push with PR review · codegen touching auth/HTML/upload/query text.

## Angles

1. Secrets / PII in specs (P0 if live)
2. XSS/injection coverage gaps + unsafe test helpers (`eval`, `cy.exec`)
3. Authz / IDOR / session reuse
4. Deps: only from `npm audit`/OSV/CI output
5. Transport/config misconfig when AC requires

Decision flow: risk relevant now? (YAGNI) > simpler assert? (KISS) > seen 3x? > helper.

## Output

Verdict Pass | Request changes | Block. P0–P2 + coverage gaps + honest "not checked". Cite `path:line`.

Detail OWASP map: `.cursor/references/qa-security-review.md`. Pair `@qa-pr-review`.
