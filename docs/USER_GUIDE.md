# QA Agent — Panduan Pengguna

Panduan ini untuk **QA Engineer** yang pakai QA Agent sehari-hari. Setup teknis: [FIRST_RUN.md](FIRST_RUN.md) · [SETUP.md](SETUP.md).

> Tulis chat dalam bahasa apa pun. Agent akan mirror (Indonesia in > Indonesia out).

---

## 1. Apa itu QA Agent?

QA Agent = co-pilot QA di Cursor. Kamu ketik `/qa` atau `@qa`, lalu jelaskan tugas. Agent:

- Cari ticket di **Shortcut**
- Buat / update case di **TestRail** (dengan ACC)
- Generate **Cypress**, **Karate**, **k6**
- Triage incident, review PR automation
- **Belajar** dari APPROVE / EDIT / REJECT kamu

**DNA:** lite · fast · small · smart · learns · token-thrifty

| Layer | Fungsi |
|-------|--------|
| MCP | Shortcut, TestRail, Glean, Cypress, … |
| Memory | Prefs, corrections, knowledge (`~/.qa-agent`) |
| Skills | Satu skill per tugas (`@qa-test-cases`, `@qa-ui-automation`, …) |

---

## 2. Mulai (5 menit)

```text
1. Clone qa-agent → buka folder di Cursor
2. .\install.ps1   (Windows)  atau  ./install.sh
3. Reload Window
4. /qa onboard    (isi squad + path repo test)
5. Reload sekali jika MCP profile berubah
```

Cek sehat:

```bash
node scripts/doctor.js
node scripts/onboard-status.js
```

Pakai di **repo produk** (bukan qa-agent): buka folder produk > `/qa onboard` sekali untuk set `paths.*`.

---

## 3. Cara memanggil

| Cara | Kapan |
|------|-------|
| **`/qa …`** | Slash command (disarankan setelah install) |
| **`@qa …`** | Agent dropdown (alternatif jika `/qa` lambat muncul) |
| **`@qa-<skill>`** | Langsung ke skill (mis. `@qa-test-cases`) |

**Model:** Agent `@qa` memakai **Composer 2.5 Fast** (hemat + cepat). Ubah di `.cursor/agents/qa.md` jika perlu `inherit`.

---

## 4. Apa yang bisa kamu minta?

### Shortcut

| Minta | Contoh |
|-------|--------|
| Cari ticket | `/qa cari bug quote generation` |
| Detail story | paste URL Shortcut atau `sc-280793` |
| Label groom | `/qa set label TC-ready di sc-280793` |

### TestRail

| Minta | Contoh | Skill |
|-------|--------|-------|
| Draft case dari story | `/qa buat test case sc-280793` | `@qa-test-cases` |
| Test plan | `/qa buat test plan 26.3 Dragon Docflow` | `@qa-test-execution` |
| Centang pass/fail | `/qa centang passed C386217 di run 905` | `@qa-test-execution` |
| Bulk update field | pakai CLI tools (lihat §7) | — |

**Aturan:** Agent **tidak** create/update TestRail atau Shortcut tanpa **ACC** kamu.

### Automation

| Minta | Contoh | Skill |
|-------|--------|-------|
| UI dari TestRail | `/qa automate C386217` | `@qa-ui-automation` |
| UI dari Shortcut | `/qa automate sc-280793` | `@qa-ui-automation` |
| API / Karate | `/qa api test POST /orders` | `@qa-api-test` |
| Perf / k6 | `/qa buat perf test login flow` | `@qa-perf-test` |

### Lainnya

| Minta | Skill |
|-------|-------|
| Triage incident | `@qa-defect-triage` |
| Map repo pertama kali | `@qa-project-mapping` |
| Review PR automation | `@qa-pr-review` |
| Update QA Agent | `/qa update` |

Matrix lengkap: [DEMO.md](DEMO.md)

---

## 5. Alur kerja yang disarankan

### Story baru → case → automation

```text
1. /qa buat test case sc-XXXXX
2. Review draft (batch 5) → ACC / EDIT / REJECT
3. Agent push ke TestRail + checklist Shortcut
4. /qa automate sc-XXXXX   (atau dari C…)
5. Review preview → ACC → file ditulis ke repo
6. Kamu commit / push (agent tidak push tanpa diminta)
```

### Grooming TestRail (bulk)

Jangan minta agent buat `tmp-*.ps1` lagi. Pakai tools tetap:

