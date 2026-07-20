---
name: qa-search-tickets
description: Search Shortcut tickets using natural language with intelligent query expansion, relevance scoring, and interactive narrowing. Use when user says "search ticket about...", "search bug...", "find ticket...", paste error message, incident title, or asks about previous investigations.
---

# QA Search Tickets

## Interactive Flow

### Step 1: Understand Input
Accept user input - can be:
- **Natural language**: "bug quote generation", "pricing workbook issue"
- **Error message**: "NullPointerException", "500 Internal Server Error", stack trace
- **Incident / bug report**: title, description, full page text
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
Use Shortcut MCP: `stories-search` with expanded query strings
Query expansion strategy (details in `reference/search-strategy.md`):
- Exact Match → Semantic → Feature → Workflow → Object → Symptom → Historical
- Search ALL work item types (defect, story, chore, task, need-help, investigation, spike, enhancement)
- Search ALL statuses (open, closed, completed, archived)

Run 2–4 focused queries (not 20). Deduplicate by story ID before scoring.

### Step 4b: Fallback — Glean (when Shortcut is empty or fails)
Trigger Glean **`search`** when ANY of:
1. Shortcut MCP errors / times out
2. Shortcut returns **0** stories after all expanded queries
3. User asks for Confluence / wiki / email context, not only tickets

Glean query: same expanded keywords + product/feature names from the incident.
Merge insights into the preview as a separate **Knowledge hits** section (cite URLs). Do **not** invent Shortcut IDs from Glean hits.

If both Shortcut and Glean fail → report both failures honestly and stop.

### Step 5: Analyze & Score Results
Apply the **relevance rubric** (cap at 100). Start at 0, add:

| Signal | Points | How to judge |
|--------|--------|--------------|
| Exact error / phrase in title | +35 | Stack class, HTTP code, or ≥3 distinctive words |
| Exact phrase in description | +20 | Same as above, body only |
| Feature / component keyword | +15 | Matches known feature names from query expansion |
| Same type filter (e.g. defect) | +10 | If user asked for defects |
| Recency | +0 to +15 | Updated ≤7d: +15; ≤30d: +10; ≤90d: +5; else +0 |
| Open / in-progress status | +5 | Prefer actionable open work slightly |
| Same owner/team as project memory | +5 | If `project-context` names a default team |

Penalties:
- Closed/completed and user asked for "open only": −20 (or filter out)
- Title match is only a common stopword pair: −15

Labels for the table:
- **90–100** Exact / near-duplicate
- **80–89** Highly relevant
- **70–79** Related
- **60–69** Possible
- **&lt;60** Hide unless Depth = detailed

Also:
- Cluster by type (defect vs story vs chore)
- Predict ownership from story owner/team
- Flag pairs with score ≥80 as possible duplicates

### Step 6: Preview Results
Show to the user in format:

```
## Search Results: [query]
Found 8 tickets (sources: Shortcut [+ Glean if used])

| # | Score | ID | Title | Type | Status | Owner | Updated |
|---|-------|----|-------|------|--------|-------|---------|
| 1 | 95%   | 123 | ...  | Defect| Open   | User  | 2d ago |

**Insights:**
- 3 open defects related to …
- Possible duplicates: #1 ↔ #3
```

Cite: MCP tool result (+ cache hit if used).

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
- **Shortcut**: `stories-search` (primary), `stories-get-by-id` (detail on request)
- **Glean**: `search` (fallback / knowledge), `read_document` (when a hit URL needs full text)

## References
- Search strategy detail: `reference/search-strategy.md`
- Output format: `reference/output-format.md`
- Global memory: `~/.qa-agent/`
