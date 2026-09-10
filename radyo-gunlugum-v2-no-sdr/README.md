# Radyo Günlüğüm — V3.8.5 Core Boundary Cleanup

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa / Şu An:** o an denenebilecek yayın adayları
- **Yayın Rehberi:** SW/MW/FM hedefleri, aktif yayın filtresi ve “Bu yayın ne olabilir?” eşleştirmesi
- **Ses & Akıllı:** kısa ses kaydı, dosya yükleme, canlı transkript ve rehber tabanlı analiz
- **Dinleme Modu:** sinyal 1–5 ve Yakaladım / Zayıf / Yok
- **Akıllı Dinleme:** oturumlar, kalibrasyon, gizemli yayınlar ve yaklaşan hedefler
- **Günlük / Radyo Hafızası:** kişisel dinleme arşivi ve istasyon/frekans/ülke profilleri
- **Analiz / Harita / Takvim / QSL:** kişisel istatistikler, GPS kayıtları, gün bazlı arşiv ve QSL takibi
- **Koleksiyon / Atlas:** rozetler, ülke koleksiyonu, yaklaşık yön ve mesafe analizi
- **Yayılım Asistanı:** gray-line, NOAA SWPC ve kişisel geçmiş
- **AI Ses Analizi:** Whisper transkripsiyonu ve açıklanabilir istasyon/program adayları

## Başlangıç mimarisi

`index.html` uygulamaya ait doğrudan JavaScriptlerde yalnız şu zinciri kullanır:

`app-config.js → core.js → app-bootstrap.js`

`core.js` artık yalnızca `window.R` namespace'i, Supabase istemcisi, ortak state ve küçük yardımcı fonksiyonları sağlar. Auth, veri sorguları, route, render, kayıt CRUD, form davranışı ve UI event listener'ları core içinde değildir.

`app-core-bridge.js` V3.8.5 ile tamamen kaldırılmıştır. `app-bootstrap.js` modern modülleri deterministik sırada yükler ve `R.boot()` yalnız bir kez Auth Service tarafından sağlanır.

## V3.8.5 — Core Boundary Cleanup

V3.8.5 ile legacy çekirdeğin sorumlulukları ayrıldı:

- `app-auth-service.js` — session, sign-in/sign-up/sign-out ve uygulama boot'u
- `app-auth-ui.js` — giriş/kayıt/çıkış ekranı
- `app-runtime-core.js` — `radio_logs` ve `station_schedules` veri yükleme + render event akışı
- `app-router-core.js` — gerçek DOM route geçişi ve public `R.switch`
- `app-record-service.js` — `radio_logs` CRUD ve private ses için signed URL
- `app-record-integrity.js` — yalnız bant/frekans doğrulama ve normalizasyon
- `app-log-form-ui.js` — form serialize/save/edit/reset/GPS/frekans UI
- `app-log-ui.js` — stats, filtreler, kayıt kartları ve kayıt aksiyonları
- `app-ui-state.js` — form reset wrapper'ı yerine `form:reset` event'i ile taslak temizliği

Quick Log normal kayıtlarla aynı `app-record-service.js` üzerinden yazar. Takvim varsayılan ayı merkezi Clock servisinin `monthKey` değerini kullanır. Audio UI canlı transkript dil seçeneklerinin sahibidir.

## Aktif production sahipleri

### Temel altyapı

- `core.js` — minimal namespace / Supabase client / ortak yardımcılar
- `app-foundation.js` — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- `app-toast.js` — ortak toast bildirimleri
- `app-pwa-install.js` — service worker kaydı ve PWA kurulum istemi
- `app-runtime-core.js` — veri yükleme ve render event akışı
- `app-auth-service.js` / `app-auth-ui.js` — auth ve boot
- `app-router-core.js` — route sahipliği
- `app-record-service.js` — kayıt CRUD
- `app-record-integrity.js` — frekans bütünlüğü
- `app-offline-service.js` — IndexedDB outbox

### Rehber ve dinleme

- `app-current-programs.js` — rehber tablolarını yükleme ve o an aktif yayın motoru
- `app-guide-service.js` — rehber puanlama, geçerlilik/saat kontrolü ve tanımlama motoru
- `app-guide-ui.js` / `app-guide.css` — Rehber ekranı ve forma aktarma
- `app-smart-analyzer.js` — kayıt formundaki rehber tabanlı eşleştirme
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları ve Dinleme Modu

### Ses, AI ve analiz

