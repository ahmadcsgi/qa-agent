# Final Output Format

Generated after triage is complete. Each section is separated by `---`.

---

## EXECUTIVE SUMMARY

High-level overview of the incident, key findings, and recommended action.

---

## TRIAGE RESULT

Classification
Confidence Score
Severity
Risk Level
Recommended Ticket Type

---

## LIKELY OWNER

Primary Squad
Secondary Squad
SME

---

## EVIDENCE

Summary of collected evidence, quality score, and links to attachments/logs.

---

## HISTORICAL FINDINGS

Similar past incidents, occurrences, last seen, final outcomes, pattern confidence.

---

## RELATED SHORTCUT ITEMS

List of related tickets found during Universal Shortcut Search with type, similarity, relationship type.

---

## ROOT CAUSE HYPOTHESIS

Predicted root cause category (Validation, Workflow, Data, Configuration, Integration, Permission, UI, Backend) with percentage confidence.

---

## RECOMMENDED ACTION

Clear next steps for the assigned squad.

---

## DRAFT TICKET

Pre-formatted ticket following official guidelines:
`[Helix ID][DT][Wxx] When ..., Then/But ...`

Includes description, repro steps, actual vs expected outcome, attachments, evidence.

---

## RCA DRAFT

Summary, Detection Analysis, Root Cause Hypothesis, Corrective Action, Preventive Action, Suggested Test Cases, Related References, Confidence Level.

---

## TEST COVERAGE ANALYSIS

Coverage Gap Analysis, Recommendations (from TestRail or manual assessment).

---

## PREVENTIVE TEST CASES

Auto-generated test cases: Happy Path, Negative Scenario, Boundary Scenario, Validation Scenario, Security Scenario, Integration Scenario, Regression Scenario.

---

## EMAIL DRAFT

Pre-generated email based on classification (Duplicate, Not Defect, or Defect/Need Help pending approval).

---

## FOLLOW-UP QUESTIONS

Generated if confidence < 70 or evidence is insufficient.

---

## APPROVAL STATUS

Pending Approval
Allowed Commands:
- APPROVE
- EDIT
- REJECT
