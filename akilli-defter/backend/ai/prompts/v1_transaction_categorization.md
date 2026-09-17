# v1 Transaction Categorization

Classify a transaction into one of the allowlisted categories.

Constraints:
- Input fields: merchant, memo, amount, currency, workspace_type
- Output JSON only: {"category": "...", "confidence": 0-1, "reason": "..."}
- Never include PII values in the reason.
