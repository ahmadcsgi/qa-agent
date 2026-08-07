---
name: qa-search-tickets
description: Search Shortcut with NL expansion and ranking. Use for search ticket, find bug, or paste error/stack.
---

# QA Search Tickets

## Flow (short)

1. Accept NL / error / incident text. Clarify scope/time/type only if unclear
2. **Cache first:** `cache hash` > `cache get` (skip if pref skip_cache)
3. Shortcut `stories-search` (2–4 focused queries). Expand via `reference/search-strategy.md`
4. If empty: Glean fallback. Rank + dedupe. Output via `reference/output-format.md`
5. `cache set`. Never invent tickets

Mirror user language. Cite story IDs/URLs.