- `app-language-service.js` — UI'dan bağımsız otomatik dil tahmini
- `app-audio-ui.js` — MediaRecorder, dosya seçme, private Supabase Storage upload ve Web Speech
- `app-audio-safety.js` — bağsız ses kurtarma
- `app-ai-service.js` / `app-ai-ui.js` — Whisper analiz motoru ve AI ekranı
- `app-analysis-ui.js` — kişisel istatistikler
- `app-map-ui.js` — GPS kayıt haritası
- `app-calendar-ui.js` — dinleme takvimi
- `app-qsl-service.js` / `app-qsl-ui.js` — QSL iş mantığı ve ekranı

### Shell ve koleksiyon

- `app-shell-core.js` — dock, topbar arama, ağ durumu ve ortak tıklamalar
- `app-menu-ui.js` — Menü
- `app-home-ui.js` — Ana Sayfa
- `app-now-ui.js` — Şu An
- `app-quick-log.js` — Hızlı Kayıt
- `app-log-ui.js` — Günlük
- `app-log-form-ui.js` — kayıt formu
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-user-services.js` — ayarlar, favoriler ve hatırlatıcılar
- `app-atlas-service.js` / `app-atlas-ui.js` — Atlas
- `app-propagation.js` — Yayılım Asistanı
- `app-memory.js` — Radyo Hafızası
- `v44-search-rebuild.js` — Global Arama
- `app-backup.js` — CSV / JSON metadata yedekleri
- `app-pwa-updates.js` — kullanıcı kontrollü sürüm yenilemesi
- `app-ui-state.js` — URL, geri/ileri, scroll, filtre ve taslak durumu
- `app-smoke.js` — runtime bütünlük kontrolleri

## Mobil/offline altyapı

- Offline IndexedDB kimliği korunur: `radio-gunlugum-v22 / outbox`.
- Offline yeni kayıtlar kuyruğa alınır; mevcut kayıt düzenleme çevrimdışıyken engellenir.
- Yeni worker bulunduğunda zorunlu sayfa yenilemek yerine kullanıcıya **Şimdi yenile / Sonra** seçeneği sunulur.

## Dinleme veri modeli

`radio_session_attempts` tüm `heard / weak / none` sonuçlarını saklar.

- **Yakaladım / heard:** attempt + normal `radio_logs`
- **Zayıf / weak:** yalnız attempt
- **Yok / none:** yalnız attempt

## Bilinen sınırlar

- AI sonucu doğrulanmış istasyon kimliği değildir.
- Atlas noktaları gerçek verici konumu değil yaklaşık ülke merkezidir.
- İlk Whisper model kullanımında ağ gerekir; private ses URL'si ve Supabase analizi de çevrimiçi bağlantı ister.
- Gerçek radyo sesiyle uçtan uca AI kalite testi mimari/CI başarısından ayrıdır.
- Rehber sezon verileri otomatik oluşmaz; yeni yayın sezonu ayrıca yüklenmelidir.

## PWA

V3.8.5 cache kimliği:

`v385-core-boundary-20260907-1`

Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri service worker tarafından zorla cache'lenmez.

## Emekliye ayrılan ana legacy dosyalar

`app-core-bridge.js`, `audio-smart.js`, `app-insights.js`, `v21-guide.js`, `v22-mobile.js`, `app-shell.js`, `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, `v30-ai-radio-assistant.js`, V33–V37 stability/audit katmanları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` artık production zincirinde değildir ve repodan kaldırılmıştır.

## Regresyon kontrolleri

GitHub Actions **Radio Foundation Check** şu katmanları uygular:

1. Modern JavaScript modüllerine `node --check`.
2. Foundation architecture regression checks.
3. Mobile services regression checks.
4. Guide modernization regression checks.
5. Direct legacy cleanup regression checks.
6. Core boundary regression checks.

Runtime tarafında `app-smoke.js` modern provider'ları kontrol eder.

## Geliştirme kuralı

1. İş mantığını UI'dan ayır.
2. Bir UI dosyasına birden fazla ana ekran sahipliği yükleme.
3. Route için `router.register(...)` kullan.
4. Modüller arası iletişimde `R.events` / `R.store` kullan.
5. Core'u feature kodundan uzak tut.
6. Çekirdek fonksiyonlara wrapper ekleme.
7. Body-wide `MutationObserver` yerine açık event kullan.
8. Sürümü yalnız `app-config.js` üzerinden değiştir.
9. CI ve runtime smoke check'i yeşil tut.
