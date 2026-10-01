# Improvement backlog

Prioritas untuk QA Agent tetap **kecil, hebat, hemat token**. Status: Oct 2026.

## Sudah done (v1.5.20)

| Item | Manfaat |
|------|---------|
| `scripts/backup-external-edit.js` | Backup gate Shortcut/TestRail (paired json+md) |
| `scripts/lib/canonical-workspace.js` + boot `canonicalPathWarn` | Satu warning path Test vs AI |
| Slim `@qa-test-cases` + `qa-test-cases-flow.md` | Hemat token, gate tetap ketat |
| `@qa-test-execution` testrail-tools checklist | Stop `tmp-*.ps1` ad-hoc |
| Onboard `--testrail-mcp` + form field D | Pref `paths.testrail_mcp` |
| `@qa-entry` Done story > execution router | Kurang salah skill |

## Sudah done (v1.5.13–1.5.19)

| Item | Manfaat |
|------|---------|
| TestRail CLI tools | Stop rewrite `tmp-*.ps1` |
| `update-agent.js` | `/qa update` one-shot |
| Hapus `@qa-visual-test` | Repo lebih ringan, less noise |
| `USER_GUIDE.md` | Satu pintu docs user |
| Composer 2.5 Fast di `@qa` | Lebih cepat + cenderung lebih hemat |
| `boot-session.js` + `agent.boot_minimal` | Lite `/qa` boot |
| `qa-health.js` | Runtime checks |

## P0 — high impact, small diff

| Item | Token / size | Effort |
|------|--------------|--------|
| `tr-audit-channel.ps1` | Parametrize channel audit (suite 282 pattern) | Sedang |
| CI: test `testrail-tools` dry-run | Mock env | Sedang |

## P1 — enhance

| Item | Notes |
|------|-------|
| Shortcut bulk label helper | Hanya jika MCP bulk lambat |
| Confluence draft template | Pref-driven, MCP push |
| Merge Test/qa-agent private overlay sync | Script pull org-context template |
| Perf cleanup pointer in project-context | `delete-perf-docflow-templates.js` |

## P2 — nice to have

| Item | Notes |
|------|-------|
| `@qa` model per skill (cases=thinking, search=fast) | Butuh Cursor support |
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
