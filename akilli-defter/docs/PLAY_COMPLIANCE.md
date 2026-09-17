# Play Compliance Checklist (Akıllı Defter / Duo Ledger)

## Public URLs (placeholders)
- Privacy Policy URL: `https://example.com/privacy-policy`
- Account Deletion URL: `https://example.com/account-deletion-request`

> Not: Repo içinde örnek sayfa: `akilli-defter/docs/public/account-deletion-request.html`

## In-app discoverability
- Settings > **Hesap** > **Hesabı ve tüm verileri sil**
- Web deletion request link is shown in the same screen.

## Data Safety form (high-level checklist)
- [ ] What data is collected? (account info, financial records, app preferences)
- [ ] Is data shared? (only as required for processors/services)
- [ ] Is data encrypted in transit? (HTTPS/TLS)
- [ ] Can users request deletion? (in-app + web URL)
- [ ] Is data required for core functionality? (state per category)
- [ ] Are optional features clearly disclosed? (AI toggle/consent)

## Notes for release prep
- Replace placeholder URLs with production domain URLs.
- Ensure privacy policy includes retention, deletion SLA, and contact details.
- Ensure account deletion URL is reachable without app login (Play policy expectation).
