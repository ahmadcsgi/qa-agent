# Visual Regression Architecture — Token-Efficient Design

## Why Visual Regression Doesn't Eat Tokens

The key insight: **pixel comparison is pure math, not AI work.**

### Comparison: AI-Based vs Math-Based

| Approach | Token Cost | How It Works |
|----------|-----------|--------------|
| **AI compares screenshots** (bad) | ~50K+ tokens per comparison | Load 2 full screenshots → ask AI "are these different?" → AI describes differences |
| **pixelmatch math** (ours) | **0 tokens** | Node.js compares RGBA values byte-by-byte → returns `{diffPixels: 1234}` |

### Token Flow Per Test Run

```
┌──────────────────────────────────────────────────────────────────┐
│  BEFORE (AI context)                                            │
│  User: "run visual test on login page"                          │
│  AI:   bash("node run.js --pages login")    ← ~50 tokens       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ (script runs OUTSIDE AI context)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  SCRIPT (zero AI tokens)                                        │
│  1. Launch headless Chromium                                     │
│  2. Navigate to login page                                       │
│  3. Wait for network idle                                        │
│  4. Take full-page screenshot                                    │
│  5. pixelmatch vs baseline                                       │
│  6. Output: JSON report to stdout                ← 0 AI tokens  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ (AI reads text report)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  AFTER (AI context)                                             │
│  ┌─ PASS → "Login: PASS (0% diff)"           ← ~10 tokens      │
│  └─ FAIL → "Login: FAIL (0.05% diff)"       ← ~20 tokens       │
│           → look_at(diff.png) if needed      ← ~300 tokens max  │
└──────────────────────────────────────────────────────────────────┘
```

**Total per test:** 10-50 tokens in 90% of cases (all passes).
**Only on failure:** ~300 tokens for diff analysis.

Compare with generating a Cypress test (~2,000 tokens) or k6 test (~1,500 tokens).

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Skill Layer (SKILL.md)                                 │
│  - User interaction: ask URL, pages, mode               │
│  - Script invocation: build + run CLI command           │
│  - Report parsing: read JSON → summarize                │
│  - Failure analysis: conditional look_at                │
└────────────────────┬────────────────────────────────────┘
                     │ bash()
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Script Layer (run.js + compare.js + report.js)         │
│  - Subcommands: init, list, default (run)               │
│  - Config file: visual-test.config.json auto-detect     │
│  - Playwright browser lifecycle                         │
│  - Masking: hide dynamic elements before screenshot     │
│  - Before-screenshot hook: run JS (remove banners etc)  │
│  - Auth cookies support                                 │
│  - Screenshot capture (full-page)                       │
│  - Retry on flaky failure (auto-recompare)              │
│  - pixelmatch comparison                                │
│  - Console error capture during page load               │
│  - Diff image generation (on failure only)              │
│  - JSON report to stdout                                │
│  - HTML report on failure (self-contained, 0 token)     │
│  - Exit code for CI                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Storage Layer                                          │
│  baselines/          ← Git-ignored PNG baselines        │
│  /tmp/qa-visual-diff/  ← Temp diff + capture images     │
│  /tmp/qa-visual-report/ ← HTML reports (ephemeral)      │
│  .cursor/qa-memory/generated-tests/visual/ ← History    │
└─────────────────────────────────────────────────────────┘
```

## Token Efficiency Strategies

### 1. No Screenshots in AI Context (Hard Rule)
- Screenshots are written to disk, never to conversation
- AI only sees: `{ "name": "login", "status": "pass" }`
- Even on failure: only the diff image name, not the image itself

### 2. HTML Report Replaces AI Image Analysis
- On failure, a self-contained HTML report is generated with baseline/actual/diff side-by-side
- The user opens it directly — **no AI tokens needed** for image viewing
- AI only calls `look_at(diff.png)` IF the user explicitly asks "what changed?"

### 3. Lazy Diff Loading
- Diff image is only generated IF comparison fails
- AI only calls `look_at(diff.png)` IF the user asks for details
- Single `look_at` call — not a loop

### 4. Batch Mode
- All pages tested in a single `run.js` invocation
- One Playwright browser session for all pages
- One JSON report with all results
- AI reads one report, not one per page

### 4. Git-Aware Scanning
- `--git-diff` flag checks which files changed since last commit
- Only tests pages related to changed files
- No unnecessary screenshots of unchanged pages

### 5. Threshold Filtering
- Default threshold: 0.001 (0.1% pixel mismatch)
- Anti-aliasing, font rendering differences, sub-pixel shifts → ignored
- Only meaningful visual changes trigger failure

### 6. Parallel Page Loading (Future)
- Pages can be tested in parallel using Playwright contexts
- N pages ≈ same time as 1 page

## Data Flow Detail

```
User: "check dashboard visually"
  ↓
AI: "URL? Any specific pages?"
  ↓
User: "https://staging.example.com, pages: login, dashboard"
  ↓
AI runs:
  node run.js \
    --url https://staging.example.com \
    --pages login,dashboard
  ↓
Script output (stdout):
{
  "verdict": "PASS",
  "summary": { "passed": 2, "failed": 0, "total": 2 },
  "results": [
    { "name": "login", "status": "pass", "diffPercent": 0 },
    { "name": "dashboard", "status": "pass", "diffPercent": 0.0003 }
  ]
}
  ↓
AI reports:
  ✅ Visual Test PASS — 2/2 passed
  • login:     PASS
  • dashboard: PASS (0.0003% diff — negligible)
```

## Lifecycle

### First Run (No Baselines)
```
1. AI asks user for URL + pages
2. AI runs: node run.js --url ... --pages ... --update-baselines
3. Script creates baseline PNGs in baselines/
4. Report: all "new" status
5. AI explains: "Baselines created for login, dashboard — ready for future comparisons"
```

### Normal Run (Baselines Exist)
```
1. AI asks user for URL + pages (or reuses last config)
2. AI runs: node run.js --url ... --pages ...
3. Script compares screenshots against baselines
4. Report: pass/fail with diff percentages
5. AI summarizes results
```

### Baseline Update (UI Changed Intentionally)
```
1. User: "update baselines, we redesigned the header"
2. AI confirms: "Update all baselines or specific pages?"
3. AI runs: node run.js --url ... --pages ... --update-baselines
4. Script overwrites baseline PNGs
5. Report: all "updated" status
```

## CI/CD Integration (Future)

The script exits with code 1 on failure, making it CI-ready:
```yaml
# GitHub Actions example
- name: Visual Regression
  run: |
    node .cursor/skills/qa-visual-test/scripts/run.js \
      --url ${{ env.APP_URL }} \
      --pages login,dashboard \
      --output visual-report.json
  continue-on-error: true

- name: Upload Diff Images
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: visual-diffs
    path: /tmp/qa-visual-diff/
```