```powershell
cd scripts/testrail-tools
.\tr-update-fields.ps1 -ProjectId 3 -SuiteId 282 -SectionIds 32209 `
  -FieldsJson '{"custom_case_squadname":9}' -DryRun
```

Detail: [.cursor/references/testrail-tools.md](../.cursor/references/testrail-tools.md)

---

## 6. Update QA Agent

```bash
/qa update
# atau
node scripts/update-agent.js
# atau
.\update.ps1
```

Alur otomatis:

1. `git pull`
2. `install -Force` (sync skills global)
3. Sync TestRail tools ke MCP folder
4. `doctor.js`
5. MCP profile auto

Flags: `--dry-run` · `--skip-pull` · `--skip-install`

Setelah update: **Reload Window** sekali.

---

## 7. Memory — agent makin pintar

| Kamu bilang | Agent simpan |
|-------------|--------------|
| APPROVE | `cor` score +1 |
| EDIT / REJECT | `cor` score -1 |
| "from now on …" | `pref set` |

Layer:

| Layer | Lokasi |
|-------|--------|
| Global | `~/.qa-agent/` |
| Project | `~/.qa-agent/projects/<id>/` |
| Workspace | `.cursor/qa-memory/` (gitignored) |

Backup: `node scripts/backup-memory.js`

Detail: [MULTI_PROJECT_MEMORY.md](MULTI_PROJECT_MEMORY.md)

---

## 8. Hemat token (penting)

Prinsip: **sedikit context, banyak signal**.

| Lakukan | Hindari |
|---------|---------|
| Satu skill per chat/task | Campur case + automation + perf sekaligus |
| Sebut ID jelas (`sc-`, `C…`, run id) | Prompt vague panjang |
| ACC batch case sebelum push | Minta agent tebak scope |
| `@qa` untuk routing | Paste seluruh README |
| Boot sekali, lanjut task | Ulang setup tiap pesan |

Decision ladder sebelum generate test (YAGNI > Reuse > … > Minimum):

- Skill: `@qa-token-saver`
- Mode: `@qa token lite|full|ultra`

MCP **path-aware:** di luar folder test = profile **lite** (Shortcut + TestRail + Glean saja). Buka repo Cypress/API/perf = profile otomatis switch.

Detail: [MCP.md](MCP.md) · [TOKEN_TIPS.md](TOKEN_TIPS.md)

---

## 9. MCP profiles

| Profile | Aktif saat | Server extra |
|---------|------------|--------------|
| **lite** | qa-agent folder, chat umum | — |
| **ui** | cwd under `paths.ui_tests` | Context7, Cypress, Playwright |
| **api** | cwd under `paths.api_tests` | Context7, Karate |
| **perf** | cwd under `paths.perf_tests` | Context7, k6 |

```bash
node scripts/mcp-mode.js status
node scripts/mcp-mode.js auto
```

---

## 10. Troubleshooting

| Gejala | Fix |
|--------|-----|
| `/qa` tidak muncul | Install + **Reload Window**. Cek `.cursor/commands/qa.md` |
| MCP disconnect | `node scripts/setup-mcp.js` · Reload |
| Agent buat skrip PS1 lagi | Ingatkan: pakai `scripts/testrail-tools/` |
| Wrong MCP profile | `node scripts/mcp-mode.js auto` · buka repo test yang benar |
| Path salah setelah onboard | `/qa onboard` atau `onboard-wizard.js --resume` |
| Windows shell error | Settings > Agents > **Legacy Terminal Tool: ON** |

```bash
node scripts/doctor.js
node scripts/validate-paths.js
```

---

## 11. Dokumen lain

| Doc | Isi |
|-----|-----|
| [FIRST_RUN.md](FIRST_RUN.md) | Clone pertama |
| [SETUP.md](SETUP.md) | Install lengkap |
| [MCP.md](MCP.md) | MCP + secrets |
| [DEMO.md](DEMO.md) | Smoke + prompt matrix |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | Backlog enhance + token |
| [CHANGELOG.md](../CHANGELOG.md) | Release notes |
| [AGENTS.md](../AGENTS.md) | DNA agent (dev) |

---

## 12. Safety

- Jangan commit `~/.cursor/mcp.json`, `onboard.md`, `.cursor/qa-memory/`
- Jangan paste secret ke chat
- Agent tidak push git tanpa kamu minta
- TestRail/Shortcut write butuh ACC
