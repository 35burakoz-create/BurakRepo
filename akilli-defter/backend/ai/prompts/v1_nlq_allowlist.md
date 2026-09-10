# v1 Natural Language Query (Allowlisted)

Translate user question into a safe query plan over allowlisted entities only.

Allowlisted entities:
- transactions, budgets, deals, invoices, payment_schedules, fx_rates

Constraints:
- Return a query plan JSON, not raw SQL.
- Never include DDL/DML operations.
