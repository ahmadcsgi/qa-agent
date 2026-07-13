# Visual Test Configuration Reference (100% Edition)

## CLI Commands

| Command | Description |
|---------|-------------|
| `node run.js` | Run visual tests using `visual-test.config.json` |
| `node run.js init` | Scaffold `visual-test.config.json` from example template |
| `node run.js list` | List all baselines with file sizes |
| `node run.js --url <url> --pages <names>` | Run with CLI args (no config file) |
| `node run.js --config <path>` | Run using specific config file path |
| `node run.js --help` | Show usage information |

## CLI Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--url` | string | config `baseUrl` | Base URL of the app |
| `--pages` | string | config `pages[]` | Comma-separated page names |
| `--paths` | string | auto-derived | Comma-separated URL paths |
| `--viewport` | string | `1280x720` | Browser viewport `WxH` |
| `--threshold` | float | `0.001` | Per-pixel mismatch threshold (0-1) |
| `--base-dir` | path | `baselines/` | Baseline PNG directory |
| `--diff-dir` | path | `/tmp/qa-visual-diff` | Diff image directory |
| `--update-baselines` | flag | `false` | Save screenshots as new baselines |
| `--wait` | number | `2000` | Milliseconds to wait after page load |
| `--git-diff` | flag | `false` | Only test pages changed in last commit |
| `--output` | path | stdout | Write JSON report to file |
| `--report` | flag | only on FAIL | Force HTML report generation |
| `--config` | path | auto-detect | Use specific config file |
| `--verbose` | flag | `false` | Print page load logs |

## Config File Format

The config file (`visual-test.config.json`) is auto-detected in the project root:

```json
{
  "_note": "Place this file in your project root as visual-test.config.json",

  "baseUrl": "https://staging.example.com",
  "viewport": "1280x720",
  "threshold": 0.001,
  "wait": 2000,

  "pages": [
    { "name": "home",      "path": "/" },
    { "name": "login",     "path": "/login" },
    { "name": "dashboard", "path": "/dashboard", "threshold": 0.005, "wait": 3000 },
    { "name": "settings",  "path": "/settings" }
  ],

  "masks": [
    { "selector": ".date-picker",    "fill": "#ffffff" },
    { "selector": ".ad-banner" },
    { "selector": "[data-dynamic]",  "fill": "#f0f0f0" }
  ],

  "beforeScreenshot": "() => { document.querySelectorAll('.cookie-banner, .toast').forEach(el => el.remove()); }",

  "auth": {
    "cookies": "auth-cookies.json"
  },

  "notifyConsoleErrors": true,

  "baseDir": ".cursor/skills/qa-visual-test/baselines",
  "diffDir": "/tmp/qa-visual-diff"
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseUrl` | string | `""` | Base URL of the application |
| `viewport` | string | `"1280x720"` | Browser viewport as `WxH` |
| `threshold` | number | `0.001` | Default pixel mismatch threshold (0-1) |
| `wait` | number | `2000` | Default wait ms after page load |
| `pages` | array | `[]` | Page definitions (see below) |
| `masks` | array | `[]` | Element masks for dynamic content |
| `beforeScreenshot` | string | `null` | JS function string to run before each screenshot |
| `auth.cookies` | string | `null` | Path to cookies JSON file for auth |
| `notifyConsoleErrors` | boolean | `true` | Capture JS console errors in report |
| `baseDir` | string | `baselines/` | Baseline images directory |
| `diffDir` | string | `/tmp/qa-visual-diff` | Diff images and captures directory |

### Page Config Fields

Each entry in the `pages` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Page identifier (used for baseline filename) |
| `path` | string | ✅ | URL path (e.g., `/login`, `/dashboard`) |
| `threshold` | number | ❌ | Per-page threshold override |
| `wait` | number | ❌ | Per-page wait override |

If `pages` is an array of strings (not objects), paths are auto-derived:
```json
{ "pages": ["login", "dashboard"] }
```
→ `/login`, `/dashboard`

## Masking

Use masks to hide dynamic content that would cause false positives:

```json
{
  "masks": [
    { "selector": ".date-picker", "fill": "#ffffff" },
    { "selector": ".ad-container" },
    { "selector": "[data-testid=\"current-time\"]", "fill": "#f0f0f0" }
  ]
}
```

Each mask creates a white (or custom color) overlay over matching elements before the screenshot.

**Common mask targets:**
- Date pickers, calendars
- Ad banners, iframes
- Dynamic timestamps, "last updated" text
- Toast notifications, cookie banners
- User avatars (if variable)
- A/B testing elements
- Loading spinners

## Before-Screenshot Hook

Run arbitrary JavaScript before each screenshot:

```json
{
  "beforeScreenshot": "() => {\n  document.querySelectorAll('.cookie-banner, .toast').forEach(el => el.remove());\n  document.querySelector('.loading-overlay')?.remove();\n}"
}
```

The function runs after page load but before masking and screenshot.

**Common use cases:**
- Dismiss cookie/modals
- Wait for specific element
- Set localStorage/state
- Remove dynamic overlays

## Auth Cookies

