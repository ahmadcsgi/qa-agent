# WSL for **k6 runs** (optional fallback, not for installing QA Agent)

QA Agent installs on the **host** (Windows / macOS / Linux).

**Adaptive rule** (`scripts/resolve-k6.js`):

1. **Inside WSL** (Remote-WSL / Ubuntu shell) > use local `k6` (priority)
2. Else **host** `k6` on PATH
3. Else Windows > **WSL bridge** (`wsl -- k6`)
4. Else install

Optional pref: `tooling.k6_runner` = `auto` | `host` | `wsl`

## Split (when WSL is needed)

| What | Where |
|------|--------|
| Cursor + QA Agent + MCP | Host OS |
| `k6 run …` | Inside WSL: local `k6`. Else host. Else Windows bridge |

macOS / Linux teammates: install k6 on the host. No WSL required.

## Onboard: host or WSL

During `/qa onboard` tooling (Windows):

- **`2`** = k6 on Windows host (use if install is allowed)
- **`6`** = k6 in WSL (prefers **custom xk6** when vault + faker + exec are needed)

```bash
node scripts/setup-tooling.js                    # host tools
node scripts/setup-wsl-tooling.js --status
node scripts/setup-wsl-tooling.js --install --only k6-custom
# stock apt only (no extensions):
node scripts/setup-wsl-tooling.js --install --only k6
# alias:
node scripts/setup-tooling.js --wsl --install --only k6-custom
```

Does **not** auto-install Docker (enable Docker Desktop > WSL integration if you need it).

## Custom k6 (xk6): recommended when vault / faker / exec are required

Stock `apt` / `--only k6` installs plain k6. Vault scripts need extensions.

**Canonical recipe:** `.cursor/rules/wsl-xk6-install.mdc`

| Item | Value |
|------|--------|
| k6 base | **v1.7.1** |
| Extensions | `xk6-ansible-vault` + `xk6-faker` + `xk6-exec` |
| Output | `$REPO_ROOT/bin/k6-custom` then symlink `~/bin/k6` |
| REPO_ROOT | Prefer `paths.perf_tests` (perf repo) |

Verify: `k6 version` must list **exec** and **ansible-vault**. Prefs: `tooling.k6_runner=wsl`, `tooling.k6_custom_wsl=true`.

Skip workshop pin `v0.43.1` and `xk6-distributed-tracing` unless the team asks for them.

## Run a test (WSL path)

```bash
wsl -d Ubuntu -- bash -lc "cd /path/to/perf-repo && k6 run script.js"
```

Set `paths.perf_tests` to a path reachable from the chosen runner (host path, or `/home/...` / `/mnt/c/...` for WSL).

## Checklist (Windows + blocked host k6)

1. WSL2 + Ubuntu (`wsl --install -d Ubuntu` if needed)
2. Go available in WSL (`go version`) for xk6
3. Onboard > tooling > pick **6**, or `setup-wsl-tooling.js --install --only k6-custom`
4. Verify: `node scripts/resolve-k6.js` (or `wsl -- k6 version`)
5. Point `paths.perf_tests` at the perf repo

Related: [FIRST_RUN.md](FIRST_RUN.md) · [MCP.md](MCP.md) · `@qa-perf-test` · `scripts/resolve-k6.js` · `.cursor/rules/wsl-xk6-install.mdc`
