---
name: qa-token-saver
description: YAGNI decision ladder before generating tests. Use for save tokens, YAGNI, or before Cypress/Karate/k6 codegen.
---

# QA Token Saver

**Best test = the one you never had to write.** Justify every case.

## Flow

1. Needed now? No > skip (YAGNI). Simpler? Yes > KISS. Seen 3x? Yes > shared helper
2. Climb: YAGNI > Reuse > Stdlib > Native > Existing dep > One-liner > Minimum > Reflexion before preview
3. Modes: Lite (default) | Full | Ultra

Detail rungs + examples: `.cursor/references/qa-token-saver-ladder.md` + `coding-principles.mdc`. Record decision before generate.
