---
name: qa-search-tickets
description: Search Shortcut with NL expansion and ranking. Use for search ticket, find bug, or paste error/stack.
---

# QA Search Tickets

## Flow (fast-first)

**Goal:** answer in the first reply. Never block the user on boot, cache, or reference reads.

**Hard rule:** first user-visible content must be Shortcut hits or honest empty. No `proj ensure`, no `boot`, no `cache get` before that content ships (boot-session plan may run in parallel only).

### 1. Search now (same turn, parallel)

| Query type | First action |
|------------|--------------|
| Exact ID (`INC…`, `sc-`, `#12345`) | Shortcut `stories-search` by `name` **immediately** (1 query) |
| Error text / NL | Shortcut `stories-search` 1–2 focused queries in parallel |

Run boot (`proj ensure` > `boot`) **in parallel** with MCP search, or skip boot if search already started.

**Do not** wait on: cache get, reading `reference/*`, query expansion, Glean, full story fetch.

### 2. Reply immediately when hit

If Shortcut returns a match:
- Show ticket link, title, type, squad, status in the **first message**
- One-line why it matches
- Stop. User has the answer.

### 3. Enrich only if needed (after reply, or second turn)

| Step | When |
|------|------|
| `stories-get-by-id` full | User asks detail, or top hit ambiguous |
| Glean fallback | Shortcut empty |
| Extra queries (2–4) | NL query, no exact ID, first pass empty |
| `reference/search-strategy.md` | NL expansion only, not for exact IDs |
| `reference/output-format.md` | Long multi-result reports only |
| `cache set` | After answer, background. Never before search |

### 4. Empty result

Shortcut empty > Glean `search` (1 query) > report honestly. Never invent tickets.

Mirror user language. Cite story IDs/URLs.
