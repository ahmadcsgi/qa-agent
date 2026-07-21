---
name: qa-entry
description: Entry point for QA tasks. Detect intent, ask if unclear, route to one skill. Use for @qa, vague asks, or pasted links/IDs.
---

# QA Entry Point

## Role
Receptionist: detect intent, clarify if needed, route to **one** skill. Stay short.

## Boot (first vague / multi-step turn)
1. `proj ensure` then `boot [domain] --project auto`
2. Apply prefs / `good` / `bad`. Do **not** dump boot JSON.
3. If `.cursor/qa-memory/project-context/current.md` missing or >7d → `@qa-project-mapping`
4. Before generating automation → climb `@qa-token-saver` ladder

## Intent → skill

| Pattern | Route |
|---------|-------|
| Shortcut URL / story id (no verb) | Ask: cases / **UI automation** / search? |
| TestRail URL / `C\d+` (no verb) | Ask: cases / **UI automation** / plan / mark result? |
| `automate` + `C\d+` / TestRail link | `@qa-ui-automation` (source = TestRail) |
| `automate` + Shortcut id / `sc-\d+` / story URL | `@qa-ui-automation` (source = Shortcut) |
| `automate` / Cypress (no id) | Ask: TestRail case id **or** Shortcut story id? Then `@qa-ui-automation` |
| `INC\d+` or incident link / "triage" / bug report | `@qa-defect-triage` |
| Stack trace / Exception / Error paste | `@qa-search-tickets` |
| Endpoint URL / "api" / karate | `@qa-api-test` |
| "test plan" / `plans/view` / "centang" / mark pass|fail | `@qa-test-execution` |
| "update case" / TC-ready / TC-on-progress | `@qa-test-cases` |
| "create test case" / story + cases | `@qa-test-cases` |
| "perf" / k6 / load | `@qa-perf-test` |
| "visual" / screenshot compare | `@qa-visual-test` |
| "scan project" / mapping | `@qa-project-mapping` |
| "onboard" / "run onboard" / "onboarding" / first-time setup | See **Onboard** below |
| Vague | Ask: automation / search / triage / cases / plan-or-results / onboard? |

### Smart id detect (`/qa automate …`)

| Token looks like | Treat as |
|------------------|----------|
| `C` + digits, or TestRail `cases/view` URL | TestRail case |
| `sc-` + digits, Shortcut story URL, or bare story digits user confirms | Shortcut story |
| Ambiguous | Ask once: TestRail or Shortcut? |

## Onboard

1. If user has **not** installed yet (no `~/.qa-agent/lib/store.js`): point to `docs/FIRST_RUN.md`. Do **not** pretend `/qa` works without install + Reload.
2. Run `node scripts/onboard-status.js` and show the Ready table (✓/✗ only).
3. Prefer private `onboard.md` if present. Else `onboard.example.md` + `docs/SETUP.md` + `docs/FIRST_RUN.md`.
4. Run `node scripts/check-version.js` (report only).
5. Drive missing setup steps (MCP, git, tooling, prefs, `mcp-mode full`). Never dump secrets or boot JSON.

## Source matrix (automation)

| Skill | Typical sources |
|-------|-----------------|
| `@qa-ui-automation` | TestRail case **or** Shortcut story |
| `@qa-api-test` | Shortcut / OpenAPI / endpoint URL |
| `@qa-perf-test` | Shortcut story / endpoint / flow |

If unclear: ask for Shortcut, TestRail, or incident ID. Mirror user language.

## Refs
`.cursor/references/README.md` · `.cursor/MCP_TOOLS.md` · `AGENTS.md` · `docs/README.md` · `docs/FIRST_RUN.md`
