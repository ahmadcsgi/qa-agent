# Shortcut MCP API Quick Reference

## Search Stories

### Basic search
```
search_stories(query: "bug quote generation")
```

### Search with filters
Shortcut search supports natural language + filters:
- `project:"Quote Engine"` — filter by project
- `owner:"budi"` — filter by owner
- `type:defect` — filter by story type
- `state:open` — filter by workflow state
- `label:"regression"` — filter by label
- `deadline:2024-01-01` — filter by deadline

### Advanced search examples
```
# Find open defects in Quote Engine
search_stories("type:defect state:open project:\"Quote Engine\"")

# Find stories related to pricing
search_stories("pricing workbook")

# Find recent bugs
search_stories("type:defect created:\">2024-01-01\"")

# Find by error message
search_stories("NullPointerException generateQuote")
```

### Search ALL types
Always search across: defect, story, chore, task, need-help, investigation, spike, enhancement

### Search ALL statuses
Include: open, closed, completed, archived, in-progress, ready-for-review, blocked

## Get Story Details
```
stories-get-current
```

Available fields:
- `id` — story number
- `name` — title
- `description` — full description (Markdown)
- `story_type` — defect, story, chore, etc.
- `current_state` — open, closed, etc.
- `owner_ids` — array of owner IDs
- `project_id` — project reference
- `labels` — array of labels
- `deadline` — due date
- `created_at`, `updated_at` — timestamps
- `requested_by_id` — creator
- `external_tickets` — linked Helix/other tickets
- `tasks` — checklist items
- `comments` — discussion (limit 10)

## Create Story (only after APPROVAL)
```
create_story(
  name: "Bug: Quote generation fails for premium > 1M",
  description: "## Steps to Reproduce\n1. ...\n## Actual\n...\n## Expected\n...",
  story_type: "defect",
  project_id: 123,
  owner_ids: ["user-uuid"],
  labels: ["bug", "quote"],
  external_tickets: [{ external_id: "HELIX-123", url: "..." }]
)
```

## Update Story
```
update_story(
  story_id: 456,
  current_state: "in-progress",
  description: "Updated description..."
)
```

## API Tips
- `search_stories` returns max 25 results — narrow query if too broad
- Use query expansion: exact → semantic → feature → workflow → symptom
- Cache results via `node ~/.qa-agent/lib/store.js cache set <hash> "<query>" '<results>'` (TTL 24h)
- Never create/update stories without APPROVAL
