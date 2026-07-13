# Email Templates for QA Defect Triage

---

## 1. Duplicate Notification (Similarity >= 80%)

```
Hi [Name/Team],

Kindly follow the ticket to monitor the issue:

<Ticket Link>

Best regards,
Qando Defect Triage Team
```

**When to use:** A matching ticket with >= 80% similarity is found in Shortcut.

---

## 2. Not a Defect Explanation

```
Hi [Name/Team],

After further discussion with the respective Squad, the reported issue is
currently not considered a Product Defect.

Please refer to supporting references below:

<references>

Thank you for the cooperation and understanding.

Best regards,
Qando Defect Triage Team
```

**When to use:** Classification is Expected Behavior, User Error, Configuration Issue, or Known Limitation.

---

## 3. Evidence Request (Insufficient Information)

Generated automatically when evidence is insufficient (confidence < 70 or missing critical fields).

**When to use:** Step 25 — Evidence Quality Score is Poor/Moderate or key information (environment, repro steps, screenshots) is missing.

*Content is dynamically generated based on specific gaps identified during Missing Information Analysis (Step 2).*
