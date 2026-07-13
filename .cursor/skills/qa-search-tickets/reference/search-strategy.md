# Search Strategy

## AI Query Expansion
Never search only exact words. Generate multiple variations:
- Synonym expansion
- Feature-based variants
- Workflow-based variants
- Object-based variants
- Symptom-based variants

Example — Input: "Cannot add commitment after contract set to none"
Generate: cannot add commitment, commitment blocked, commitment validation, agreement commitment issue, contract none issue, contract update commitment, commitment workflow issue, agreement workflow validation, commitment creation failure, commitment dependency issue

Example — Input: "bug when generating quote"
Generate: generate quote, quote generation, quote calculation, quote rendering, quote creation, quote output, quote workflow, quote generation failure, quote generation issue, quote generation error

## Search Types (execute ALL)
1. **Exact Search** — original wording
2. **Semantic Search** — similar meaning (e.g., "cannot add commitment" ↔ "commitment creation blocked")
3. **Feature Search** — by feature name (e.g., Agreement, Pricing, Product Catalog)
4. **Workflow Search** — by business workflow (e.g., Quote Generation, Commitment Creation)
5. **Object Search** — by impacted object (e.g., Quote, Contract, Commitment, Agreement)
6. **Symptom Search** — by observed behavior (e.g., Save button disabled, Validation error, Cannot create)
7. **Historical Resolution Search** — tickets with similar outcomes

## Search Scope
- ALL work item types: Defect, Story, Chore, Task, Need Help, Investigation, Spike, Enhancement, Technical Debt, RCA, Incident
- ALL statuses: Open, Closed, Completed, Archived

## Result Analysis
For every result, analyze: Title, Description, Labels, Workflow, Feature, Objects, Tags, Ownership, Resolution. Then determine relevance.

## Similarity Scoring
| Score | Label |
|-------|-------|
| 100% | Exact Match |
| 90-99% | Extremely Similar |
| 80-89% | Highly Relevant |
| 70-79% | Related |
| 60-69% | Possibly Relevant |
| Below 60% | Low Relevance |

## Similarity Factors
- Feature Match: 25%
- Workflow Match: 25%
- Object Match: 15%
- Symptom Match: 20%
- Business Intent Match: 15%

Always explain WHY. Example:
Similarity: 94% — ✅ Same Agreement feature, ✅ Same Commitment workflow, ✅ Same user action, ✅ Same symptom, ✅ Similar root cause investigation

## Ownership Prediction
Predict based on: Historical ownership, Assignees, Labels, Similar tickets

## Smart Clustering
Group results by: Defects, Stories, Chores, Investigations, Need Help, Enhancements

## Related Ticket Discovery
Relationship types: Exact Duplicate, Similar Issue, Previous Investigation, Related Defect, Same Feature, Same Workflow, Possible Root Cause Match, Dependency

## Historical Pattern Analysis
If enough results: Most Common Squads, Most Common Root Causes, Most Common Resolutions, Recurring Patterns

## Recommendation Engine
Determine: Most Relevant Ticket, Top 3 Tickets To Review, Most Relevant Investigation, Most Relevant RCA, Most Likely Ownership
