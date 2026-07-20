# Shortcut MCP API Quick Reference

Actual tool names from the Shortcut MCP server.

## Search Stories

### Basic search
```
stories-search(query: "bug quote generation")
```

### Search with filters
Shortcut search supports natural language + filters:
- `project:"My Project"` - filter by project
- `owner:"name"` - filter by owner
- `type:defect` - filter by story type
- `state:open` - filter by workflow state
- `label:"regression"` - filter by label
- `deadline:2024-01-01` - filter by deadline

### Advanced search examples
```
# Find open defects in a project
stories-search(query: "type:defect state:open project:\"My Project\"")

# Find stories related to pricing
stories-search(query: "pricing workbook")

# Find recent bugs
stories-search(query: "type:defect created:\">2024-01-01\"")

# Find by error message
stories-search(query: "NullPointerException generateQuote")
```

### Search ALL types
Always search across: defect, story, chore, task, need-help, investigation, spike, enhancement

### Search ALL statuses
Include: open, closed, completed, archived, in-progress, ready-for-review, blocked

## Get Story Details
```
stories-get-by-id(storyPublicId: "12345")
```

Common fields in the response:
- `id` / public ID - story number
- `name` - title
- `description` - full description (Markdown)
- `story_type` - defect, story, chore, etc.
- `current_state` - open, closed, etc.
- `owner_ids` - array of owner IDs
- `project_id` - project reference
- `labels` - array of labels
- `deadline` - due date
- `created_at`, `updated_at` - timestamps
- `tasks` - checklist items
- `comments` - discussion

## Create Story (only after APPROVAL)
```
stories-create(
  name: "Bug: Feature X fails for edge case Y",
  description: "## Steps to Reproduce\n1. ...\n## Actual\n...\n## Expected\n...",
  type: "defect",
  team: "<team-id-or-name>"
)
```

## Update Story
```
stories-update(
  storyPublicId: 456,
  labels: [{ name: "TC-ready" }]
)
```

Note: `labels` typically **replaces** the label set. Preserve other labels when flipping TC-on-progress → TC-ready.

## Checklist task (qa test link)
```
stories-add-task(
  storyPublicId: 276352,
  description: "qa test: https://testrails.example/index.php?/cases/view/237001"
)
```

Format must use `cases/view/<caseId>` (not suite group_id). See `.cursor/rules/testrail-shortcut-checklist.mdc`.

## Labels
```
labels-list()
labels-get-stories({ labelPublicId: 108294 })  // e.g. TC-on-progress
```

## API Tips
- `stories-search` may return a limited page of results - narrow query if too broad
- Use query expansion: exact → semantic → feature → workflow → symptom
- Cache workflow:
  1. `node ~/.qa-agent/lib/store.js cache hash "<query>"` → hash
  2. `node ~/.qa-agent/lib/store.js cache get <hash>`
  3. On miss: call MCP, then `cache set <hash> "<query>" '<results>'` (TTL 24h)
- Never create/update stories without APPROVAL
- Label groom: only flip to TC-ready when qa-test checklist exists