# Akıllı Defter – Akıllı Para Yönetimi / Duo Ledger

Portfolio-grade mobile finance app with two workspaces in one experience:
- **Personal Wallet (Kişisel Cüzdan)**
- **Business Export Ledger (İhracat Defteri)**


## App Name & Icon Metadata
- Primary TR display name: **Akıllı Defter – Akıllı Para Yönetimi**
- Secondary EN name: **Duo Ledger**
- Android label source: `akilli-defter/apps/mobile/android/app/src/main/res/values/strings.xml`
- Adaptive icon sources:
  - Foreground: `akilli-defter/apps/mobile/assets/app_icon/adaptive_foreground_432.png`
  - Background: `akilli-defter/apps/mobile/assets/app_icon/adaptive_background_432.png`
- Play Console icon (512x512): `akilli-defter/apps/mobile/assets/app_icon/icon_512.png`

## Features
- Material 3 design system, dark mode, card-first dashboards
- TR/EN localization (TR default)
- Offline-first local cache + sync
- AI features
  - transaction category suggestion
  - weekly summary
  - overdue collection follow-up drafts (TR+EN)
- Business reporting
  - FX exposure by currency
  - simple scenario simulation (+/- %)
  - deal profitability (expected vs realized margin)
- Guided 3-step in-app tour

## Tech Stack

## Privacy-first Controls
- AI is opt-in on first run (default OFF).
- AI can be toggled anytime from **Settings > Privacy & Security**.
- Data Management includes:
  - Export My Data (JSON response)
  - Delete account and data (`DELETE` confirmation)
  - Attachment storage mode (Cloud only / Device only)
  - Clear local cache (~200MB guidance)
- Legal documentation: `akilli-defter/docs/LEGAL.md`

- **Mobile:** Flutter
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** OpenAI via Supabase Edge Functions
- **Data security:** RLS + workspace role rules + masked AI logs

## Demo Seed Data
### Personal
- 20 transactions
- 5 categories
- 2 budgets

### Business
- 3 contacts
- 2 deals
- 2 invoices
- 3 payment schedules (1 overdue)
- 4 cost allocations

## Local Run
### Flutter
```bash
cd akilli-defter/apps/mobile
flutter pub get
flutter run
```

### Analyze + Test
```bash
cd akilli-defter/apps/mobile
flutter analyze
flutter test
```

### Supabase Local
```bash
cd akilli-defter/backend/supabase
supabase start
supabase db reset
psql postgresql://postgres:postgres@localhost:54322/postgres -f seed/personal_wallet_seed.sql
psql postgresql://postgres:postgres@localhost:54322/postgres -f seed/business_ledger_seed.sql
```

### Edge Functions (Local)
```bash
cd akilli-defter/backend/supabase
supabase functions serve categorize_transaction --no-verify-jwt
supabase functions serve weekly_summary --no-verify-jwt
supabase functions serve collection_message --no-verify-jwt
supabase functions serve account_data_rights --no-verify-jwt
supabase functions serve entitlements --no-verify-jwt
supabase functions serve billing_manage --no-verify-jwt
supabase functions serve billing_webhook --no-verify-jwt
supabase functions serve ai_proxy --no-verify-jwt
```

## Guided Tour Verification (3 Steps)
1. **Add transaction with AI suggestion**
   - Personal Wallet → Transactions → Add Transaction → AI category suggestion.
2. **View weekly AI summary**
   - Personal Wallet → Home → AI Insight card.
3. **Overdue collection follow-up message**
   - Switch to Business → Collections → overdue item → Suggest follow-up message.

## Screenshots Checklist
- [ ] Auth screen (TR)
- [ ] Personal Home (light)
- [ ] Personal Home (dark)
- [ ] Add Transaction + AI suggestion state
- [ ] Business Home FX Exposure card
- [ ] Business Collections overdue + follow-up draft modal
- [ ] Reports screen (profitability + reporting currency)
- [ ] Settings language switch (TR/EN)

## Notes
- Accountant role can only use Business workspace.
- If AI is unavailable, fallback copy keeps flows usable.
- See `docs/DEMO_SCRIPT.md` for 2-minute TR/EN talk track.
- See `docs/ARCHITECTURE.md` for module and data flow diagrams.


