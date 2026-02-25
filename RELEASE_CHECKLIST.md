# Toplu Alım - Pre-release Checklist

## 1) Security & RLS verification
Use `scripts/rls_smoke_test.sql` in Supabase SQL editor.

### Required checks (must pass)
1. Mobile user cannot `SELECT` from `audit_events`.
2. Mobile user cannot `SELECT` from `pickup_point_entitlements`.
3. User can `SELECT` own profile.
4. User cannot `UPDATE` another user's profile.
5. User can `UPDATE` own profile.
6. User can only insert participant rows for `user_id = auth.uid()`.
7. User cannot update other users' participant rows.
8. Non-owner cannot mark campaigns completed.
9. Owner can mark own campaign completed.
10. Campaign creation rate limit trigger blocks 4th campaign in 24h.

## 2) Billing robustness
- Purchase success should call backend `POST /api/billing/verify`.
- Purchase is acknowledged/completed after successful verify.
- If completion fails, user sees clear error and retry guidance.
- Admin can run `Refresh verification` on entitlement from pickup point detail.

## 3) Anti-abuse
- Campaign creation limit: max 3 per user / 24h.
- Will-come toggle spam protection enabled via trigger.

## 4) Store compliance
- In-app legal links exist: Terms, Privacy.
- Sponsored content disclosure is visible in app legal section.
- README includes Data Safety notes.

## 5) Admin operations
- Sponsorships page lists active and expiring sponsorships.
- Expiring filter (7 days default) works.

## Manual execution notes
- Run queries as User-A and User-B (JWT switched context).
- Record results with timestamp before release sign-off.


## 6) Yerelleştirme kontrolü
- Flutter UI metinleri için `AppLocalizations` kullanın.
- Hızlı kontrol: `scripts/check_no_hardcoded_ui.sh`
