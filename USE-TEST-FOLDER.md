# QA Agent canonical folder moved

Daily work and `/qa` should use:

`C:\Users\ubaahm01\OneDrive - CSG Systems Inc\Documents\Test\qa-agent`

This `Documents\AI\qa-agent` clone shares the same git remote and **one** `proj ensure` project id. Opening both folders makes `proj ensure` flip the registered path and doubles sessionStart MCP work, which feels like hangs.

Private memory and `onboard.md` were copied to the Test folder on 2026-09-21. Prefer opening only the Test workspace in Cursor.
