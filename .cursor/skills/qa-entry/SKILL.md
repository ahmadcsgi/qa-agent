---
name: qa-entry
description: QA entry/router. Detect intent and route to one @qa-* skill. Use for @qa, onboard, vague asks, or pasted story/case/Helix links.
---

# QA Entry Point

Receptionist: detect intent, route to **one** skill. Stay short.

## Boot (first multi-step turn)

1. `node scripts/boot-session.js plan` → run `proj ensure` / `boot` only if plan says true (see `/qa` command). If plan JSON has `canonicalPathWarn`, mention prefer `Documents\Test\qa-agent` once.
2. **Skip** `mcp-mode auto` on normal turns. Repair: `mcp-mode auto --if-changed --skip-if-hooked`
3. Automation + `paths.*` > memory gate / map if stale
4. Private: `qa-memory/org-context.md` + `user-prefs.md`. **Do not** load full `onboard.md` unless onboard/Part C

## Fast router (before asking)

| Signal | Route |
|--------|-------|
| `sc-\d+` or story URL + automate/UI | `@qa-ui-automation` |
| `C\d{5,}` or cases/test case/draft TC | `@qa-test-cases` |
| plan/run/centang/groom/849/857 | `@qa-test-execution` |
| Done story + Pass/centang/groom results | `@qa-test-execution` (merge run + bulk Pass, not new cases) |
| stack trace / error paste / search ticket | `@qa-search-tickets` |
| Helix / triage / incident | `@qa-defect-triage` |
| k6 / perf / load test | `@qa-perf-test` |
| karate / API test | `@qa-api-test` |
| onboard / setup | onboard wizard below |

## Intent → skill

| Pattern | Route |
|---------|-------|
| Story/case id (no verb) | Ask once: cases / UI / plan? |
| `automate` + TestRail/`C…` | `@qa-ui-automation` |
| `automate` + Shortcut/`sc-` | `@qa-ui-automation` |
| Incident / triage | `@qa-defect-triage` |
| Stack/error paste | `@qa-search-tickets` |
| API / karate | `@qa-api-test` |
| Cucumber / Gherkin / BDD / `.feature` | `@cucumber-bdd-gherkin` (+ `@qa-ui-automation` if generating UI specs) |
| Plan / centang / label groom | `@qa-test-execution` |
| Create/update cases | `@qa-test-cases` |
| Perf / k6 | `@qa-perf-test` |
| `update` / `git pull` agent | `node scripts/update-agent.js` |
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
