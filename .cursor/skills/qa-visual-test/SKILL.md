---
name: qa-visual-test
description: Visual regression testing with token-efficient architecture. Takes Playwright screenshots, compares against baselines via pixelmatch (0 AI token cost), and only loads diff images into context on failure. Handles baseline creation, git-aware testing, batch runs, config files, masking, and HTML reports. Use when asked to check UI visually, run visual regression, compare screenshots, or verify layout changes.
---

# QA Visual Test

## Principles

- **Comparison = math, not AI.** Pixelmatch runs in Node.js — zero tokens for screenshot comparison.
- **Text-only report to AI.** JSON output with pass/fail/diffPercent — no images in conversation.
- **Diff image loaded ONLY on failure** via `look_at` — one small image, one time.
- **Batch mode default.** All pages tested in a single script run → one summary report.
- **HTML report on failure.** Self-contained file with baseline/actual/diff side-by-side — AI never needs to load screenshots manually.

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Base URL**: "Which environment/URL?" (e.g., `https://staging.example.com`)
2. **Pages**: "Which pages to test? Names like `login,dashboard,settings`"
3. **Config file**: "Use a config file or CLI mode?"
   - Config file recommended for repeated use → run `node run.js init` once
   - CLI mode for one-off testing
4. **Mode**: "Create baselines or run comparison?"
   - First run → create baselines with `--update-baselines`
   - Subsequent → compare against baselines
5. **Dynamic content?** Ask if pages have date pickers, ads, or dynamic elements → use masks in config

### Step 2: Setup (first time)
```bash
cd .cursor/skills/qa-visual-test/scripts
npm install
npx playwright install chromium
```

### Step 3: Create Config (recommended for repeated use)
```bash
# Scaffold config file in project root
node .cursor/skills/qa-visual-test/scripts/run.js init
# → Creates visual-test.config.json → edit with your URLs and pages
```

**Config file example:**
```json
{
  "baseUrl": "https://staging.example.com",
  "viewport": "1280x720",
  "threshold": 0.001,
  "pages": [
    { "name": "home",      "path": "/" },
    { "name": "login",     "path": "/login" },
    { "name": "dashboard", "path": "/dashboard", "threshold": 0.005 }
  ],
  "masks": [
    { "selector": ".date-picker", "fill": "#ffffff" },
    { "selector": ".ad-banner" }
  ],
  "beforeScreenshot": "() => document.querySelectorAll('.cookie-banner').forEach(el => el.remove())",
  "notifyConsoleErrors": true
}
```

### Step 4: Run Visual Test
Once config is set up, just run:
```bash
node .cursor/skills/qa-visual-test/scripts/run.js
```

Or with CLI args (no config file):
```bash
# First run — create baselines
node .cursor/skills/qa-visual-test/scripts/run.js \
  --url https://staging.example.com \
  --pages login,dashboard,settings \
  --update-baselines

# Compare (uses baselines/)
node .cursor/skills/qa-visual-test/scripts/run.js \
  --url https://staging.example.com \
  --pages login,dashboard,settings

# Git-aware — only test changed pages
node .cursor/skills/qa-visual-test/scripts/run.js --git-diff --url ... --pages login,dashboard

# List existing baselines
node .cursor/skills/qa-visual-test/scripts/run.js list
```

### Step 5: Parse Report
The script outputs JSON to stdout:
```json
{
  "verdict": "PASS",
  "summary": { "passed": 3, "failed": 0, "new": 0, "total": 3 },
  "results": [
    { "name": "login", "status": "pass", "diffPercent": 0 }
  ]
}
```

**On FAILURE**, the script also generates a self-contained HTML report:
```
📄 HTML report: /tmp/qa-visual-report/visual-report-xxx.html (94.5 KB)
```

HTML report shows baseline | actual | diff side-by-side — **no need for AI to load images**.

**Report interpretation:**

