# Billing Entitlement Verification (Server Source of Truth)

## Goal
Ensure paid access is granted only from **server-verified billing state**.
Client-side actions (purchase/restore taps) only trigger refresh requests; they do not mint entitlements directly.

## Architecture
1. Billing provider event arrives (Google Play / RevenueCat webhook).
2. `billing_webhook` edge function validates secret header and writes:
   - `billing_webhook_events` (audit)
   - `billing_subscriptions` (current verified state)
3. `entitlements` edge function computes effective plan from verified subscription state.
4. Flutter app (`EntitlementService`) fetches entitlements from server and caches locally for offline fallback.

## Key server rules
- `billing_manage` `set_plan` is disabled by default in production.
- Dev-only plan override requires `ALLOW_DEV_BILLING_OVERRIDE=true`.
- Effective plan resolution uses:
  - `entitlement_status` must be `active` or `trialing`
  - `expires_at` must not be expired
- If verification state is missing/invalid, effective plan becomes `free`.

## Required env vars
- `SUPABASE_SERVICE_ROLE_KEY`
- `BILLING_WEBHOOK_SECRET`
- Optional dev-only: `ALLOW_DEV_BILLING_OVERRIDE=true`

## Internal / closed testing checklist
1. Seed a test user in internal/closed testing track.
2. Send a test webhook event to `billing_webhook` with secret header.
3. Call `entitlements` for that user and verify upgraded plan fields.
4. In app, tap restore/refresh and confirm UI unlocks expected features.
5. Send expiration/cancel webhook; verify plan falls back to free on next refresh.
6. Validate `billing_webhook_events` has audit rows for each event.

## Example webhook payload
```json
{
  "event_id": "evt_test_001",
  "provider": "google_play",
  "user_id": "<supabase_user_uuid>",
  "provider_customer_id": "gp_123",
  "plan_type": "business",
  "entitlement_status": "active",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

## Security notes
- Never trust plan state from client payload alone.
- Keep webhook secret only on server side.
- Store raw webhook payload for audit in `billing_webhook_events`.
