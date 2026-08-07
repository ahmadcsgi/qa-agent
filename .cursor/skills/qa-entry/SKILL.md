---
name: qa-entry
description: QA entry/router. Detect intent and route to one @qa-* skill. Use for @qa, onboard, vague asks, or pasted story/case/Helix links.
---

# QA Entry Point

Receptionist: detect intent, route to **one** skill. Stay short.

## Boot (first multi-step turn)

1. `proj ensure` > `boot` > prefs/good/bad. No JSON dump
2. If `mcp.path_aware` > `mcp-mode auto` (Reload if profile changed)
3. Automation + `paths.*` > memory gate / map if stale
4. Daily private facts: `qa-memory/org-context.md` + `user-prefs.md`. **Do not** load full `onboard.md` unless onboard/Part C

## Intent → skill

| Pattern | Route |
|---------|-------|
| Story/case id (no verb) | Ask once: cases / UI / plan? |
| `automate` + TestRail/`C…` | `@qa-ui-automation` |
| `automate` + Shortcut/`sc-` | `@qa-ui-automation` |
| Incident / triage | `@qa-defect-triage` |
| Stack/error paste | `@qa-search-tickets` |
| API / karate | `@qa-api-test` |
| Plan / centang / label groom | `@qa-test-execution` |
| Create/update cases | `@qa-test-cases` |
| Perf / k6 | `@qa-perf-test` |
| Visual | `@qa-visual-test` |
| Mapping | `@qa-project-mapping` |
| Review PR / before push | `@qa-pr-review` (+ security) |
| Security / XSS / CVE | `@qa-security-review` |
| Onboard | Wizard below (then private `onboard.md` Part C optional) |
| Vague | Ask: automation / search / triage / cases / plan / onboard? |

## Onboard

1. No store.js > `docs/FIRST_RUN.md`
2. TodoWrite: resume > learn > tools > form > apply > hook > Ready/Reload > Part C optional
3. `onboard-wizard.js --resume` / `--print-learn` / `--print-tools` / `--print-form`
4. `--apply …` (path exit 2 > re-ask). Prefer tools `1,2` or `1,6` per org policy in private onboard
5. Load private `onboard.md` only for this flow / Part C. Else skip

MCP profiles: lite | ui | api | perf via path-aware. Refs: `AGENTS.md` · `references/README.md` · `FIRST_RUN.md`
