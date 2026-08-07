# Cypress Testing Quick Reference

Offline patterns for `@qa-ui-automation`. Prefer project conventions from `project-context/current.md` (Cucumber/aliases) over inventing a new layout.

Cherry-picked from [cypress-agent-skill](https://github.com/KahlilR23/cypress-agent-skill) (MIT). Not a second skill. Do not clone that repo into `.cursor/skills/`.

## Core rules

- Never `cy.wait(3000)`. Use `cy.wait('@alias')` or assertion retries.
- Assert outcomes users see, not implementation details.
- Prefer stable selectors. Reuse existing aliases/step defs when present.

## Selector priority (QA Agent)

Align with skill defaults and team aliases:

1. Project alias / POM helper
2. `data-testid` / `data-cy` / `data-test`
3. `data-namespace` / `data-id`
4. ARIA (`role`, `aria-label`) / `cy.contains('button', '…')`
5. `#id`
6. CSS class / deep CSS (last resort)

```js
cy.get('[data-testid="submit-button"]')
cy.get('[data-testid="user-card"]').within(() => {
  cy.get('[data-testid="user-name"]').should('contain', 'Alice')
})
// Avoid: .btn-primary, .MuiButton-root, nth-child XPath
```

## Assertions (essentials)

```js
cy.get('[data-testid="title"]')
  .should('be.visible')
  .and('have.text', 'Dashboard')

cy.get('[data-testid="btn"]')
  .should('be.visible')
  .and('not.be.disabled')

cy.url().should('include', '/dashboard')
cy.get('[data-testid="spinner"]').should('not.exist')
```

## Network: `cy.intercept`

```js
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers')
cy.visit('/users')
cy.wait('@getUsers')
cy.get('[data-testid="user-row"]').should('have.length', 2)

cy.intercept('POST', '/api/orders', (req) => {
  req.reply({ statusCode: 201, body: { id: 999, ...req.body } })
}).as('createOrder')

cy.intercept('GET', '/api/data', { statusCode: 500, body: { error: 'Server Error' } }).as('serverError')

cy.wait('@createOrder').then((interception) => {
  expect(interception.response.statusCode).to.equal(201)
})
```

## Auth: `cy.session` (preferred)

Cache login across tests. Secrets from env / project vault. Never hardcode passwords in committed specs.

```js
Cypress.Commands.add('loginByUI', (email, password) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login')
      cy.get('[data-testid="email"]').type(email)
      cy.get('[data-testid="password"]').type(password)
      cy.get('[data-testid="submit"]').click()
      cy.url().should('include', '/dashboard')
    },
    {
      validate() {
        cy.getCookie('session_token').should('exist')
      },
      cacheAcrossSpecs: true,
    }
  )
})
```

API login is faster when the app allows it (`cy.request` + token/cookie inside `cy.session`). Prefer existing project `login` commands from memory/map.

## Flake prevention

| Do | Avoid |
|----|--------|
| `cy.wait('@getResults')` | `cy.wait(2000)` |
| Assert visibility / URL / network | Fixed sleeps after click |
| `retries: { runMode: 2, openMode: 0 }` in config when team allows | Blind retry without fixing root cause |
| Scope with `.within()` | Brittle absolute CSS |

## Cucumber / TestRail (this agent)

When the UI repo uses Cucumber:

- Generate/reuse `.feature` + step defs + aliases (skill flow)
- Tag: `@test_id=C{number}` when from TestRail
- Memory gate first if `paths.ui_tests` set (see `automation-memory-gate.mdc`)

## Config snippets (only if project missing them)

```js
retries: { runMode: 2, openMode: 0 },
defaultCommandTimeout: 8000,
screenshotOnRunFailure: true,
video: false,
```

Do not overwrite team `cypress.config` without ACC.

## Related

- `.cursor/references/playwright-browser.md` (POM explore)
- `@qa-ui-automation` skill flow
- Context7 for latest Cypress API details
