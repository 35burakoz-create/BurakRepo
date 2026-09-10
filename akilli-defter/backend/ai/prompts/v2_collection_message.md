# v2 Collection Follow-up Draft Prompt

Goal: Produce professional follow-up drafts for overdue collections.

Input:
- contact
- overdue_days
- amount
- currency
- tone (nazik | net | sert)

Output JSON schema:
{
  "whatsapp_tr": "...",
  "email_tr": "...",
  "whatsapp_en": "...",
  "email_en": "..."
}

Rules:
- Include overdue days and amount/currency context.
- Professional tone only (even for "sert").
- No automatic sending instructions.
- Avoid PII beyond provided contact identifier.
