# Token saver — ladder detail

Loaded by `@qa-token-saver` when full rungs needed. Core already has short design flow.

## Before ladder

Needed now? No > YAGNI skip. Simpler? Yes > KISS. Seen 3x? No > do not abstract. Yes > shared helper.

## Rungs (top to bottom)

1. **YAGNI** - Is this test necessary? Already covered? Low risk?
2. **Reuse** - Existing step/alias/helper/fixture?
3. **Stdlib** - Cypress/Karate/k6 built-ins enough?
4. **Native** - Browser/HTML validation enough?
5. **Existing dep** - Already installed lib/plugin?
6. **One-liner** - Parameterize / Scenario Outline?
7. **Minimum** - Happy path only unless AC needs negative
8. **Reflexion** - Self-review before user preview

## Modes

| Mode | When |
|------|------|
| Lite | Default |
| Full | Deviations need justification |
| Ultra | Extreme YAGNI. Only what was asked |

Record decision before generate. Related: `coding-principles.mdc`.
