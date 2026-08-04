# Migration and backup restore (universal)

Use this after moving to a new PC or reinstalling Cursor. **Do not commit backups** (they contain secrets).

## Two backup bundles (typical)

| Bundle | Contents | Restore target |
|--------|----------|----------------|
| `qa-agent-local-backup-*` | Memory, MCP, skills overlay, workspace `qa-memory` | See `RESTORE.md` inside the zip |
| `*-profile-local-backup-*` | `.gitconfig`, `.gnupg`, Cursor settings, cloud CLI config | See `RESTORE.md` inside the zip |

## Recommended order

1. Install **Node.js** and **Cursor**.
2. Clone this repo and run installer:
   - Windows: `.\install.ps1 -Force`
   - macOS/Linux: `./install.sh -Force`
3. Restore **qa-agent** backup (merge into `%USERPROFILE%\.qa-agent\` and `%USERPROFILE%\.cursor\`).
4. Restore **profile** backup (git, gpg, settings). Skip MCP backups if step 3 already restored `mcp.json`.
5. Fix **hooks folder**: if `~/.cursor/hooks` is a file, delete it and run:
   `node scripts/install-mcp-hook.js`
6. Set **your** paths (not shipped in repo):
   - `/qa onboard` or `node scripts/setup-prefs.js`
   - Ensure `paths.ui_tests` ≠ `paths.api_tests`
7. Smoke check:
   `node scripts/post-restore-check.js`
   `node scripts/doctor.js`
8. **Reload Window** in Cursor.

## Performance (IDE)

- Prefer **`@qa`** over waiting for the full `/` command list.
- Type `/qa` directly to filter without loading every plugin command.
- Disable Cursor **plugins** you do not use daily.
- Optional: keep active repos on local disk instead of synced cloud folders.

## Security

- Keep backup zips offline or encrypted.
- Rotate API keys if the old machine was not securely wiped.
- Never commit `mcp.json`, `.cursor/qa-memory/`, or backup zips.

## Scripts

| Script | Purpose |
|--------|---------|
| `node scripts/post-restore-check.js` | Quick smoke after restore |
| `node scripts/validate-paths.js` | Path pref sanity (ui ≠ api, paths exist) |
| `node scripts/doctor.js` | Full health check |
| `node scripts/onboard-status.js` | Onboard checklist |

See also: [FIRST_RUN.md](FIRST_RUN.md) · [SETUP.md](SETUP.md)
