# tire_toplu_alim

Minimal Flutter MVP scaffold for **Toplu Alım**.

> Tire'de başladı, yeni şehirler yakında.

## Structure

```text
lib/
  app_config.dart
  main.dart
  models/
  services/
  screens/
    home_screen.dart
    profile_screen.dart
  widgets/
supabase/
  schema.sql
README.md
```

## Included in this task
- Material 3 theme
- Home screen placeholder with empty state
- Profile screen placeholder
- Supabase config placeholder file (`lib/app_config.dart`)

## Setup & Build APK (Windows only)

### 1) Install Flutter manually
1. Download Flutter SDK ZIP (stable, Windows).
2. Extract to: `C:\src\flutter`
3. Add to PATH: `C:\src\flutter\bin`
4. Open a new PowerShell and validate:

```powershell
flutter --version
where flutter
```

### 2) Required dependencies
- **Git for Windows** (required by Flutter tooling)
- **Android Studio** + SDK Manager components:
  - Android SDK
  - Android SDK Platform
  - Android SDK Command-line Tools
  - Android SDK Build-Tools

Validate setup:

```powershell
git --version
flutter doctor -v
flutter doctor --android-licenses
```

### 3) Common failure fixes (copy-paste)

**Flutter PATH not set**
```powershell
where flutter
$env:Path += ";C:\src\flutter\bin"
```

**Git missing**
```powershell
git --version
```
(Install Git for Windows if command is not found.)

**Android licenses not accepted**
```powershell
flutter doctor --android-licenses
```

**PowerShell script restrictions**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Android SDK path variable missing**
```powershell
setx ANDROID_SDK_ROOT "$env:LOCALAPPDATA\Android\Sdk"
```
Then restart terminal and re-run:
```powershell
flutter doctor -v
```

### 4) Run and build commands

```powershell
flutter pub get
flutter run
flutter build apk --debug
flutter build apk --release
```

APK output paths:
- Debug: `build\app\outputs\flutter-apk\app-debug.apk`
- Release: `build\app\outputs\flutter-apk\app-release.apk`

### 5) Official Flutter docs
- Install Flutter: https://docs.flutter.dev/get-started/install/windows
- Add Flutter to PATH: https://docs.flutter.dev/get-started/install/windows/mobile#update-your-path
- Troubleshoot installation: https://docs.flutter.dev/get-started/install/help
- Android setup / deployment: https://docs.flutter.dev/deployment/android

## Supabase
- SQL starter is in `supabase/schema.sql`.
- Replace placeholder values in `lib/app_config.dart` when connecting Supabase.


## Admin Panel (Web)
- Web admin panel kodu `admin/` klasöründedir.
- Tire'de başladı, yeni şehirler yakında yaklaşımına uyumlu olarak city_id tabanlı yönetim içerir.

Windows komutları:
```powershell
cd admin
npm install
npm run dev
```

Gerekli env değişkenleri (`admin/.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (**sadece server-side**)
- `ADMIN_EMAILS` (virgülle allowlist)


## Sponsored (Featured) Campaigns
- Monetization modeli: **Sponsorlu (Featured) Kampanyalar**.
- Uygulama içi ödeme yoktur; sponsorluk yönetimi admin panelinden yapılır.
- Sponsorlu kampanyalar, ana listede aktif sponsor süresi varsa üstte gösterilir.


## PHASE-1 Monetization (20/B uyumlu)
- **Doğrudan ödeme yok**: uygulamada havale/EFT, checkout, kart veya ödeme linki yok.
- **Reklam geliri (AdMob)**: Home ekranında adaptive banner gösterilir (debug test ID, release için `--dart-define` ile ID verilir).
- **Sponsorluk talebi akışı**: Kampanya oluştururken işletmeler sponsorluk talebi bırakabilir (`sponsorship_requests`).
- **Teslim noktası odağı**: `pickup_points` tablosu ile şehir bazlı teslim noktaları listelenir, sponsorlu olanlar üstte görünür.

AdMob release örneği:
```powershell
flutter run --dart-define=ADMOB_HOME_BANNER_ID=ca-app-pub-xxx/yyy --dart-define=ADMOB_DETAIL_BANNER_ID=ca-app-pub-xxx/zzz
```

## PHASE-2 (yalnızca hazırlık/stub)
- Google Play Billing ile "Pickup Point Sponsored Listing" paketleri planlandı.
- Şu an sadece stublar mevcut:
  - `lib/services/billing_service.dart`
  - `admin/app/api/billing/verify/route.ts`
- Gerçek satın alma/doğrulama akışı henüz aktif değildir.


## PHASE-2 Google Play Billing (Pickup Point Sponsorluk)
- Mobilde `Pickup Point Sponsor Paketleri` ekranı (debug modda) ile Play ürünleri listelenir ve satın alma başlatılır.
- Satın alma başarılı olduğunda backend `POST /api/billing/verify` çağrılır.
- Backend Google Play doğrulaması sonrası entitlement + `sponsored_until` güncellemesi yapar.

Gerekli backend env:
- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Test akışı (gerçek cihaz):
1. Play Console'da ürünleri oluştur (`pickup_sponsor_7d`, `pickup_sponsor_30d`).
2. License tester hesabını ekle.
3. Signed Android build'i tester hesabında kur.
4. Uygulamada sponsor paketi satın al.
5. Admin panel pickup point detail sayfasında entitlement ve `sponsored_until` doğrula.


## Play Store Data Safety (özet)
- Toplanan veriler:
  - Hesap kimliği (Supabase auth id)
  - Profil (takma ad, mahalle, city_id)
  - Kampanya/katılım/rapor kayıtları
  - Sponsorluk ve pickup point sponsor entitlement kayıtları (admin/backend)
- Amaç:
  - Uygulama işlevselliği (kampanya oluştur/katıl/takip)
  - Güvenlik, moderasyon ve kötüye kullanım önleme
  - Sponsorluk paket doğrulama ve entitlement yönetimi
- Ödeme verisi:
  - Kart/banka bilgisi uygulama tarafından toplanmaz.
  - Android sponsor paketleri Google Play Billing üzerinden doğrulanır.

## Release doğrulama
- Pre-release kontrol listesi: `RELEASE_CHECKLIST.md`
- RLS smoke test sorguları: `scripts/rls_smoke_test.sql`


## UI yerelleştirme hızlı kontrol
```bash
./scripts/check_no_hardcoded_ui.sh
```
