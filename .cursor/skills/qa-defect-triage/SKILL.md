---
name: qa-defect-triage
description: Triage incidents end-to-end (duplicates, classify, draft Shortcut bug after ACC). Use for incident, bug report, or create bug ticket.
---

# QA Defect Triage

## Flow (short)

1. Intake ID/title/impact/env. Score evidence. Ask only for critical gaps
2. Cache + `cor list triage` + project-context
3. Shortcut search all types/statuses (dup ≥80% > follow-existing email > stop)
4. Glean docs/runbooks. Classify. Draft bug via `shortcut-bug-description.mdc` + titles rule
5. Preview ACC > create only after ACC. Custom fields same turn if pref. Email templates: `reference/`

Private org tone/templates: `onboard.md` Part C when present. Detail: `reference/triage-process.md` · `output-format.md` · `email-templates.md`.
