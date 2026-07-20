---
name: qa-defect-triage
description: Triage incidents end-to-end: understand issue, search duplicates, investigate knowledge, classify, generate draft ticket after approval. Use when user provides incident ID/link/description/bug report.
---

# QA Defect Triage

## Role
Staff+ Incident Intelligence & Defect Triage Engineer.

## Interactive Flow

### Step 1: Incident Intake
- Extract incident ID, title, description, impact, environment, attachments
- If user provides a link > extract ID from URL
- If user provides a description > save as incident description

### Step 2: Missing Info Analysis
Check completeness: environment, order ID, product, error message, screenshots, repro steps
- Ask the user if any critical info is missing
- Provide **Evidence Quality Score** (0-100)

### Step 3: Check Memory
- Hash: `node ~/.qa-agent/lib/store.js cache hash "<incident-key>"` then `cache get <hash>`
- Check decision memory: `node ~/.qa-agent/lib/store.js cor list "triage" "1"` - proven patterns (score >= 1)
- Avoid past mistakes: `node ~/.qa-agent/lib/store.js cor list "triage" "-999" "-1"` - score between -999 and -1
- Read `.cursor/qa-memory/project-context/current.md` - understand project mapping

### Step 4: Universal Shortcut Search
`stories-search` - search ALL work item types, ALL statuses
- Search duplicates: if similarity >= 80% → generate "follow existing ticket" email → STOP
- Search related tickets: defects, stories, investigations

### Step 5: Knowledge Investigation
Glean: `search`, `read_document` - Confluence/knowledge base
Search: product docs, known issues, runbooks, troubleshooting guides

### Step 6: Historical Analysis
- Search for similar incident patterns from the past
- Identify recurrence pattern (first time / repeat / known issue)

### Step 7: Squad Ownership Analysis
- Primary squad + Secondary squad (based on component/feature)
- Check project memory / Confluence for ownership mapping

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
- **Test coverage check**: TestRail via `getCases`, `getRuns`

### Step 11: Approval Gate
Show the draft to the user:
```
## Triage Report
**Classification:** Defect
**Severity:** Sev2 (High)
**Squad:** <from project memory / ownership map>

**Draft Ticket:** ...
**RCA:** ...
**Related Test Cases:** C12345, C12346
```

Ask user (type number or custom):
1. APPROVE - create ticket via `stories-create` + save to memory
2. EDIT - apply corrections -> preview again -> loop
3. REJECT - save rejection reason to memory
or type your own answer

### Step 12: Save to Memory
- Cache results: `node ~/.qa-agent/lib/store.js cache set <hash> "<query>" '<results>'`
- Save to decision memory: `node ~/.qa-agent/lib/store.js cor add "triage" "<context>" "<issue>" "<corrective>" "<lesson>" "1|-1"`
- Update `project-context/current.md` if new info (ownership, component mapping)

## Key Decision Points
- **Duplicate (similarity >= 80%)** - Generate "follow existing ticket" email → STOP
- **Not Defect** (Expected/User Error/Configuration) - Generate explanation email → STOP
- **Need Help** - Draft Need Help ticket → wait approval
- **Defect** - Draft Defect ticket + RCA + test cases → wait approval

## MCP Tools
- **Shortcut**: `stories-search`, `stories-create` (ONLY after APPROVE), `stories-update`
- **Glean**: `search`, `read_document` - Confluence/knowledge
- **TestRail**: `getCases`, `getRuns` - test coverage analysis

## References
- Full process: `reference/triage-process.md`
- Email templates: `reference/email-templates.md`
- Output format: `reference/output-format.md`
- Global memory: `~/.qa-agent/`