## How to verify locally (Compliance)
1. Open app fresh (clear prefs) and confirm first-run privacy consent is shown.
2. Keep AI toggle OFF and sign in; verify app still works and AI suggestion/summary gracefully fallback.
3. Go to Settings and open:
   - Privacy & Security
   - Terms of Use
   - Privacy Policy
   - AI Disclaimer
   - Data Management
4. Data Management:
   - Trigger **Export My Data** (requires Supabase + function `account_data_rights`).
   - Trigger **Delete account and all data** and confirm with `DELETE`.
   - Use **Clear Local Cache** and confirm snackbar.
5. Verify AI edge logs in DB only include metadata (`feature_name`, `prompt_version`, `success`, `latency_ms`).
6. Run RLS checks documented in `docs/LEGAL.md` and migrations.


## Monetization & Feature Gating
- Plans: FREE, PERSONAL_PREMIUM, BUSINESS.
- Single source of truth: `EntitlementService` + `entitlements` edge function.
- FREE: Business demo read-only, cloud sync/export/device lock locked, AI monthly quotas 30/2/10/0.
- PERSONAL_PREMIUM: Personal full, Business demo read-only, AI monthly quotas 300/5/100/0.
- BUSINESS: Business full access, Personal disabled by default, AI monthly quotas 500/5/300/200.


## Coupon / Promo Code Flow (Google Play)
- Promo codes are redeemed in **Google Play Store**, not validated directly in-app.
- In-app path: **Settings > Kupon / Promosyon Kodu**
  - Tap **Satın alımı geri yükle**
  - Tap **Durumu yenile**
- Detailed guide: `akilli-defter/docs/COUPONS.md`


## Play Compliance Artifacts
- Privacy policy URL placeholder: `https://example.com/privacy-policy`
- Account deletion URL placeholder: `https://example.com/account-deletion-request`
- Compliance doc: `akilli-defter/docs/PLAY_COMPLIANCE.md`
- Public deletion page template: `akilli-defter/docs/public/account-deletion-request.html`


## Crash Reporting
- Firebase Crashlytics integrated for Android runtime crash reporting.
- Hidden debug-only action in Settings: **(Gizli) Test çökmesi gönder**.
- Setup and symbol/deobfuscation steps: `akilli-defter/docs/CRASH_REPORTING.md`


## Billing Verification
- Server-side billing verification is the source of truth for entitlements.
- Webhook processor: `akilli-defter/backend/supabase/functions/billing_webhook`
- Guide + internal testing steps: `akilli-defter/docs/BILLING_VERIFICATION.md`


## AI Daily Quota (Server-side)
- AI requests are routed through `ai_proxy` (Edge Function).
- Daily limits (from profile plan):
  - `free`: 2 requests/day, 1500 tokens/day
  - `pro`: 50 requests/day, 50000 tokens/day
- Quota table: `ai_usage_daily` with service-role writes only and owner-read policy.
- When quota is exceeded, backend returns `quota_exceeded` with a gentle Turkish upgrade message.
- Rate limit (per minute):
  - `free`: 2 istek/dk (kullanıcı)
  - `pro`: 10 istek/dk (kullanıcı)
  - tüm planlar: 30 istek/dk (IP)
- Rate limit aşımında backend `429` + `rate_limited` döner ve TR mesaj gösterilir.
- Varsayılan model `MODEL_NAME` env var ile yönetilir (fallback: `gpt-4o-mini`).
- Çıktı token üst sınırı plana göre uygulanır: `free` en fazla 250, `pro` en fazla 600.
- Uzun giriş metinleri sunucuda 4000 karaktere kırpılır ve sonuna `[KISALTILDI]` eklenir.
- Sistem istemi varsayılanı: `Kısa ve net cevap ver. En fazla 6 madde.`

## Mini Admin Panel (MVP)
- Gizli giriş: **Ayarlar** ekranındaki sürüm etiketine (`v0.1.0+1`) 7 kez dokun.
- Panel yalnızca admin e-postalarına açıktır.
- Admin e-posta listesi: `akilli-defter/apps/mobile/lib/core/admin/admin_config.dart`
- Çevrimdışı durumda panel `Bağlantı yok` gösterir ve yerel metriklerle çalışır.

## VIP Plan Notu
- Planlar: `FREE`, `TRIAL`, `PRO`, `VIP`.
- VIP, Pro'dan yüksek ama sınırlı AI kotası kullanır: `200 requests/day`, `200000 tokens/day`.
- VIP/plan atama işlemleri `admin_plan` edge function üzerinden server-side yapılır.
