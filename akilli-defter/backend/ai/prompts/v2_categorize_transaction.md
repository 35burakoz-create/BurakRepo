# v2 Categorize Transaction Prompt

Goal: Suggest the best category for a transaction.

Input:
- text
- merchant
- amount
- currency
- locale (tr/en)

Output JSON schema:
{
  "category_name": "string",
  "confidence": 0.0,
  "explanation": "short non-PII explanation"
}

Rules:
- Do not include names, email, phone, account numbers, or full addresses.
- Keep explanation under 120 chars.
- If unsure, return category_name as "Genel" with lower confidence.
