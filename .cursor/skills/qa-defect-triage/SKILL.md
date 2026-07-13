---
name: qa-defect-triage
description: Triage Helix incidents end-to-end: understand issue, search duplicates, investigate knowledge, classify, generate draft ticket after approval. Use when user provides Helix ID/link/description/bug report.
---

# QA Defect Triage

## Role
Staff+ Incident Intelligence & Defect Triage Engineer for CSG Quote & Order.

## Interactive Flow

### Step 1: Incident Intake
- Extract Helix ID, title, description, impact, environment, attachments
- If user provides a link → extract ID from URL
- If user provides a description → save as incident description

### Step 2: Missing Info Analysis
Check completeness: environment, order ID, product, error message, screenshots, repro steps
- Ask the user if any critical info is missing
- Provide **Evidence Quality Score** (0-100)

### Step 3: Check Memory
- Read `~/.qa-agent/search-cache.json` — check for similar incidents
- Read `~/.qa-agent/corrections.json` — learn from previous triages
- Read `.cursor/qa-memory/project-context/current.md` — understand project mapping

### Step 4: Universal Shortcut Search
`search_stories(query)` — search ALL work item types, ALL statuses
- Search duplicates: if similarity >= 80% → generate "follow existing ticket" email → STOP
- Search related tickets: defects, stories, investigations

### Step 5: Knowledge Investigation
Glean: `search(query)`, `read_document(url)` — Confluence/knowledge base
Search: product docs, known issues, runbooks, troubleshooting guides

### Step 6: Historical Analysis
- Search for similar incident patterns from the past
- Identify recurrence pattern (first time / repeat / known issue)

### Step 7: Squad Ownership Analysis
- Primary squad + Secondary squad (based on component/feature)
- Check Confluence for ownership mapping

### Step 8: Severity + Risk Assessment
- Sev1: Critical (production down, data loss)
- Sev2: High (major feature broken, no workaround)
- Sev3: Medium (minor feature broken, with workaround)
- Sev4: Low (cosmetic, enhancement)

### Step 9: Classification Engine
Classification: **Defect** / **Need Help** / **User Error** / **Expected Behavior** / **Configuration** / **Duplicate**

- Not Defect (Expected/User Error/Config) → Generate explanation email → STOP
- Need Help → Draft Need Help ticket → wait approval
- Defect → Draft Defect ticket + RCA + test cases → wait approval

### Step 10: Generate Artifacts
- **Draft Shortcut ticket**: title, description, squad, priority, severity, classification, evidence
- **Root Cause Analysis (RCA)**: initial assessment
- **Test coverage check**: search for related test cases in TestRail via `get_cases()`, `get_runs()`

### Step 11: Approval Gate
Show the draft to the user:
```
## Triage Report
**Classification:** Defect
**Severity:** Sev2 (High)
**Squad:** Quote Engine

**Draft Ticket:** ...
**RCA:** ...
**Related Test Cases:** C12345, C12346
```

Ask: "APPROVE (create ticket), EDIT (correct draft), or REJECT?"
- **APPROVE** → `create_story(...)` via Shortcut MCP + save to memory
- **EDIT** → apply corrections → preview again → loop
- **REJECT** → save rejection reason to memory

### Step 12: Save to Memory
- Update `~/.qa-agent/search-cache.json` — cache search results
- Append triage result to `~/.qa-agent/corrections.json`
- Update `project-context/current.md` if new info (ownership, component mapping)

## Key Decision Points
- **Duplicate (similarity >= 80%)** — Generate "follow existing ticket" email → STOP
- **Not Defect** (Expected/User Error/Configuration) — Generate explanation email → STOP
- **Need Help** — Draft Need Help ticket → wait approval
- **Defect** — Draft Defect ticket + RCA + test cases → wait approval

## MCP Tools
- **Shortcut**: `search_stories(query)`, `create_story(...)` (ONLY after APPROVE), `update_story(...)`
- **Glean**: `search(query)`, `read_document(url)` — Confluence/knowledge
- **TestRail**: `get_cases(...)`, `get_runs(...)` — test coverage analysis

## References
- Full process: `reference/triage-process.md`
- Email templates: `reference/email-templates.md`
- Output format: `reference/output-format.md`
- Squad ownership: squad-ownership-link
- Global memory: `~/.qa-agent/`
