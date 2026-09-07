# Radyo Günlüğüm — V3.8.4 Direct Legacy Cleanup

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

`index.html` artık uygulamaya ait doğrudan JavaScriptlerde yalnız şu zinciri kullanır:

`core.js → app-core-bridge.js → app-bootstrap.js`

`app-core-bridge.js`, feature katmanlarından önce çekirdek fonksiyonların temiz referanslarını saklar. `app-bootstrap.js` modern feature modüllerini deterministik sırada yükler ve `R.boot()` yalnız bir kez çalışır.

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` fonksiyonlarını zincirleme sarmalamamalıdır.

## Aktif production sahipleri

### Çekirdek

- `app-foundation.js` — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- `app-toast.js` — ortak toast bildirimleri
- `app-pwa-install.js` — service worker kaydı ve PWA kurulum istemi
- `app-runtime-core.js` — `R.load`, `R.show`, `R.renderAll`
- `app-router-core.js` — route sahipliği ve public `R.switch`
- `app-record-integrity.js` — frekans / edit / delete bütünlüğü
- `app-offline-service.js` — IndexedDB outbox, `R.queueLog`, `R.syncOutbox`

### Rehber ve dinleme

- `app-current-programs.js` — rehber tablolarını yükleme ve o an aktif yayın motoru
- `app-guide-service.js` — rehber puanlama, geçerlilik/saat kontrolü, kişisel geçmiş etkisi ve yayın tanımlama motoru
- `app-guide-ui.js` / `app-guide.css` — Yayın Rehberi ekranı, filtreler, tanımlama ve forma aktarma
- `app-smart-analyzer.js` — kayıt formundaki rehber tabanlı eşleştirme
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları, denemeler ve Dinleme Modu

### Ses ve dil

- `app-language-service.js` — UI'dan bağımsız otomatik dil tahmini; `R.detect(...)` compatibility API
- `app-audio-ui.js` — MediaRecorder, dosya seçme, private Supabase Storage upload, Web Speech canlı transkript ve forma aktarma
- `app-audio-safety.js` — bağsız ses kurtarma ve kayıtla ilişkilendirme

Audio UI, başarılı upload sonrasında `audio:uploaded` event'i yayınlar. Audio Safety artık mesaj metnini `MutationObserver` ile izlemek yerine bu açık olayı dinler.

### Analiz, harita, takvim ve QSL

- `app-analysis-ui.js` — bant/dil/istasyon dağılımı, ortalama sinyal ve kişisel saat tahminleri
- `app-map-ui.js` — GPS eklenmiş günlük kayıtlarının Leaflet haritası
- `app-calendar-ui.js` — aylık dinleme takvimi ve gün filtresine geçiş
- `app-qsl-service.js` — QSL rapor metni, UTC dönüşümü ve durum güncellemeleri
- `app-qsl-ui.js` — QSL listesi, rapor kopyalama ve durum eylemleri

QSL yazma işlemleri UI'dan doğrudan yapılmaz; `app-qsl-ui.js` `app-qsl-service.js` servisine delegasyon yapar.

### Diğer modern feature'lar

- `app-ai-service.js` / `app-ai-ui.js` — Whisper analiz motoru ve AI ekranı
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-user-services.js` — ayarlar, favoriler ve hatırlatıcılar
- `app-atlas-service.js` / `app-atlas-ui.js` — Atlas hesapları ve Leaflet görünümü
- `app-shell-core.js` — dock, topbar arama, ağ durumu ve ortak tıklamalar
- `app-home-ui.js` — Ana Sayfa
- `app-now-ui.js` — Şu An
- `app-menu-ui.js` — Menü
- `app-quick-log.js` — Hızlı Kayıt
- `app-log-ui.js` — Günlük davranışları
- `app-log-form-ui.js` — ayrıntılı kayıt alanlarının disclosure düzeni
- `app-propagation.js` — Yayılım Asistanı
- `app-memory.js` — Radyo Hafızası
- `v44-search-rebuild.js` — Global Arama
- `app-backup.js` — CSV / JSON metadata yedekleri
- `app-pwa-updates.js` — kullanıcı kontrollü sürüm yenilemesi
- `app-ui-state.js` — URL, geri/ileri, scroll, filtre ve taslak durumu
- `app-smoke.js` — runtime bütünlük kontrolleri

## V3.8.4 — Direct Legacy Cleanup

V3.8.4 ile production'da doğrudan yüklenen son iki büyük legacy feature dosyası olan `audio-smart.js` ve `app-insights.js` tamamen kaldırıldı.

### `audio-smart.js` yerine

Eski dosya aynı yerde şunları taşıyordu:

- MediaRecorder kaydı
- ses dosyası seçme
- Supabase Storage upload
- Web Speech canlı transkript
- dil heuristiği
- eski schedule tabanlı istasyon analiz motoru

Yeni sahiplik:

- dil tahmini → `app-language-service.js`
- ses / upload / transkript UI → `app-audio-ui.js`
- istasyon eşleştirme → mevcut modern `app-smart-analyzer.js`
- bağsız ses güvenliği → `app-audio-safety.js`

