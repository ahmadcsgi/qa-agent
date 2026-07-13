---
name: qa-search-tickets
description: Search Shortcut tickets using natural language with intelligent query expansion, relevance scoring, and interactive narrowing. Use when user says "search ticket about...", "search bug...", "find ticket...", paste error message, Helix title, or asks about previous investigations.
---

# QA Search Tickets

## Interactive Flow

### Step 1: Understand Input
Accept user input — can be:
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
MANDATORY: Read `.cursor/qa-memory/search-cache/shortcut.json`
- If same (or similar) query exists and < 24 hours → return cached result + notify user
- If not found or > 24 hours → proceed

### Step 4: Search Shortcut
Use Shortcut MCP: `search_stories(query)`
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
Ask: "APPROVE (save cache and return), NARROW (filter further), or EXPAND (re-search with different query)?"
- **APPROVE** → save to cache + return final
- **NARROW** → ask for additional filters → re-search
- **EXPAND** → ask for new query → re-search from Step 4

### Step 8: Save to Memory
- Update `.cursor/qa-memory/search-cache/shortcut.json` with results + timestamp
- If user narrows/expands → save interaction pattern to `corrections/search.md`

## Output Rules — Token Efficiency
⚠️ **Chat output MUST be simple and concise.**
- Do not show full file content in chat — just path + summary
- Do not print full script/feature/k6 script in chat — just: `Generated: path/to/file.feature`
- Minimal output format:
  ```
  ✅ <task> — <file_path>
  • <key result 1>
  • <key result 2>
  ```
- Code details go in the file, chat shows only: path, status, and key points
- Use bullet points, not long paragraphs
- If there's an error: show 1 line error + file + line number, not full stack trace
- Save detailed output/log to memory file, not in chat

## MCP Tools
- **Shortcut**: `search_stories(query)` — main search
- **Glean**: `search(query)` — if additional business context is needed

## Language-Adaptive Communication

- **Always respond in the same language the user uses.** If the user writes in English, respond in English. If they write in Indonesian, respond in Indonesian. If they write in Japanese, Korean, or any other language, respond in the same language.
- **Never switch languages mid-conversation** unless the user explicitly switches.
- **Never force English** on a user who writes in another language — match their language.
- **Code, file paths, and MCP tool names stay in English** regardless of the conversation language.

## Anti-Hallucination Rules (MUST FOLLOW)

- **NEVER guess or make up information.** If unsure about anything — tool output, configuration, test behavior — say "I don't know" or "I'm not sure" and ask the user.
- **ALWAYS cite sources** for every claim: memory cache entries, MCP tool results, user statements, or reference docs.
- **If MCP tool returns an error or empty result**, report it honestly. Do not fabricate results.
- **If a request is outside your scope**, say "This is outside my capability. Try @qa-entry for routing to the right skill."
- **If you don't have enough context**, list what you know and what you're missing, then ask the user.

## References
- Search strategy detail: `reference/search-strategy.md`
- Output format: `reference/output-format.md`
- Memory: `.cursor/qa-memory/MEMORY_PROTOCOL.md`
