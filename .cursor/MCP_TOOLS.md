# MCP Tool Map - QA Agent

Quick reference: which MCP server for which task.
Tool names below match the **actual MCP server APIs** (verified against live schemas).

## Shortcut (`shortcut`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `stories-search` | Search tickets with natural language / filters | `@qa-search-tickets`, `@qa-defect-triage` |
| `stories-get-by-id` | View story/defect details by ID | `@qa-defect-triage`, `@qa-ui-automation`, `@qa-test-cases`, `@qa-test-execution`, `@qa-api-test`, `@qa-perf-test` |
| `stories-create` | Create new ticket (only after approval) | `@qa-defect-triage` |
| `stories-update` | Update story (labels, state) — ACC for TC label groom | `@qa-defect-triage`, `@qa-test-cases` |
| `stories-add-task` | Checklist item (`qa test: …/cases/view/<id>`) | `@qa-test-cases` |
| `labels-list` / `labels-get-stories` | Find stories by TC-on-progress / TC-ready | `@qa-test-cases` |

## TestRail (`testrail`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `getCases` | List cases (section / refs / filter) — dedup before draft | `@qa-test-cases`, `@qa-ui-automation` |
| `getCase` | Case details (steps, expected) | `@qa-test-cases`, `@qa-ui-automation`, `@qa-test-execution` |
| `addCase` | Create case (**ACC only**) | `@qa-test-cases` |
| `updateCase` | Edit case (**ACC only**) | `@qa-test-cases` |
| `deleteCase` | Delete case (**ACC only**) | `@qa-test-cases` |
| `moveToSection` | Move case(s) to another section | `@qa-test-cases` |
| `getSections` / `getSection` | Section tree / details | `@qa-test-cases` |
| `addSection` / `updateSection` | Create/rename section (**ACC only**) | `@qa-test-cases` |
| `getPlans` / `addPlan` / `addPlanEntry` | Test plans under milestone | `@qa-test-execution`, `@qa-test-cases` |
| `getRuns` / `addRun` / `getTests` | Runs and tests in a run | `@qa-test-execution`, `@qa-ui-automation` |
| `addResultForCase` / `addResultsForCases` | Mark Pass/Fail/Blocked/Retest | `@qa-test-execution` |
| `getMilestones` | Resolve milestone id for plans | `@qa-test-execution` |

**Result statusId:** `1` Pass · `2` Blocked · `3` Untested · `4` Retest · `5` Fail

## Glean (`glean`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `search` | Search documents, Confluence, knowledge base | `@qa-defect-triage`, `@qa-ui-automation`, `@qa-api-test`, `@qa-search-tickets` |
| `read_document` | Read specific document by URL | `@qa-defect-triage` |
| `chat` | Ask Glean AI | All skills |

## Context7 (`context7`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `resolve-library-id` | Find library ID | `@qa-ui-automation` (Cypress), `@qa-api-test` (Karate), `@qa-perf-test` (k6) |
| `query-docs` | Fetch framework documentation | `@qa-ui-automation`, `@qa-api-test`, `@qa-perf-test` |

## Cypress (`cypress`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `cypress_run_spec` | Run a Cypress spec file headless | `@qa-ui-automation` |
| `cypress_run_test` | Run a specific test by name within a spec | `@qa-ui-automation` |
| `cypress_discover` | Map the Cypress suite | `@qa-ui-automation` |
| `cypress_get_failure_context` | Compact failure debug bundle | `@qa-ui-automation` |

## Playwright (`playwright`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `browser_navigate` | Navigate to a web page | `@qa-ui-automation` |
| `browser_click` | Click element | `@qa-ui-automation` |
| `browser_type` | Type in input field | `@qa-ui-automation` |
| `browser_snapshot` | Get page accessibility tree / DOM snapshot | `@qa-ui-automation` |
| `browser_take_screenshot` | Screenshot for exploration log | `@qa-ui-automation` |
| `browser_evaluate` | Execute JS in browser | `@qa-ui-automation` |

## Git (shell, not MCP)

| Tool | Use Case | Called by |
|------|----------|----------------|
| `git diff`, `git log` | Check changes | `@qa-perf-test`, `@qa-ui-automation`, `@qa-api-test` |
| `git checkout -b` | Create new branch | `@qa-perf-test`, `@qa-api-test` |

Setup: `node scripts/setup-git.js` (auto-install via winget/brew if missing, then ask `user.name` / `user.email`). Non-interactive check: `--non-interactive`.

## Profile switch

```bash
node scripts/mcp-mode.js full|lite|optional|all|status
# or: node ~/.qa-agent/lib/mcp-mode.js …
```

## k6 and Karate

| Tool | Default | Optional MCP |
|------|---------|--------------|
| **k6** | CLI in `paths.perf_tests` | `mcp.json.optional.example` → `k6 x mcp`. Or `setup-mcp.js --with-optional` |
| **Karate** | Maven/CLI in `paths.api_tests` | Needs standalone `karate` CLI. Most CSG repos: skip MCP, use `mvn`. See `mcp.json.optional.md` |

CLI install helper: `node scripts/setup-tooling.js` (k6, Java, Maven).

> **Note:** Detailed tool usage is documented in each skill file (`.cursor/skills/<name>/SKILL.md`) and offline refs under `.cursor/references/`.
