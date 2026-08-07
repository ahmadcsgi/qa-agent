---
name: qa-visual-test
description: Visual regression with Playwright + pixelmatch (zero tokens on pass). Use for visual test, screenshot compare, or layout check.
---

# QA Visual Test

## Principles

Comparison = Node pixelmatch (not AI). Chat gets text summary only. HTML report on fail. No images in chat unless user asks and then only diff via `look_at`.

## Flow (short)

1. Ask URL, pages, config vs CLI, baselines vs compare, masks if dynamic UI
2. If `paths.ui_tests` set: `automation-memory-gate.mdc`
3. First time: `cd .cursor/skills/qa-visual-test/scripts` > `npm install` > `npx playwright install chromium` > `node run.js init`
4. Run `node run.js` (or CLI). Parse JSON verdict. On FAIL: give HTML report path
5. Memory: `generated-tests/visual/` + `cor` on corrections

## Output

PASS: one-line summary. FAIL: failed pages + diff % + HTML path. Never paste screenshots/full JSON.

Detail (config JSON, CLI flags, advanced masking): `reference/visual-test-config.md` · `reference/architecture.md` · `scripts/run.js`.