| Status | Meaning | Token Cost |
|--------|---------|-----------|
| `pass` | No visual diff detected | ~10 tokens |
| `fail` | Visual diff > threshold | ~200 tokens (mention % + HTML report path) |
| `new` | No baseline existed — created one | ~20 tokens |
| `error` | Page load or comparison error | ~100 tokens |

### Step 6: Analyze Failures (only if `verdict: "FAIL"`)
For each failed result:
1. **Tell the user the HTML report path** — they can open it directly (no AI needed)
2. **Only if the user asks "what's different?"** → use `look_at` on the diff image
3. Identify the culprit and report

> DO NOT load full screenshots into conversation. Use the HTML report or diff image.
> On PASS results: do not load anything — just report the summary.

### Step 7: Baseline Management

| Scenario | Action |
|----------|--------|
| First time testing | Run with `--update-baselines` or `node run.js --url ... --pages ... --update-baselines` |
| Intentionally changed UI | Run with `--update-baselines` (same command) |
| False positive (env diff) | Increase threshold in config or use `--threshold 0.01` |
| Need to list baselines | `node run.js list` |
| Need to remove baseline | Delete the `.png` from `baselines/` directory |

### Step 8: Save to Memory
- Save test summary to `.cursor/qa-memory/generated-tests/visual/`
- Simpan ke decision memory: `node ~/.qa-agent/lib/store.js cor add "visual-test" "<context>" "<issue>" "<correction>" "<lesson>" "good|bad"`
- Update `project-context/current.md` with baseline status

## Advanced Features (Zero Token Cost)

These features run entirely in Node.js — no AI tokens consumed.

| Feature | How It Works | Config |
|---------|-------------|--------|
| **Masking** | Hide dynamic elements (date pickers, ads) before screenshot | `masks` array in config |
| **Before hook** | Run JS before each screenshot (remove banners, close modals) | `beforeScreenshot` in config |
| **Auth cookies** | Load cookies from file for authenticated pages | `auth.cookies` in config |
| **Retry** | Auto-retry comparison once on failure (flakiness guard) | Automatic (no config needed) |
| **Console errors** | Capture JS console errors during page load | `notifyConsoleErrors` in config |
| **HTML report** | Self-contained report with baseline/actual/diff images | Auto-generated on failure, or `--report` flag |
| **Git-aware** | Only test pages changed in last commit | `--git-diff` flag |
| **Per-page config** | Different threshold/wait per page | `pages[].threshold`, `pages[].wait` in config |

## Output Rules

⚠️ **No images in chat. Ever.**

```
✅ Visual Test PASS — 3/3 passed
```
```
❌ Visual Test FAIL — 2/4 failed
   • login:     0.05% diff — report: /tmp/qa-visual-report/xxx.html
   • dashboard: 0.12% diff
   ✅ settings: PASS
   ✅ profile:  PASS
```

- Never paste full screenshots into chat.
- Never paste full JSON report — summarize only.
- On failure: mention HTML report path + diff %.

## CLI Reference

```
node run.js                          Run with visual-test.config.json
node run.js init                     Scaffold config file
node run.js list                     List all baselines
node run.js --url <url> --pages ...  CLI mode (no config)

Options:
  --url <url>          Base URL
  --pages <names>      Comma-separated: login,dashboard
  --paths <paths>      Comma-separated: /login,/dashboard
  --viewport <WxH>     Viewport (default: 1280x720)
  --threshold <float>  Pixel mismatch threshold 0-1 (default: 0.001)
  --update-baselines   Save screenshots as new baselines
  --wait <ms>          Wait after page load (default: 2000)
  --git-diff           Only test changed pages
  --output <path>      Write JSON report to file
  --report             Force HTML report generation even on PASS
  --config <path>      Use specific config file
  --verbose            Show page load logs
```

## References
- Architecture: `.cursor/skills/qa-visual-test/reference/architecture.md`
- Configuration: `.cursor/skills/qa-visual-test/reference/visual-test-config.md`
- Scripts: `scripts/run.js`, `scripts/compare.js`, `scripts/report.js`
- Example config: `scripts/visual-test.example.json`
- Memory: `~/.qa-agent/` (global store)