Yeni Audio UI istemci tarafında 15 MB dosya sınırını kontrol eder. Gerçek storage güvenliği yine Supabase bucket politikalarıyla birlikte değerlendirilmelidir.

### `app-insights.js` yerine

Eski dosya Analiz, Harita, Takvim, QSL, Rehber render'ı ve eski Home compatibility sink'ini aynı yerde taşıyordu.

Yeni sahiplik:

- Analiz → `app-analysis-ui.js`
- Harita → `app-map-ui.js`
- Takvim → `app-calendar-ui.js`
- QSL iş mantığı → `app-qsl-service.js`
- QSL ekranı → `app-qsl-ui.js`
- Rehber → V3.8.3'te ayrılmış `app-guide-service.js` / `app-guide-ui.js`
- Home → doğrudan `app-home-ui.js`

`app-home-ui.js` kendi `#tab-home` görünümünü oluşturduğu için eski compatibility sink artık yoktur.

## V3.8.3 — Guide Modernization özeti

`v21-guide.js` kaldırıldı. Rehber iş mantığı `app-guide-service.js`, ekran davranışı `app-guide-ui.js` tarafından yönetilir. `R.scoreEntry(...)` ve `R.prefillGuide(...)` uyumluluk giriş noktaları modern sahiplerine yönlenir; eski `R.switch/R.load` wrapper'ları yoktur.

## Mobil/offline altyapı

- Offline IndexedDB kimliği değişmedi: `radio-gunlugum-v22 / outbox`.
- Offline yeni kayıtlar kuyruğa alınır; mevcut kayıt düzenleme çevrimdışıyken engellenir.
- `app-pwa-install.js` service worker ve kurulum isteminin sahibidir.
- `app-toast.js` ortak bildirimleri yönetir.
- `app-log-form-ui.js` gelişmiş kayıt alanlarını sade bir disclosure altında tutar.

## Dinleme veri modeli

`radio_session_attempts` tüm `heard / weak / none` sonuçlarını saklar.

- **Yakaladım / heard:** attempt + normal `radio_logs`
- **Zayıf / weak:** yalnız attempt
- **Yok / none:** yalnız attempt

Normal Günlük gerçek çekimlerle sınırlı kalırken başarısız denemeler Atlas, Radio Memory ve kişisel frekans geçmişinde kullanılabilir.

## Bilinen sınırlar

- AI sonucu doğrulanmış istasyon kimliği değildir.
- Atlas noktaları gerçek verici konumu değil yaklaşık ülke merkezidir.
- İlk Whisper model kullanımında ağ gerekir; private ses URL'si ve Supabase analizi de çevrimiçi bağlantı ister.
- Gerçek radyo sesiyle uçtan uca AI kalite testi mimari/CI başarısından ayrıdır.
- Rehber çizelgeleri tarih alanlarıyla geçerlilik kontrolünden geçer; yeni yayın sezonu verisi otomatik oluşmaz ve ayrıca yüklenmelidir.

## PWA

V3.8.4 cache kimliği:

`v384-direct-legacy-cleanup-20260907-1`

Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri service worker tarafından zorla cache'lenmez. Yeni worker bulunduğunda `app-pwa-updates.js` kullanıcıya yenileme seçeneği sunar.

## Emekliye ayrılan ana legacy dosyalar

`audio-smart.js`, `app-insights.js`, `v21-guide.js`, `v22-mobile.js`, `app-shell.js`, `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, `v30-ai-radio-assistant.js`, V33–V37 stability/audit katmanları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` artık production zincirinde değildir ve repodan kaldırılmıştır.

Eski sürümler gerektiğinde Git geçmişinden incelenebilir.

## Regresyon kontrolleri

GitHub Actions **Radio Foundation Check** şu katmanları uygular:

1. Modern JavaScript modüllerine `node --check`.
2. `tests/foundation-static-check.mjs` — bootstrap/cache/retired dosyalar/core-wrapper yasağı ve feature sahiplikleri.
3. `tests/mobile-services-static-check.mjs` — V22 kaldırma ve offline/PWA servis bütünlüğü.
4. `tests/guide-modernization-static-check.mjs` — V21 kaldırma, Guide Service/UI ayrımı, `prefillGuide`, `scoreEntry` ve identify motoru.
5. `tests/direct-legacy-cleanup-static-check.mjs` — `audio-smart.js` / `app-insights.js` kaldırma, doğrudan script zinciri, Audio/Language/Analysis/Map/Calendar/QSL sahiplikleri ve `audio:uploaded` event entegrasyonu.

Runtime tarafında `app-smoke.js` modern provider'ları kontrol eder.

## Geliştirme kuralı

1. İş mantığını UI'dan ayır.
2. Bir UI dosyasına birden fazla ana ekranın sahipliğini yükleme.
3. Route için `router.register(...)` kullan.
4. Modüller arası iletişimde `R.events` / `R.store` kullan.
5. Çekirdek fonksiyonlara feature wrapper ekleme.
6. Body-wide `MutationObserver` yerine açık event kullan.
7. Sürümü yalnız `app-config.js` üzerinden değiştir.
8. CI ve runtime smoke check'i yeşil tut.
