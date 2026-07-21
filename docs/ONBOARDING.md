# Onboarding distribution (public vs private)

## How teammates get `/qa` the first time

1. Clone + open **qa-agent** in Cursor  
2. Run installer  
3. **Reload Window**  
4. `/qa onboard`  

Without step 2–3, slash command / agent often missing. See [FIRST_RUN.md](FIRST_RUN.md).

Terminal-only (no agent yet): `node scripts/onboard-status.js` then follow [SETUP.md](SETUP.md).

## Why two files?

| File | In git? | Audience |
|------|---------|----------|
| [`onboard.example.md`](../onboard.example.md) | Yes | Anyone cloning the repo |
| `onboard.md` | **No** (gitignore) | CSG/DGIT teammates only |

Private onboard holds org-specific hubs, triage tone, env portals, signing wiki links, and Ready checklists that should not live in a public or semi-public repo.

## How to share private `onboard.md`

1. Maintainer keeps a current `onboard.md` locally (aligned with `VERSION`).
2. Share via **secure channel** only: encrypted attachment, Confluence restricted page, or 1:1.
3. Recipient places the file at repo root: `qa-agent/onboard.md`.
4. In Cursor: `/qa onboard` or say **run onboard**.

Never:

- Commit `onboard.md`
- Paste Vault passwords into it
- Attach it to a public PR

## Agent behaviour

When the user says **run onboard** / `/qa onboard`:

1. If `~/.qa-agent/lib/store.js` missing → send them to [FIRST_RUN.md](FIRST_RUN.md). Stop.
2. Run `node scripts/onboard-status.js` (Ready table).
3. Prefer private `onboard.md` if present.
4. Else follow `onboard.example.md` + `docs/SETUP.md`.
5. Run version check: `node scripts/check-version.js`.
6. Drive Part A setup scripts. Do not dump secrets or boot JSON.

## Checklist for maintainers (before sharing)

- [ ] `VERSION` matches shipped tag/commit on `mine`
- [ ] Clone URL: `https://github.com/ahmadcsgi/qa-agent`
- [ ] A3 MCP matches `full` / optional docs
- [ ] No live API keys in the file
- [ ] Recipient told to gitignore (already in repo `.gitignore`)

See also: [SETUP.md](SETUP.md) · [DEMO.md](DEMO.md)
