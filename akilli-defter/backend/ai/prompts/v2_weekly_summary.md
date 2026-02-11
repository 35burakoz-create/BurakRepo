# v2 Weekly Summary Prompt

Goal: Generate bilingual weekly wallet summary and actionable items.

Input:
- workspace_id
- date_range {start, end}
- transactions (aggregated)
- budget usage

Output JSON schema:
{
  "summary_text_tr": "...",
  "summary_text_en": "...",
  "action_items": ["...", "...", "..."]
}

Rules:
- Max 3 action items.
- Suggestions must be practical and measurable.
- Avoid PII in summary and actions.
