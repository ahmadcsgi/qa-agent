---
name: qa-search-tickets
description: Search Shortcut tickets using natural language with intelligent query expansion, relevance scoring, and interactive narrowing. Use when user says "search ticket about...", "search bug...", "find ticket...", paste error message, Helix title, or asks about previous investigations.
---

# QA Search Tickets

## Interactive Flow

### Step 1: Understand Input
Accept user input - can be:
- **Natural language**: "bug quote generation", "pricing workbook issue"
- **Error message**: "NullPointerException", "500 Internal Server Error", stack trace
- **Helix ticket**: title, description, full page text
- **Business question**: "show me previous investigations about quote generation"

### Step 2: Ask Clarifying Questions
Ask the user (if unclear):
1. **Scope**: "Search in all projects or a specific one?"
2. **Time range**: "Tickets from when? (last 7 days, 30 days, all)"
3. **Type filter**: "All types or specific? (defect, story, chore, need-help)"
4. **Depth**: "Brief results (top 5) or detailed (all matches)?"

### Step 3: Check Memory Cache
MANDATORY:
1. `node ~/.qa-agent/lib/store.js cache hash "<query>"` → hash
2. `node ~/.qa-agent/lib/store.js cache get <hash>`
- If returns non-null → return cached result + notify user
- If `null` → proceed

### Step 4: Search Shortcut
Use Shortcut MCP: `stories-search` with a query string
Query expansion strategy (details in reference/search-strategy.md):
- Exact Match → Semantic → Feature → Workflow → Object → Symptom → Historical
- Search ALL work item types (defect, story, chore, task, need-help, investigation, spike, enhancement)
- Search ALL statuses (open, closed, completed, archived)

### Step 5: Analyze & Score Results
- Score relevance 0-100% based on keyword match, recency, status
- Cluster by type (defect vs story vs chore)
- Predict ownership (based on story owner/team)
- Highlight duplicate / similar tickets

### Step 6: Preview Results
Show to the user in format:

```
## Search Results: [query]
Found 8 tickets (0.3s)

| # | Score | ID | Title | Type | Status | Owner | Updated |
|---|-------|----|-------|------|--------|-------|---------|
| 1 | 95%   | 123 | ...  | Defect| Open   | User  | 2d ago |
| 2 | 82%   | 456 | ...  | Story | Closed | User  | 5d ago |
...

**Insights:** 
- 3 open defects related to quote generation
- 2 closed stories with similar implementation
```

### Step 7: User Loop
Ask user (type number or custom):
1. APPROVE - save to cache + return final
2. NARROW - filter further (ask for additional filters -> re-search)
3. EXPAND - re-search with different query -> ask for new query -> re-search from Step 4
or type your own answer

### Step 8: Save to Memory
- Cache results: `node ~/.qa-agent/lib/store.js cache set <hash> "<query>" '<results>'`
- If user narrows/expands → save to decision memory: `node ~/.qa-agent/lib/store.js cor add "search" "<context>" "<issue>" "<pattern>" "<lesson>" "1|-1"`

## MCP Tools
- **Shortcut**: `stories-search` - main search
- **Glean**: `search` - if additional business context is needed

## References
- Search strategy detail: `reference/search-strategy.md`
- Output format: `reference/output-format.md`
- Global memory: `~/.qa-agent/`
