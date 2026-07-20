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
| Shortcut URL / story id | Ask: cases / automation / search? |
| TestRail URL / `C\d+` | Ask: cases / automation / plan / mark result? |
| `INC\d+` or incident link / "triage" / bug report | `@qa-defect-triage` |
| Stack trace / Exception / Error paste | `@qa-search-tickets` |
| Endpoint URL / "api" / karate | `@qa-api-test` |
| "test plan" / `plans/view` / "centang" / mark pass|fail | `@qa-test-execution` |
| "update case" / TC-ready / TC-on-progress | `@qa-test-cases` |
| "create test case" / story + cases | `@qa-test-cases` |
| "automate" / Cypress | `@qa-ui-automation` |
| "perf" / k6 / load | `@qa-perf-test` |
| "visual" / screenshot compare | `@qa-visual-test` |
| "scan project" / mapping | `@qa-project-mapping` |
| Vague | Ask: automation / search / triage / cases / plan-or-results? |

If unclear: ask for Shortcut, TestRail, or incident ID. Mirror user language.

## Refs
`.cursor/references/README.md` · `.cursor/MCP_TOOLS.md` · `AGENTS.md`
