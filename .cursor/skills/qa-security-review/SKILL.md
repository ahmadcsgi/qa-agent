---
name: qa-security-review
description: Security review for test code and QA coverage. Secrets, XSS/injection gaps, authz, CVE/deps hygiene. Use for security review, XSS, CVE, OWASP, before push, or harden tests.
---

# QA Security Review

Defensive security review for **QA / test automation** (Cypress, Karate, k6) and for **security test coverage** of the product under test. Inspired by OWASP-style checklists. Scoped to find and prevent issues. **Never** write exploits, exploit PoCs, or attack payloads.

## Boot

1. `proj ensure` then `boot --project auto`
2. Load `.cursor/rules/coding-principles.mdc` (needed now? > simpler? > seen 3x?)
3. Read `project-context/current.md` if present
4. Prefer this reference: `.cursor/references/qa-security-review.md` (or `~/.cursor/references/`)

## When to run

| Trigger | Action |
|---------|--------|
| "security review" / XSS / CVE / OWASP / harden | Full skill |
| Before push (`git.review_before_push`) | Run with `@qa-pr-review` (security angle) |
| New UI/API automation that touches auth, HTML, uploads, query params | Lite pass on generated code |
| User pastes PR / diff / paths | Review that scope only |

## Inputs

PR URL, `git diff`, file paths, or "scan this feature / story". Ask once if scope unclear: **test code** vs **product coverage** vs **both**.

## Review angles

### 1. Secrets and data (P0 if live)

- Hardcoded passwords, tokens, API keys, client secrets in specs/fixtures
- Vault / EncryptSecret / env patterns ignored
- PCI/PHI or real PII in fixtures or logs
- `.env`, credentials, private keys in the diff

### 2. Injection / XSS / unsafe trust (test code + coverage)

- Test helpers that build HTML/URL/SQL from unsanitized input
- `cy.exec` / shell / `eval` / dynamic `Function` in tests
- Missing negative cases for reflected/stored XSS where UI renders user input
- Missing API cases for injection-prone fields (search, filter, free text) when AC implies risk
- Open redirect / unsafe `target` / javascript: URL if product exposes them and AC requires

### 3. Authn / authz

- Tests that skip auth incorrectly or share admin session across roles
- Missing IDOR / direct-object checks when AC mentions access control
- Tokens in localStorage assertions without cleanup
- Privilege escalation paths not covered when story is authz-related

### 4. Dependencies / CVE hygiene (advise, do not invent)

- Flag outdated or deprecated packages **only** from lockfile / `npm audit` / `osv` / user report
- If no scan output: say so. Suggest `npm audit` / OSV. **Never invent CVE IDs**
- Prefer upgrading or removing unused deps (YAGNI) over new security frameworks

### 5. Transport and config

- `http://` where product requires HTTPS in non-mock envs
- TLS verify disabled without documented reason
- CORS / CSP regressions only if tests assert them and AC requires

## Decision flow (before adding security tests)

```
Apakah celah/risk ini relevan sekarang (AC / surface exposed)?
    |
    No  -> YAGNI (jangan tambah suite spekulatif)
    |
    Yes
    |
Ada cara assert lebih sederhana (status, header, DOM text)?
    |
    Yes -> KISS
    |
    No / pola sudah 3x -> shared helper (Rule of Three / DRY)
```

## Output format

```markdown
## Security Review: <scope>

**Scope:** test code | product coverage | both
**Verdict:** Pass | Request changes | Block (P0)

### P0: Must fix
- `path:line` - issue - suggested fix (defensive)

### P1: Should fix
...

### P2: Coverage gap
- missing case - why - minimal test idea

### Checks run
- Secrets | Injection/XSS | Authz | Deps | Config

### Not checked / unknown
- bullet (honest gaps)
```

Cite **file:line**. Separate FACTS vs suggestions. Punctuation: `output-punctuation.mdc`.

## Hard rules

- No exploit code, payloads for attacking systems, or step-by-step attack guides
- No approving P0 secrets
- No invented CVE numbers
- Match user language. Paths stay English
- Pair with `@qa-pr-review` for full PR (flake, architecture, design principles)

## Related

- `@qa-pr-review` - full automation PR review
- `@qa-token-saver` / `coding-principles.mdc` - YAGNI / KISS / Rule of Three
- `@qa-ui-automation` / `@qa-api-test` - generation skills
- `.cursor/references/qa-security-review.md`
