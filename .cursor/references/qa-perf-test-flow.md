# QA perf (k6) — detailed flow

Loaded by `@qa-perf-test`. Keep `SKILL.md` short.

## Runner detect (`scripts/resolve-k6.js`)

| Priority | When | Run |
|----------|------|-----|
| 1 Inside WSL | `WSL_DISTRO_NAME` etc. | `k6 run` native (never nest `wsl --`) |
| 2 Host | k6 on PATH | `k6 run` |
| 3 WSL bridge | Windows, no host k6 | `wsl -- bash -lc "cd … && k6 run …"` |
| 4 Install | Neither | Host first. WSL tooling **6** if host blocked |

Prefs: `tooling.k6_runner=auto|host|wsl`, `paths.perf_tests`, `tooling.k6_custom_wsl`.

## Custom xk6

If resolve fails or `k6 version` lacks ansible-vault / exec / faker: load `wsl-xk6-install.mdc` or `setup-wsl-tooling.js --only k6-custom`. Do not invent pins.

## Secrets / scenario / thresholds

1. `project-context` + onboard Part A9c–A9e / `org-context` if present. Never paste vault secrets.
2. Reuse `{paths.perf_tests}/k6/loader/api-scenario.js` `testOptions`. Env overrides only.
3. Thresholds: squad doc > org baseline (Glean/org-context) > smoke default p95<2000ms, error<1% only if no doc.

## Flow steps

Gate (`automation-memory-gate`) > gather source/scenario/workload > `cor list perf-test` > research (`k6-testing.md`) > plan > ladder + security lite > generate under `paths.perf_tests` > preview ACC > optional run via resolve-k6 > heal max 2x > memory.

Offline: `k6-testing.md`, `docs/WSL.md`, `resolve-k6.js`.
