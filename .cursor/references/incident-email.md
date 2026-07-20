# Incident Email Templates

Placeholders: `[INC-123]` = incident ID, `[STORY-456]` = Shortcut story ID. Customize ID format in `project-context`.

## Duplicate Incident Email
Subject: Duplicate Incident - [INC-123] - Follow existing ticket [STORY-456]

Hi Team,

This incident ([INC-123]) appears to be a duplicate of an existing investigation:

**Existing Ticket:** https://app.shortcut.com/story/456
**Title:** [Story Title]
**Status:** [Open/In Progress/Resolved]
**Similarity:** [85%]

**Reasoning:**
- [Similar symptom/error/feature]

Please track progress on the existing ticket. No new ticket needed.

Thanks,
QA Agent

## Not a Defect - User Error
Subject: [INC-123] - Not a Defect - Expected Behavior

Hi Team,

After investigation, this incident is determined to be **user error / expected behavior**:

**Issue:** [summary]
**Finding:** [explanation why it's expected behavior]
**Resolution:** [what user should do instead]

If you believe this assessment is incorrect, please reply with additional context.

Thanks,
QA Agent

## Not a Defect - Configuration Issue
Subject: [INC-123] - Configuration Issue - Not a System Defect

Hi Team,

This incident is caused by a **configuration/misconfiguration** issue:

**Issue:** [summary]
**Root Cause:** [what was misconfigured]
**Fix:** [steps to correct configuration]

No code change required.

Thanks,
QA Agent

## Defect Confirmation - Draft Ticket
Subject: [INC-123] - Confirmed Defect - New Ticket Created

Hi Team,

This incident has been confirmed as a **defect** and a new Shortcut ticket has been created:

**New Ticket:** https://app.shortcut.com/story/[ID]
**Classification:** Defect
**Severity:** Sev[1-4]
**Squad:** [Squad Name]

**Root Cause (Initial):**
[summary]

**Suggested Test Cases:**
- [TC1]
- [TC2]

Please triage and prioritize accordingly.

Thanks,
QA Agent

## Need Help - Draft Need Help Ticket
Subject: [INC-123] - Need Help - Assistance Required

Hi Team,

This incident requires additional investigation/assistance:

**Issue:** [summary]
**What's Known:** [what we've confirmed]
**Help Needed:** [specific questions or guidance needed]

**Draft Ticket:** https://app.shortcut.com/story/[ID]

Please assign to the appropriate squad for further investigation.

Thanks,
QA Agent
