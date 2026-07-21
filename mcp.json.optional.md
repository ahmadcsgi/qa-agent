# Optional MCP (k6 + Karate)

Copy entries from `mcp.json.optional.example` into `~/.cursor/mcp.json`, or run:

```bash
node scripts/setup-mcp.js --with-optional
```

| Server | Requires | When to skip |
|--------|----------|--------------|
| **k6** | `k6` on PATH (`k6 x mcp`) | You only generate/run scripts via CLI in `paths.perf_tests` |
| **karate** | Standalone `karate` CLI (`karate mcp --stdio`) | You use **Maven** in `paths.api_tests` (`mvn test`). Typical CSG API repos. |

Install CLIs: `node scripts/setup-tooling.js` (k6, Java, Maven). It does **not** install the standalone karate binary. Skip the karate MCP entry if you do not have it.

Default QA Agent skills do **not** need these MCP servers.
