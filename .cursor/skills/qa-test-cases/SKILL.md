---
name: qa-test-cases
description: Generate TestRail cases from Shortcut (batch of 5, ACC, addCase). Use for create test case, update case, or TC checklist.
---

# QA Test Cases

**Start here:** load rules `testrail-case-generate.mdc`, `external-edit-backup-gate.mdc`, `testrail-temp-preview-lifecycle.mdc`.

**Detail:** `.cursor/references/qa-test-cases-flow.md` (checklist, CLI, merge). Methodology: `qa-testcase-methodology.md`.

## Boot

`node scripts/boot-session.js plan --domain testcases` then `proj ensure` / `boot` if plan says so. If `canonicalPathWarn` in plan JSON, one-line warn user (prefer `Documents\Test\qa-agent`).

## Hard gates

- No `addCase` / Shortcut checklist until **ACC** on drafts (`testrail-case-generate.mdc`).
- No external write without backup + preview ACC (`external-edit-backup-gate.mdc`).
  - After fetch: `node scripts/backup-external-edit.js shortcut <id> --file <json>` or testrail variant.
- Delete `temp/sc-{storyId}-preview.md` when write path done or abandoned.

## TestRail tools (before ad-hoc PS1)

Use `scripts/testrail-tools/` (`tr-update-plan-entry.ps1`, `tr-update-fields.ps1`, `tr-get-cases.ps1`). MCP fail > CLI. Ref: `testrail-tools.md`.

## One-line flow

Learn (story + comments) > Plan ACC > draft preview file > ACC batches > addCase > merge run > Shortcut `tests/view/<testId>`.

Plans / bulk Pass: `@qa-test-execution`.
