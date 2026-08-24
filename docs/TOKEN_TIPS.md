# Hemat token — tips praktis

Ringkasan user-facing dari `@qa-token-saver`. Agent baca skill ini on demand, bukan setiap chat.

## Aturan emas

1. **Satu tugas = satu skill** (cases ATAU automation ATAU perf)
2. **Sebut ID** (`sc-280793`, `C386217`, run `905`)
3. **Jawab singkat** saat ACC: "ACC batch 1" bukan essay
4. **Buka repo yang benar** supaya MCP path-aware lite di luar test path
5. **`/qa update`** bukan baca CHANGELOG panjang di chat

## Decision ladder (sebelum generate test)

Tanya dari atas ke bawah. Berhenti saat cukup.

| # | Tanya |
|---|-------|
| 1 YAGNI | Sudah ada case/test yang cover ini? |
| 2 Reuse | Ada step def / alias / helper di repo? |
| 3 Stdlib | Cypress/Karate/k6 built-in cukup? |
| 4 Native | Validasi browser/API status cukup? |
| 5 Dep | Utils repo sudah ada? |
| 6 One-liner | Scenario Outline / 1 case cukup? |
| 7 Minimum | Happy path dulu, negatif hanya jika risk tinggi |
| 8 Reflexion | Agent review sendiri sebelum preview |

Mode: `@qa token lite` (default) · `full` · `ultra`

## Context yang jangan dibuang

| Muat | Jangan muat |
|------|-------------|
| AC / error message / case id | Seluruh repo tree |
| Satu story scope | Multi-squad groom sekaligus |
| Preview batch 5 case | 50 case tanpa batch |

## MCP & boot

- Agent `boot` sekali per session task, bukan dump JSON ke chat
- Cache search 24h (`~/.qa-agent/search-cache.json`)
- Glean/Shortcut: search dulu, enrich setelah jawaban (pref `search.fast_first`)

## TestRail bulk

Pakai CLI, bukan chat loop:

```powershell
.\scripts\testrail-tools\tr-get-cases.ps1 -ProjectId 3 -SuiteId 282 -OutFile out.json -Json
```

Refs: [testrail-tools.md](../.cursor/references/testrail-tools.md)
