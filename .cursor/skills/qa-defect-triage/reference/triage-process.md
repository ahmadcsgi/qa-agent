# QA Defect Triage - 28-Step Process

Derived from an internal triage playbook. Customize intake fields in `project-context`.

---

## Step 1 - Incident Intake
Extract: Incident ID, Title, Description, Business Impact, Customer Impact, Environment, Attachments, Screenshots, Videos, Logs, Error Messages, API Payloads, API Responses.

Identify: Order ID, Agreement ID, Contract ID, Customer ID, Product, Timestamp.

---

## Step 2 - Missing Information Analysis
Verify: Environment, Order ID, Product, Customer Impact, Error Message, Screenshot, Recording, Test Data, Reproduction Steps, Timestamp.

Output: Missing Information list, Impact Level, Confidence Reduction.

---

## Step 3 - Evidence Quality Score
| Item | Points |
|------|--------|
| Repro Steps | +20 |
| Screenshot | +15 |
| Video | +20 |
| Error Message | +15 |
| Test Data | +10 |
| Documentation | +20 |

**Result:** 0-39 Poor, 40-69 Moderate, 70-100 Strong.

---

## Step 4 - Duplicate & Related Work Analysis
Search ALL Shortcut artifact types. Perform: Exact Match, Semantic Match, Related Investigation Match, Root Cause Match, Similar Symptom Match, Historical Match.

Output: Potential Matches with Ticket, Type, Similarity, Reason. Relationship: Exact Duplicate, Related Defect, Previous Investigation, Previous RCA, Same Root Cause, Same Feature, Dependency.

**If similarity >= 80%:** Classify as DUPLICATE, generate follow-existing-ticket email, STOP.

---

## Step 5 - Knowledge Investigation
Search: Confluence, Glean, Requirements, User Guides, Product Documentation, Known Limitations, Historical RCA, Design Decisions, Previous Incidents.

Collect links and references.

---

## Step 6 - Historical Intelligence
Search: Historical incidents, RCA, tickets, resolutions.

Output: Historical Similar Cases, Occurrences, Last Seen, Final Outcome, Pattern Confidence.

---

## Step 7 - Defect Pattern Analysis
Analyze historical behavior.

Output: Feature, Number of Historical Issues, Top Root Causes, Top Squads, Recurring Pattern.

---

## Step 8 - Squad Ownership Analysis
Primary reference: Squad Ownership Responsibility page. Fallback: historical Shortcut ownership.

Output: Primary Squad, Secondary Squad, Potential SME, Confidence, Evidence.

---

## Step 9 - Root Cause Hypothesis
Predict category: Validation, Workflow, Data, Configuration, Integration, Permission, UI, Backend.

Provide percentage confidence. Hypothesis only - never claim as final RCA.

---

## Step 10 - Reproducibility Analysis
Evaluate: Repro quality, test data quality, environment quality.

Output: Reproducibility Score - Strong / Medium / Weak.

---

## Step 11 - Auto Reproduction Strategy
If steps are unclear, generate Path A / Path B / Path C. Prioritize highest-probability scenario.

---

## Step 12 - Severity Assessment
Evaluate: Customer Impact, Production Impact, Revenue Impact, Operational Impact, Data Integrity Impact, Security Impact, Workaround Availability.

Recommend: Sev1 / Sev2 / Sev3 / Sev4.

---

## Step 13 - Risk Assessment
Output: Risk Level - Critical / High / Medium / Low. Include Reasoning.

---

## Step 14 - Escalation Analysis
Determine: Escalation Required, Recommended Stakeholders, Reason.

---

## Step 15 - Classification Engine
Classify into ONE: Defect, Need Help, User Error, Expected Behavior, Configuration Issue, Known Limitation, Change Request, Enhancement, Undeveloped Feature.

---

## Step 16 - Defect Confidence Engine
| Item | Points |
|------|--------|
| Requirement Violation | +40 |
| Reproducible | +25 |
| Historical Defect Match | +15 |
| Multi-Customer Impact | +10 |
| Expected Behavior Defined | +10 |
| Doc Supports Current Behavior | -20 |
| Cannot Reproduce | -20 |
| Configuration Suspected | -15 |
| Missing Information | -10 |

**Result:** 70-100 = Defect, 40-69 = Need Help, 0-39 = Not Defect.

---

## Step 17 - Ticket Type Recommendation
Recommend: Defect, Story, Chore, Need Help, Investigation, Enhancement, CR. Explain reasoning.

---

## Step 18 - Decision Logic
- **Expected Behavior / User Error / Configuration Issue / Known Limitation:** Generate "not a defect" explanation email, STOP.
- **Need Help:** Generate draft Need Help ticket, proceed to RCA.
- **Defect:** Generate draft Defect ticket, proceed to RCA + test cases.

---

## Step 19 - Test Coverage Analysis
Determine: Existing Test Coverage, Automation Coverage, Regression Coverage.

Output: Coverage Gap Analysis, Recommendations.

---

## Step 20 - Regression Impact Analysis
Output: Primary Feature, Impacted Features, Regression Scope, Reasoning.

---

## Step 21 - Auto Test Case Generation
Generate: Happy Path, Negative Scenario, Boundary Scenario, Validation Scenario, Security Scenario, Integration Scenario, Regression Scenario. Reference TestRail when applicable.

---

## Step 22 - RCA Generation
Generate: Summary, Detection Analysis, Root Cause Hypothesis, Corrective Action, Preventive Action, Suggested Test Cases, Related References, Confidence Level.

---

## Step 23 - Prevention Engine
Recommend: Process Improvements, Automation Improvements, Documentation Improvements, Monitoring Improvements, Test Improvements. Prioritize actions.

---

## Step 24 - Follow-up Questions
If confidence < 70: Generate missing-information questions automatically.

---

## Step 25 - Evidence Request Email
If evidence insufficient: Generate request email automatically.

---

## Step 26 - Ticket Quality Gate
Validate: Title, Repro Steps, Actual Outcome, Expected Outcome, Attachments, Evidence, Squad Assignment.

Provide Quality Score 0-100. Suggest improvements.

---

## Step 27 - RCA Discovery
Search existing RCA. Output: Potential RCA Matches, Similarity, Lessons Learned.

---

## Step 28 - Learning Loop
When final outcome is known, capture: Final Classification, Final RCA, Resolution, Assigned Squad, Preventive Action.

Compare Predicted vs Actual. Generate: Lessons Learned, Future Recommendations.

---

## Approval Gate
Never create Shortcut ticket automatically. Wait for user decision (number or custom):
1. APPROVE
2. EDIT
3. REJECT
Only after APPROVE: create Shortcut Ticket or Need Help Ticket, generate final email.
