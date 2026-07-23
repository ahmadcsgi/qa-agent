---
name: qa-perf-test
description: Generate k6 performance tests from Shortcut stories or API specs. Interactive flow: ask for scenario type, VUs, duration, thresholds, generates k6 script, auto-runs (WSL on Windows), auto-heals. Use when user asks for "perf test", "generate k6", "load test", "performance test", or provides a story ID for performance testing.
---

# QA Performance Test (k6)

## Run environment (mandatory)

| Host OS | How to run k6 |
|---------|----------------|
| **Windows** | Prefer **WSL**: `wsl -- bash -lc "cd '<perf-dir>' && k6 run script.js"` |
| macOS / Linux | `k6 run script.js` on host |

- Pref `paths.perf_tests` = perf repo root (path reachable from WSL, e.g. `/home/...` or `/mnt/c/...`).
- If WSL k6 missing: `node scripts/setup-wsl-tooling.js --install --only k6` (or onboard tooling **6**).
- Do **not** assume host `k6` on corporate Windows.

### Secrets / vault (before inventing credentials)

1. Read `project-context` + private `onboard.md` Part A9 if present.
2. Prefer team vault docs (e.g. EncryptSecret / Ansible Vault under `paths.perf_tests`).
3. **Never** paste vault passwords, client secrets, or plaintext env JSON into chat or committed files.
4. If secrets required and missing → list what is needed and ask user (or point to vault edit flow). Do not invent tokens.

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Source**: Shortcut story ID, API endpoint, or flow
   - Story → Shortcut MCP `stories-get-by-id`
   - Endpoint → method, payload, headers
   - Flow → endpoint sequence
2. **Scenario Type**: Load / Stress / Spike / Soak / Smoke
3. **Workload**: VUs + duration (default smoke: 10 VU, 30s — or 1–2 VU for true smoke)
4. **Thresholds**: default p95 < 2000ms, error rate < 1%
5. **Environment**: staging / production / custom base URL

### Step 2: Check Memory & Existing
- `project-context/current.md` — base URL, auth, helpers
- `cor list perf-test` (good / bad)
- Existing k6 helpers in `paths.perf_tests` (getToken, getGlobal, defineSummary, thresholds)

### Step 3: Research (if needed)
- `.cursor/references/k6-testing.md`
- Context7 for k6 docs
- Glean / Confluence for internal APIs
- Vault / EncryptSecret notes from onboard (no secrets in chat)

### Step 4: Plan
Risk analysis, scenarios, thresholds, data variants. Risk Coverage > Endpoint Coverage.

### Step 4b: Decision ladder
`@qa-token-saver`: YAGNI → Reuse → Stdlib → Native → Existing dep → One-liner → Minimum.

### Step 5b: Reflexion
Correctness, minimality, reuse, safety — then preview.

### Step 6: Generate k6 Script
Write under `paths.perf_tests` (or repo convention). Reuse helpers. Include checks + thresholds.

### Step 7: Preview & User Loop
APPROVE / EDIT / REJECT → `cor add` on reject.

### Step 8: Auto-Run (Optional)
Ask: "Run now?"

**Windows (WSL):**
```bash
wsl -- bash -lc "cd '$(wslpath -a paths.perf_tests or unix path)' && k6 run path/to/test.js"
```
Or if cwd already inside WSL-mounted repo:
```bash
wsl -- bash -lc "cd '/mnt/c/...' && k6 run path/to/test.js"
```

**macOS / Linux:**
```bash
k6 run path/to/test.js
k6 run --out json=results.json path/to/test.js
```

Verify first: `wsl -- k6 version` (Windows) or `k6 version`.

### Step 9: Auto-Healing
Fix and re-run max 2x. Then ask user.

### Step 10: Save to Memory
- `generated-tests/k6/` reference
- Update project-context if needed
- `know add perf-test …`

## MCP Tools
- Shortcut: `stories-get-by-id`
- Context7: k6 docs
- Glean: internal docs

## References
- `.cursor/references/k6-testing.md`
- `docs/WSL.md`
- `scripts/setup-wsl-tooling.js`
- Private `onboard.md` Part A9 (EncryptSecret) when present
