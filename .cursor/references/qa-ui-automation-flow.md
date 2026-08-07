# QA UI automation — detailed flow

Loaded by `@qa-ui-automation` when generating or healing. Keep `SKILL.md` short.

## POM builder (Playwright)

1. `browser_navigate` > login > `browser_snapshot`
2. Prefer `data-testid` > `data-namespace`/`data-id` > `#id` > CSS
3. Optional screenshot. Log: `exploration-logs/{feature}-{date}.md`
4. Pattern: explore once > alias file > reuse (page-agent style)

## Decision ladder

`coding-principles` flow then `@qa-token-saver`: YAGNI > Reuse > Stdlib > Native > Existing dep > One-liner > Minimum.

## Generate

Aliases `.js` > step defs `.js` > `.feature` with `@test_id=C{id}` (camelCase file, Sentence case scenario).

## Security lite

Auth / HTML / upload / free-text > `@qa-security-review` lite (no secrets, no `cy.exec`/eval).

## Reflexion then preview

Correctness, minimality, reuse, conventions > then APPROVE/EDIT/REJECT.

## Auto-run / heal

Cypress MCP run. On fail: failure context > Playwright snapshot > update alias > re-run. Max 2 heals.

## Conventions (defaults)

Framework Cypress+Cucumber when present. Auth via env/vault. Never hardcode secrets.

## MCP

TestRail `getCase(s)` · Shortcut `stories-get-by-id` · Playwright browser_* · Cypress run/heal · Context7 · Glean

Offline: `cypress-testing.md`, `playwright-browser.md` (workspace or `~/.cursor/references/`).
