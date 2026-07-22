# WSL for **k6 runs** (not for installing QA Agent)

QA Agent installs on the **host** (Windows / macOS). Use WSL to **execute** k6 performance tests — same pattern many teammates use.

## Recommended split

| What | Where |
|------|--------|
| Cursor + QA Agent + MCP | Windows (or macOS) |
| `k6 run …` | **WSL** Ubuntu |

## Onboard installs k6 into WSL

During `/qa onboard` tooling step (Windows):

- Choose **`6`** = install k6 into WSL (Grafana apt repo)
- Or: `node scripts/setup-wsl-tooling.js --install --only k6`

```bash
node scripts/setup-wsl-tooling.js --status
node scripts/setup-wsl-tooling.js --install --only k6,curl
# alias:
node scripts/setup-tooling.js --wsl --install --only k6
```

Does **not** auto-install Docker (enable Docker Desktop → WSL integration if you need it).

## Run a test

```bash
wsl -d Ubuntu -- bash -lc "cd /path/to/perf-repo && k6 run script.js"
```

Set `paths.perf_tests` to a path reachable from WSL (e.g. `/home/you/...` or `/mnt/c/...`).

## Checklist for teammates

1. WSL2 + Ubuntu (`wsl --install -d Ubuntu` if needed)
2. Onboard → tooling → pick **6** (k6 WSL)
3. Verify: `wsl -- k6 version`
4. Point `paths.perf_tests` at the perf repo

Related: [FIRST_RUN.md](FIRST_RUN.md) · [MCP.md](MCP.md) · `@qa-perf-test`
