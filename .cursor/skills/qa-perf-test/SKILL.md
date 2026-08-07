---
name: qa-perf-test
description: Generate k6 performance/load tests from Shortcut stories or APIs. Adaptive host/WSL runner, xk6 custom (vault+faker+exec), thresholds, auto-heal. Use for perf test, k6, load test, stress test, or WSL k6 missing extensions.
---

# QA Performance Test (k6)

## Run environment (adaptive, mandatory)

**Detect first** (do not assume WSL):

```bash
node scripts/resolve-k6.js
# or: node scripts/resolve-k6.js --json
```

| Priority | When | How to run |
|----------|------|------------|
| 1. **Inside WSL** | Terminal / Remote-WSL (`WSL_DISTRO_NAME`, etc.) | `k6 run script.js` (native in distro, never nest `wsl --`) |
| 2. **Host** | Not in WSL, `k6` on PATH | `k6 run script.js` |
| 3. **WSL bridge** | Windows host, no host k6, WSL has k6 | `wsl -- bash -lc "cd '<perf-dir>' && k6 run script.js"` |
| 4. **Install** | Neither | Host install first. WSL option **6** if host blocked |

- Pref override (optional): `tooling.k6_runner` = `auto` (default) | `host` | `wsl`
- Pref `paths.perf_tests` = perf repo root
- Pref `tooling.k6_custom_wsl=true` when custom xk6 (vault+faker+exec) is installed
- macOS / Linux: never require WSL
- Corporate Windows where host k6 is blocked > use WSL fallback (see `docs/WSL.md`)

### Custom k6 missing / missing extensions (mandatory check)

If `resolve-k6` fails, or vault scripts need extensions and `k6 version` lacks **ansible-vault** / **exec** / **faker**:

1. Load `.cursor/rules/wsl-xk6-install.mdc` (recipe: xk6 build **v1.7.1** + three extensions > `~/bin/k6`)
2. Prefer `node scripts/setup-wsl-tooling.js --install --only k6-custom` (REPO_ROOT = `paths.perf_tests`)
3. Do not invent a different pin. Stock apt (`--only k6`) is OK only when vault/faker/exec are not required

### Secrets / vault (before inventing credentials)

1. Read `project-context` + private **`onboard.md` Part A9c–A9e** if present (EncryptSecret, api-scenario.js, perf baseline).
2. Prefer team vault docs (Ansible Vault under `{paths.perf_tests}/k6/loader/jsons/`).
3. **Never** paste vault passwords, client secrets, or plaintext env JSON into chat or committed files.
4. If secrets required and missing → list what is needed and ask user (or point to vault edit flow). Do not invent tokens.

### k6 scenario config (mandatory)

1. Resolve `{paths.perf_tests}/k6/loader/api-scenario.js` (onboard Part A9d).
2. **Reuse** `testOptions` from that file. Do not duplicate executor config inline.
3. Override via env vars only (`EXECUTOR`, `RATE`, `DURATION`, `VUS`, `STAGES`, …) per patterns in that file.

### Thresholds baseline

1. Ask: does squad have custom thresholds (project-context / squad Confluence)?
2. If **no** → resolve org baseline from private `qa-memory/org-context.md`, onboard Part A9e, or Glean / user paste. Do not invent numbers. Do not hardcode org wiki URLs in this skill.
3. If squad has own baseline → squad wins over org fallback.

## Interactive Flow

### Step 0: Memory gate (mandatory)

Load `.cursor/rules/automation-memory-gate.mdc`.

1. Resolve `paths.perf_tests`. If unset → ask for perf repo path. Do not invent.
2. Read `.cursor/qa-memory/project-context/current.md`.
3. If missing, empty, >7d, or mapped root ≠ `paths.perf_tests` → **`@qa-project-mapping`** on that path → save → `proj sync`.
4. If fresh → reuse memory. Then continue.

### Step 1: Gather Context
Ask the user:
1. **Source**: Shortcut story ID, API endpoint, or flow
   - Story → Shortcut MCP `stories-get-by-id`
   - Endpoint → method, payload, headers
   - Flow → endpoint sequence
2. **Scenario Type**: Load / Stress / Spike / Soak / Smoke
3. **Workload**: VUs + duration (default smoke: 10 VU, 30s — or 1–2 VU for true smoke)
4. **Thresholds**: squad custom if documented, else org baseline (onboard A9e / 26.2 Performance Plan Thresholds via Glean). Default smoke only if no doc: p95 < 2000ms, error rate < 1%
5. **Environment**: staging / production / custom base URL

### Step 2: Check Memory & Existing
- `project-context/current.md` — base URL, auth, helpers (from gate)
- `cor list perf-test` (good / bad)
- Existing k6 helpers in `paths.perf_tests` (getToken, getGlobal, defineSummary, thresholds)
- `node scripts/resolve-k6.js` — remember runner for Step 8

### Step 3: Research (if needed)
- `.cursor/references/k6-testing.md`
- Context7 for k6 docs
- Glean / Confluence for internal APIs
- Vault / EncryptSecret notes from onboard (no secrets in chat)

### Step 4: Plan
Risk analysis, scenarios, thresholds, data variants. Risk Coverage > Endpoint Coverage.

### Step 4b: Decision ladder
`@qa-token-saver` + `coding-principles.mdc`: needed now? > simpler? > seen 3x? Then YAGNI > Reuse > Stdlib > Native > Existing dep > One-liner > Minimum. Auth/vault paths: `@qa-security-review` lite.

### Step 5b: Reflexion
Correctness, minimality, reuse, safety — then preview.

### Step 6: Generate k6 Script
Write under `paths.perf_tests` (repo convention). **Import/reuse** `{paths.perf_tests}/k6/loader/api-scenario.js` for `testOptions`. Reuse other helpers. Include checks + thresholds from baseline step.

### Step 7: Preview & User Loop
APPROVE / EDIT / REJECT → `cor add` on reject.

### Step 8: Auto-Run (Optional)
Ask: "Run now?"

Use **resolved** runner from Step 2:

```bash
# Host (default when available)
k6 run path/to/test.js
k6 run --out json=results.json path/to/test.js

# Or delegate:
node scripts/resolve-k6.js --run -- run path/to/test.js

# WSL only when resolve-k6 picks wsl
wsl -- bash -lc "cd '<perf-dir-unix>' && k6 run path/to/test.js"
```

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
- `.cursor/rules/wsl-xk6-install.mdc` (custom WSL xk6: vault + faker + exec)
- `scripts/resolve-k6.js`
- `docs/WSL.md` (Windows fallback + custom k6)
- `scripts/setup-wsl-tooling.js` (`--only k6-custom`)
- Private `onboard.md` Part A9c–A9e (EncryptSecret, api-scenario.js, perf baseline) when present
