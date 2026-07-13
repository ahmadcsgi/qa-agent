# MCP Tool Map — QA Agent

Quick reference: which MCP server for which task.

## Shortcut (`shortcut`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `search_stories(query)` | Search tickets with natural language | `@qa-search-tickets`, `@qa-defect-triage` |
| `stories-get-current` | View story/defect details | `@qa-defect-triage`, `@qa-ui-automation`, `@qa-test-cases`, `@qa-api-test`, `@qa-perf-test` |
| `create_story(...)` | Create new ticket (only after approval) | `@qa-defect-triage` |
| `update_story(...)` | Update existing ticket | `@qa-defect-triage` |

## TestRail (`testrail`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `get_cases(section_id)` | View test cases in section | `@qa-ui-automation`, `@qa-test-cases` |
| `get_case(case_id)` | Test case details | `@qa-ui-automation` |
| `add_case(...)` | Create new test case (only after approval) | `@qa-test-cases` |
| `update_case(...)` | Edit test case | `@qa-test-cases` |
| `delete_case(...)` | Delete test case | `@qa-test-cases` |
| `get_sections()` | View section list | `@qa-test-cases` |
| `get_section(id)` | Section details | `@qa-test-cases` |
| `get_runs(...)` | View test runs | `@qa-defect-triage` |
| `add_run(...)` | Create new test run | `@qa-ui-automation` |

## Glean (`glean`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `search(query)` | Search documents, Confluence, knowledge base | `@qa-defect-triage`, `@qa-ui-automation`, `@qa-api-test`, `@qa-search-tickets` |
| `read_document(url)` | Read specific document | `@qa-defect-triage` |
| `chat(query)` | Ask Glean AI | All skills |

## Context7 (`context7`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `resolve-library-id(...)` | Find library ID | `@qa-ui-automation` (Cypress), `@qa-api-test` (Karate), `@qa-perf-test` (k6) |
| `query-docs(...)` | Fetch framework documentation | `@qa-ui-automation`, `@qa-api-test`, `@qa-perf-test` |

## Cypress (`cypress`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `run_test(file)` | Run Cypress test & validate | `@qa-ui-automation` |
| `open_runner(...)` | Open Cypress Runner | `@qa-ui-automation` |

## Playwright (`playwright`)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `browser_navigate(url)` | Navigate to a web page | `@qa-ui-automation` |
| `browser_click(selector)` | Click element | `@qa-ui-automation` |
| `browser_type(selector, text)` | Type in input field | `@qa-ui-automation` |
| `browser_get_accessibility_tree()` | Get page accessibility structure | `@qa-ui-automation` |
| `browser_screenshot()` | Screenshot for exploration log | `@qa-ui-automation` |
| `browser_evaluate(script)` | Execute JS in browser | `@qa-ui-automation` |

## Git (built-in Cursor)
| Tool | Use Case | Called by |
|------|----------|----------------|
| `git diff`, `git log` | Check changes | `@qa-perf-test`, `@qa-ui-automation`, `@qa-api-test` |
| `git checkout -b` | Create new branch | `@qa-perf-test`, `@qa-api-test` |

> **Note:** Detailed tool usage is documented in each skill file (`.cursor/skills/<name>/SKILL.md`).
