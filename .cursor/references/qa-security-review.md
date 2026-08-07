# QA Security Review (offline reference)

Used by `@qa-security-review`. Defensive checklist only. No exploit recipes.

## OWASP-oriented QA map (lite)

| Risk | What to look for in tests / coverage |
|------|--------------------------------------|
| A01 Broken access control | Role matrix, IDOR, direct URL to others' resources |
| A02 Cryptographic failures | Secrets in repo, weak transport in non-mock env |
| A03 Injection | Free-text API/UI fields, query/filter params, HTML render |
| A04 Insecure design | Speculative "security suite" without AC (YAGNI) |
| A05 Security misconfiguration | TLS verify off, debug flags, default creds in fixtures |
| A07 Auth failures | Session reuse across roles, missing logout cleanup |
| A08 Data integrity | Unsigned fixtures treated as trusted config |
| A09 Logging failures | Secrets printed in Cypress/Karate/k6 logs |
| A10 SSRF | Tests that hit arbitrary URLs from user-controlled config |

## XSS (coverage ideas, not payloads)

- Input that is later rendered as HTML/text in UI
- Assert escaped text / safe DOM, not that a script runs
- Prefer visible text / attribute checks over executing attacker strings

## Injection (API)

- Unexpected characters in search/filter bodies when AC implies validation
- Assert 4xx / validation message, not DB errors leaking

## Secrets patterns (fail closed)

- `password`, `apiKey`, `client_secret`, `Bearer `, private key PEM blocks in diff
- Prefer env / vault / EncryptSecret per repo convention

## CVE / deps

1. Run or ask for `npm audit` / OSV / CI security job output
2. Cite only IDs present in that output
3. If none: "No audit output available. Run npm audit."

## Pairing

- Design: `coding-principles.mdc` decision flow
- PR shell: `@qa-pr-review`
- Generation: climb `@qa-token-saver` before adding security cases
