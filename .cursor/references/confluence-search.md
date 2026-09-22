# Confluence search (primary internal docs)

**Default:** Atlassian MCP (`atlassian`), not Glean. Pref: `search.primary=confluence`.

## Tools (Atlassian MCP)

| Tool | Use |
|------|-----|
| `search` | Cross Confluence + Jira (natural language query) |
| `searchConfluence` | CQL when user wants wiki only |
| `getConfluenceContent` | Full page after search hit |

## Query tips

- Pass **plain language** to `search`, not CQL/JQL.
- Prefer `searchConfluence` with `text ~ "term"` or `title ~ "term"` for wiki-only.
- Cite page title + URL from tool results.

## Fallback

- Shortcut / TestRail for tickets and cases
- User-pasted Confluence URL
- Glean only if user explicitly requests it (`tools.skip_glean` false and user asks for Glean)
