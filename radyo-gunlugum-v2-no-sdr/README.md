# Radyo Günlüğüm — V3.8.3 Guide Modernization

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa / Şu An:** o an denenebilecek yayın adayları
- **Yayın Rehberi:** SW/MW/FM hedefleri, aktif yayın filtresi ve “Bu yayın ne olabilir?” eşleştirmesi
- **Dinleme Modu:** sinyal 1–5 ve Yakaladım / Zayıf / Yok
- **Akıllı Dinleme:** oturumlar, kalibrasyon, gizemli yayınlar ve yaklaşan hedefler
- **Günlük / Radyo Hafızası:** kişisel dinleme arşivi ve istasyon/frekans/ülke profilleri
- **Koleksiyon / Atlas:** rozetler, ülke koleksiyonu, yaklaşık yön ve mesafe analizi
- **Yayılım Asistanı:** gray-line, NOAA SWPC ve kişisel geçmiş
- **AI Ses Analizi:** Whisper transkripsiyonu ve açıklanabilir istasyon/program adayları

## Başlangıç mimarisi

`index.html` temel bağımlılıkları yükler. `app-core-bridge.js` feature katmanlarından önce çekirdek fonksiyonların temiz referanslarını saklar. `app-bootstrap.js` modern feature modüllerini deterministik sırada yükler ve `R.boot()` yalnız bir kez çalışır.

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` fonksiyonlarını zincirleme sarmalamamalıdır.

## Aktif production sahipleri

- `app-foundation.js` — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- `app-toast.js` — ortak toast bildirimleri
- `app-pwa-install.js` — service worker kaydı ve PWA kurulum istemi
- `app-runtime-core.js` — `R.load`, `R.show`, `R.renderAll`
- `app-router-core.js` — route sahipliği ve public `R.switch`
- `app-current-programs.js` — rehber tablolarını yükleme ve o an aktif yayın motoru
- `app-guide-service.js` — rehber puanlama, geçerlilik/saat kontrolü, kişisel geçmiş etkisi ve yayın tanımlama motoru
- `app-guide-ui.js` / `app-guide.css` — Yayın Rehberi route, filtreler, “Bu yayın ne olabilir?”, forma aktarma ve Dinleme Modu geçişleri
- `app-record-integrity.js` — frekans / edit / delete bütünlüğü
- `app-offline-service.js` — offline IndexedDB outbox, `R.queueLog`, `R.syncOutbox`
- `app-smart-analyzer.js` — kayıt formundaki rehber tabanlı eşleştirme
- `app-ai-service.js` / `app-ai-ui.js` — Whisper analiz motoru ve AI ekranı
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-user-services.js` — ayarlar, favoriler ve hatırlatıcılar
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları ve Dinleme Modu
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
- `app-audio-safety.js` — bağsız ses kurtarma
- `app-backup.js` — CSV / JSON metadata yedekleri
- `app-pwa-updates.js` — kullanıcı kontrollü sürüm yenilemesi
- `app-ui-state.js` — URL, geri/ileri, scroll, filtre ve taslak durumu
- `app-smoke.js` — runtime bütünlük kontrolleri

## V3.8.3 — Guide Modernization

Eski `v21-guide.js` tek dosyada rehber veri yükleme, aday puanlama, “Şu An” ekranı, tarama UI'si, `R.prefillGuide`, `R.scoreEntry`, “Bu yayın ne olabilir?” eşleştirmesi ve `R.switch/R.load` wrapper'larını birlikte taşıyordu.

V3.8.3'te bu dosya `index.html`, bootstrap, service worker cache ve repodan tamamen kaldırıldı.

### Guide Service

`app-guide-service.js` DOM üretmez. Şunları yönetir:

- yayın saat aralığı kontrolü
- hafta içi / hafta sonu / Cumartesi / Pazar kuralları
- `valid_from / valid_to` geçerliliği
- SW bant profil etkisi
- geçmiş kişisel çekimlerin aday puanına etkisi
- frekans + metin/dil tabanlı “Bu yayın ne olabilir?” adayları
- filtrelenmiş ve puanlanmış rehber listesi

Eski dış bağımlılıkları kırmamak için `R.scoreEntry(...)` ince compatibility API olarak modern servise yönlendirilir. Gizemli yayın eşleştirmesi bu puanı kullanabilir.

### Guide UI

`app-guide-ui.js` Yayın Rehberi ekranının tek sahibidir:

- bant / frekans / istasyon-dil-ülke araması
- yalnız şu an aktif yayınları gösterme
- aday puanı ve nedenlerini gösterme
- “Bu yayın ne olabilir?” paneli
- SW1–SW10 / MW / FM frekans tanımlama
- rehber kaydını günlük formuna aktarma
- rehber kaydından doğrudan Dinleme Modu'na geçme

`R.prefillGuide(...)` artık bu UI katmanında tanımlanır.

## Rehber verisi

`app-current-programs.js` gerektiğinde doğrudan `guide_entries`, `guide_time_rules` ve `guide_band_profiles` tablolarını yükler. Modern Home/Now ve Guide katmanları eski V21 `R.load` wrapper'ına bağımlı değildir.

A26 gibi tarih aralığı olan rehber kayıtları `valid_from / valid_to` alanları üzerinden değerlendirilir. Çizelge tarihinin geçmesi veriyi otomatik olarak güncellemez; yeni sezon verisinin ayrıca yüklenmesi gerekir.

## V3.8.2'den korunan mobil altyapı

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

## PWA

V3.8.3 cache kimliği:

`v383-guide-modernization-20260907-1`

Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri service worker tarafından zorla cache'lenmez. Yeni worker bulunduğunda `app-pwa-updates.js` kullanıcıya yenileme seçeneği sunar.

## Emekliye ayrılan ana legacy dosyalar

`v21-guide.js`, `v22-mobile.js`, `app-shell.js`, `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, `v30-ai-radio-assistant.js`, V33–V37 stability/audit katmanları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` artık production zincirinde değildir ve repodan kaldırılmıştır.

## Regresyon kontrolleri

GitHub Actions **Radio Foundation Check** şu katmanları uygular:

1. Modern JavaScript modüllerine `node --check`.
2. `tests/foundation-static-check.mjs` — bootstrap/cache/retired dosyalar/core-wrapper yasağı ve sahiplik mimarisi.
3. `tests/mobile-services-static-check.mjs` — V22 kaldırma ve offline/PWA servis bütünlüğü.
4. `tests/guide-modernization-static-check.mjs` — V21 kaldırma, Guide Service/UI ayrımı, `prefillGuide`, `scoreEntry`, identify motoru ve yükleme sırası.

Runtime tarafında `app-smoke.js` Guide Service/UI provider'larını ve Guide route'unu da kontrol eder.

## Geliştirme kuralı

1. İş mantığını UI'dan ayır.
2. Bir UI dosyasına birden fazla ana ekranın sahipliğini yükleme.
3. Route için `router.register(...)` kullan.
4. Modüller arası iletişimde `R.events` / `R.store` kullan.
5. Çekirdek fonksiyonlara feature wrapper ekleme.
6. Body-wide `MutationObserver` yerine açık event kullan.
7. Sürümü yalnız `app-config.js` üzerinden değiştir.
8. CI ve runtime smoke check'i yeşil tut.
