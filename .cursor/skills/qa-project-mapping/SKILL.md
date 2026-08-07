---
name: qa-project-mapping
description: Map test repo into project-context. Mandatory before UI/API/perf when paths.* set and context stale. Use for map project or refresh map.
---

# QA Project Mapping

## When

Before UI/API/perf/visual when matching `paths.*` set and `project-context` missing/stale (>7d or path mismatch). See `automation-memory-gate.mdc`.

## Flow (short)

1. Resolve root from `paths.*` or user path (must exist)
2. Scan structure (glob). Optional GitNexus hint if >500 files and pref set
3. Write compact map to `.cursor/qa-memory/project-context/current.md`
4. `proj sync`. Do not dump full tree into chat

Capture: framework, helpers, aliases/steps, env patterns, conventions. Template: `.cursor/templates/project-context.current.md`. Detail optional: `docs/OPTIONAL_INTEGRATIONS.md` (GitNexus).
