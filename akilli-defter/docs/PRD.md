# Akıllı Defter / Duo Ledger — Product Requirements (MVP)

## 1) Product Vision
Akıllı Defter (TR) / Duo Ledger (EN), kişisel ve ihracat finans yönetimini tek mobil uygulamada birleştirir.

## 2) Target Users
- Bireysel kullanıcılar (Personal Wallet)
- KOBİ ihracat ekipleri (Business Export Ledger)

## 3) MVP Scope
- Auth + workspace switch
- Dashboard (card-first)
- Multi-currency accounts (TRY/USD/EUR)
- Transaction tracking (income/expense/transfer)
- Business collection tracking (deals, invoices, payment schedules)
- AI features: categorization, weekly summary, follow-up drafts, safe NLQ
- Offline-first local cache + sync layer

## 4) Non-functional Requirements
- Material 3, dark mode
- TR default, EN optional
- RLS policies with owner/member/accountant roles
- Accountant cannot access personal workspace
- AI logging with PII masking

## 5) Acceptance Criteria for First Milestone
1. Flutter app builds and opens auth + workspace switch flow.
2. Settings language toggle supports TR/EN with >=20 localized strings.
3. Dark mode is readable and consistent for auth/dashboard/settings.
4. Repo includes Supabase migrations, seed demo data, and versioned prompts.
