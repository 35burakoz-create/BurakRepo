# Toplu Alım Admin Panel (Web)

## Amaç
Web tabanlı yönetim paneli (Next.js) ile kullanıcı/kampanya/rapor/audit görünürlüğü ve sınırlı yönetim işlemleri.

## Güvenlik
- `SUPABASE_SERVICE_ROLE_KEY` **yalnızca server-side** API route'larında kullanılır.
- Browser tarafında sadece:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Admin erişimi: Supabase Auth + `ADMIN_EMAILS` allowlist.

## .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS=admin1@example.com,admin2@example.com
GOOGLE_PLAY_PACKAGE_NAME=com.example.tire_toplu_alim
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## Windows çalıştırma
```powershell
cd admin
npm install
npm run dev
```
Aç: `http://localhost:3000`

## Build
```powershell
cd admin
npm run build
npm run start
```

## Deploy notları
- Vercel veya Node hosting ile çalışır.
- `SUPABASE_SERVICE_ROLE_KEY` environment variable olarak yalnızca server ortamına verin.


## Sponsored campaigns yönetimi
- Campaign detail ekranında `Featured`, `sponsor_name`, `sponsor_until` alanları güncellenebilir.
- Bu işlem `admin_campaign_sponsor_set` audit olayı olarak kaydedilir.


## Sponsorluk ve Teslim Noktası Yönetimi
- `Sponsorluk` ekranı: `sponsorship_requests` listeleme/filtreleme (`city_id`, `type`, `status`, tarih aralığı) ve durum güncelleme.
- `Teslim Noktaları` ekranı: pickup point ekleme, aktif/pasif, `sponsored_until` manuel güncelleme.
- Admin mutasyonları audit'e yazılır (`admin_sponsorship_request_status_set`, `admin_pickup_point_*`).

## Billing doğrulama (PHASE-2 stub)
- Legacy stub endpoint: `POST /api/billing/verify-google-play` (geri uyumluluk için bırakıldı).


## Google Play Billing doğrulama (PHASE-2 aktif)
- Endpoint: `POST /api/billing/verify`
- Google Play Developer API server-side doğrulaması yapar, ardından:
  - `pickup_point_entitlements` upsert edilir
  - `pickup_points.sponsored_until` güncellenir
  - `billing_pickup_point_sponsor_activated` audit kaydı yazılır
- Test için Play Console'da ürünleri oluşturun:
  - `pickup_sponsor_7d`
  - `pickup_sponsor_30d`
- License testers hesabı ile gerçek Android cihazda test edin.


## Operasyon ekranları (pre-release)
- `Sponsorships` sayfası: aktif sponsorluklar ve 7 gün içinde bitecekler için filtre/reminder görünümü.
- Pickup point detayında entitlement satırı bazlı `Refresh verification` aksiyonu.
