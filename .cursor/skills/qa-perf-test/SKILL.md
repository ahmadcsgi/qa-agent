---
name: qa-perf-test
description: Generate k6 perf/load tests. Adaptive host/WSL, xk6 vault+faker+exec, thresholds, heal. Use for perf, k6, load, or WSL k6 missing extensions.
---

# QA Performance Test (k6)

## Flow (short)

1. `node scripts/resolve-k6.js` (adaptive runner). Pref `paths.perf_tests`
2. If missing vault/exec/faker: `wsl-xk6-install.mdc` / `setup-wsl-tooling.js --only k6-custom`
3. **Memory gate:** `automation-memory-gate.mdc`
4. Gather source + scenario. Reuse `api-scenario.js`. Thresholds from docs/org-context (never invent)
5. Ladder + security lite > generate under perf repo > preview ACC > optional run > heal max 2x > memory

Never paste vault secrets. Detail: `.cursor/references/qa-perf-test-flow.md`. Also `k6-testing.md`, `docs/WSL.md`.
