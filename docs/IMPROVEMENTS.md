# Improvement backlog

Prioritas untuk QA Agent tetap **kecil, hebat, hemat token**. Status: Aug 2026.

## Sudah done (v1.5.13)

| Item | Manfaat |
|------|---------|
| TestRail CLI tools | Stop rewrite `tmp-*.ps1` |
| `update-agent.js` | `/qa update` one-shot |
| Hapus `@qa-visual-test` | Repo lebih ringan, less noise |
| `USER_GUIDE.md` | Satu pintu docs user |
| Composer 2.5 Fast di `@qa` | Lebih cepat + cenderung lebih hemat |

## P0 — high impact, small diff

| Item | Token / size | Effort |
|------|--------------|--------|
| Agent wajib cek `testrail-tools/` sebelum PS1 | Hemat besar | Rule sudah di AGENTS, enforce di skill test-execution |
| `pref paths.testrail_mcp` di onboard wizard | Less guess path | Kecil |
| Slim `qa-test-cases` skill (detail ke references) | Hemat per turn | Sedang |
| `boot --minimal` flag (prefs only, no context.md dump) | Hemat boot | Kecil |

## P1 — enhance

| Item | Notes |
|------|-------|
| `tr-audit-channel.ps1` | Parametrize channel audit (suite 282 pattern) |
| Shortcut bulk label helper | Hanya jika MCP bulk lambat |
| Confluence draft template | Pref-driven, MCP push |
| `onboard-wizard` lang ID default | Sudah `--print-form --lang id` |
| CI: test `testrail-tools` dry-run | Mock env |

## P2 — nice to have

| Item | Notes |
|------|-------|
| `@qa` model per skill (cases=thinking, search=fast) | Butuh Cursor support |
| Merge Test/qa-agent private overlay sync | Script pull org-context template |
| Perf cleanup pointer in project-context | `delete-perf-docflow-templates.js` |
| Slack notify on doctor fail | Optional integration |

## Yang sengaja tidak dilakukan

| Item | Alasan |
|------|--------|
| Visual regression skill | Tidak dipakai, Cypress cukup |
| MCP server baru untuk TestRail | CLI tools + MCP lite cukup |
| Duplicate docs di AGENTS + README | AGENTS = agent, USER_GUIDE = human |

## Cara kontribusi

1. Pilih item P0/P1
2. Keep diff minimal
3. Update [USER_GUIDE.md](USER_GUIDE.md) jika user-facing
4. Entry [CHANGELOG.md](../CHANGELOG.md)
