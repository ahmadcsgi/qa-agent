# MCP Tool Map - QA Agent

Quick reference: which MCP server for which task.
Tool names below match the **actual MCP server APIs** (verified against live schemas).

## Shortcut (`shortcut`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `stories-search` | Search tickets with natural language / filters | `@qa-search-tickets`, `@qa-defect-triage` |
| `stories-get-by-id` | View story/defect details by ID | `@qa-defect-triage`, `@qa-ui-automation`, `@qa-test-cases`, `@qa-api-test`, `@qa-perf-test` |
| `stories-create` | Create new ticket (only after approval) | `@qa-defect-triage` |
| `stories-update` | Update existing ticket | `@qa-defect-triage` |

## TestRail (`testrail`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `getCases` | View test cases (by project/suite/section) | `@qa-ui-automation`, `@qa-test-cases` |
| `getCase` | Test case details | `@qa-ui-automation` |
| `addCase` | Create new test case (only after approval) | `@qa-test-cases` |
| `updateCase` | Edit test case | `@qa-test-cases` |
| `deleteCase` | Delete test case | `@qa-test-cases` |
| `getSections` | View section list | `@qa-test-cases` |
| `getSection` | Section details | `@qa-test-cases` |
| `getRuns` | View test runs | `@qa-defect-triage` |
| `addRun` | Create new test run | `@qa-ui-automation` |

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

## Git (built-in Cursor)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `git diff`, `git log` | Check changes | `@qa-perf-test`, `@qa-ui-automation`, `@qa-api-test` |
| `git checkout -b` | Create new branch | `@qa-perf-test`, `@qa-api-test` |

> **Note:** Detailed tool usage is documented in each skill file (`.cursor/skills/<name>/SKILL.md`) and offline refs under `.cursor/references/`.