For authenticated pages, export cookies to a JSON file:

```json
{
  "auth": {
    "cookies": "auth-cookies.json"
  }
}
```

**Export cookies from browser (Chrome):**
1. Install "Get cookies.txt" extension
2. Or use Playwright to export: `await context.storageState({ path: 'auth-cookies.json' })`

## Threshold Tuning

| Environment | Recommended Threshold | Rationale |
|-------------|----------------------|-----------|
| Local dev | `0.001` (default) | Stable rendering |
| CI/CD (Linux) | `0.001` | Consistent headless Chromium |
| Staging | `0.01` | Possible CDN/font differences |
| Production | `0.005` | Generally stable |
| High-animation | `0.02` | Timing differences |

### Per-Page Threshold

Set different thresholds per page for strict or lenient checks:
```json
{
  "pages": [
    { "name": "login", "path": "/login", "threshold": 0.0001 },
    { "name": "dashboard", "path": "/dashboard", "threshold": 0.02 }
  ]
}
```

## Viewport Presets

| Preset | Value |
|--------|-------|
| Desktop | `1280x720` |
| Desktop HD | `1920x1080` |
| Tablet portrait | `768x1024` |
| Tablet landscape | `1024x768` |
| Mobile | `375x667` |
| Mobile X | `414x896` |

## HTML Report

On failure, a self-contained HTML report is generated at `/tmp/qa-visual-report/`:

```
📄 HTML report: /tmp/qa-visual-report/visual-report-2026-07-13T10-30-00-000Z.html (94.5 KB)
```

The report includes:
- Verdict banner (PASS/FAIL)
- Summary cards (passed/failed/new/error)
- Per-page sections with collapsible details
- Side-by-side: Baseline | Actual | Diff images (base64 embedded)
- Console error warnings
- Config metadata

**Zero AI tokens:** The report is a standalone HTML file. The user opens it directly.

## Report JSON Structure

```json
{
  "verdict": "PASS | FAIL",
  "summary": {
    "passed": 3,
    "failed": 1,
    "new": 0,
    "updated": 0,
    "error": 0,
    "total": 4
  },
  "timestamp": "2026-07-13T10:30:00.000Z",
  "config": {
    "url": "https://staging.example.com",
    "threshold": 0.001,
    "viewport": "1280x720",
    "updateBaselines": false
  },
  "results": [
    {
      "name": "login",
      "url": "https://staging.example.com/login",
      "status": "pass",
      "diffPercent": 0,
      "diffPixels": 0
    },
    {
      "name": "dashboard",
      "url": "https://staging.example.com/dashboard",
      "status": "fail",
      "diffPercent": 0.05,
      "diffPixels": 1234,
      "totalPixels": 2468000,
      "diffPath": "/tmp/qa-visual-diff/dashboard-diff-123456.png",
      "consoleErrors": [
        "Uncaught TypeError: Cannot read property 'foo' of undefined"
      ]
    },
    {
      "name": "settings",
      "status": "new",
      "note": "No prior baseline — created"
    },
    {
      "name": "profile",
      "url": "https://staging.example.com/profile",
      "status": "error",
      "error": "net::ERR_CONNECTION_REFUSED",
      "consoleErrors": []
    }
  ]
}
```

### Result Statuses

| Status | Meaning | AI Action |
|--------|---------|-----------|
| `pass` | Matches baseline within threshold | Log + skip (~10 tokens) |
| `fail` | Differs beyond threshold | Report % + HTML report path (~200 tokens) |
| `new` | No baseline existed — created | Inform user (~20 tokens) |
| `updated` | Baseline overwritten | Confirm intent (~20 tokens) |
| `error` | Page load or comparison error | Show error message (~100 tokens) |

## .gitignore Additions

```gitignore
# Visual test baselines (auto-generated reference screenshots)
.cursor/skills/qa-visual-test/baselines/

# Visual test npm dependencies
.cursor/skills/qa-visual-test/scripts/node_modules/

# Diff artifacts (generated on failure — ephemeral)
# /tmp/qa-visual-diff/  (already in /tmp, no .gitignore needed)
```

## Common Workflows

### First-Time Setup
```bash
cd .cursor/skills/qa-visual-test/scripts
npm install
npx playwright install chromium
cd ../../../..
node .cursor/skills/qa-visual-test/scripts/run.js init
# Edit visual-test.config.json with your URLs
node .cursor/skills/qa-visual-test/scripts/run.js --update-baselines
```

### Daily Visual Check
```bash
node .cursor/skills/qa-visual-test/scripts/run.js
```

### Quick CLI Check (No Config)
```bash
node .cursor/skills/qa-visual-test/scripts/run.js \
  --url https://staging.example.com \
  --pages home,login,dashboard \
  --threshold 0.005
```

### After Deployment
```bash
node .cursor/skills/qa-visual-test/scripts/run.js
# If failures are expected design changes:
node .cursor/skills/qa-visual-test/scripts/run.js --update-baselines
```

### Git-Aware Smoke Test
```bash
node .cursor/skills/qa-visual-test/scripts/run.js --git-diff
```
