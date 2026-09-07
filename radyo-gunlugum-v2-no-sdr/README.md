# Radyo Günlüğüm — V3.8.1 Shell Decomposition

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa / Şu An:** o an dinlenebilecek yayın adayları
- **Dinleme Modu:** sinyal 1–5 ve Yakaladım / Zayıf / Yok
- **Akıllı Dinleme:** oturumlar, kalibrasyon, gizemli yayınlar ve yaklaşan hedefler
- **Günlük / Radyo Hafızası:** kişisel dinleme arşivi ve istasyon/frekans/ülke profilleri
- **Koleksiyon / Atlas:** rozetler, ülke koleksiyonu, yaklaşık yön ve mesafe analizi
- **Yayılım Asistanı:** gray-line, NOAA SWPC ve kişisel geçmiş
- **AI Ses Analizi:** cihazda Whisper transkripsiyonu ve açıklanabilir istasyon/program adayları
- **Global Arama / QSL / Takvim / Analiz / Harita** araçları

## Başlangıç mimarisi

`index.html` temel bağımlılıkları yükler, `app-bootstrap.js` feature modüllerini deterministik sırada başlatır ve `R.boot()` yalnız bir kez çalışır. `app-core-bridge.js` feature katmanları gelmeden önce çekirdek fonksiyonların temiz referanslarını saklar.

## Aktif production sahipleri

- `app-foundation.js` — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- `app-runtime-core.js` — `R.load`, `R.show`, `R.renderAll`
- `app-router-core.js` — route sahipliği ve public `R.switch`
- `app-current-programs.js` — aktif yayın penceresi hesap motoru
- `app-record-integrity.js` — frekans / edit / delete bütünlüğü
- `app-smart-analyzer.js` — rehber tabanlı eşleştirme
- `app-ai-service.js` / `app-ai-ui.js` — Whisper analiz motoru ve AI ekranı
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları ve Dinleme Modu
- `app-atlas-service.js` / `app-atlas-ui.js` — Atlas hesapları ve Leaflet görünümü
- `app-user-services.js` — ayarlar, favoriler, hatırlatıcılar
- `app-shell-core.js` — alt dock, topbar arama kısayolu, ağ durumu ve ortak route/dinleme tıklamaları
- `app-home-ui.js` — Ana Sayfa route ve görünümü
- `app-now-ui.js` — Şu An route, bant filtresi ve yayın listesi
- `app-menu-ui.js` — Menü sheet'i, ayarlar/favoriler/hatırlatıcılar ve route eylemleri
- `app-quick-log.js` — Hızlı Kayıt akışı
- `app-log-ui.js` — Günlük üst barı, kart açma ve filtre görünümü
- `app-propagation.js` — Yayılım Asistanı
- `app-memory.js` — Radyo Hafızası
- `v44-search-rebuild.js` — Global Arama
- `app-audio-safety.js` — bağsız ses kurtarma
- `app-backup.js` — CSV / JSON metadata yedekleri
- `app-pwa-updates.js` — kullanıcı kontrollü sürüm yenilemesi
- `app-ui-state.js` — URL, geri/ileri, scroll, filtre ve taslak durumu
- `app-smoke.js` — runtime bütünlük kontrolleri

Feature modülleri çekirdek `R.switch`, `R.load`, `R.show` veya `R.renderAll` fonksiyonlarını zincirleme sarmalamamalıdır.

## V3.8.1 Shell Decomposition

Eski `app-shell.js` tek dosyada Ana Sayfa, Şu An, Menü, Quick Log, Günlük dekorasyonu, dock, ağ durumu ve ortak click delegation görevlerini birlikte taşıyordu. V3.8.1'de bu dosya production bootstrap/cache zincirinden çıkarıldı ve fiziksel olarak kaldırıldı.

Yeni sahiplik:

- **Shell Core:** yalnız ortak chrome ve ortak tıklamalar
- **Home UI:** yalnız Ana Sayfa
- **Now UI:** yalnız Şu An
- **Menu UI:** yalnız Menü / favorites / reminders / settings actions
- **Quick Log:** yalnız hızlı kayıt
- **Log UI:** yalnız Günlük görünüm davranışları

Bu ayrım bir Home düzenlemesinin Menü veya Quick Log davranışını istemeden bozma riskini azaltır. `R.shell` yalnız eski dış çağrılar için ince bir compatibility facade olarak `app-shell-core.js` içinde kalır; gerçek sahiplik alt modüllerdedir.

### V24 compatibility köprüsü kaldırıldı

Collection UI artık gizli `#v24All` butonu üretmez. Menü → Başarılar doğrudan `R.openAchievements()` çağırır. Runtime'da V24 adına bağlı koleksiyon giriş noktası kalmamıştır.

### Quick Log bütünlüğü

`app-quick-log.js` frekansı doğrudan `app-record-integrity.js` içindeki `R.validateFrequency(...)` ile doğrular. Bu nedenle örneğin kısa dalgada MHz biçiminde girilen uygun değerler kanonik kHz değerine normalize edilebilir. Konum varsayılanı `app-config.js` içindeki Bozköy/Torbalı referansından gelir.

## AI mimarisi

`app-ai-service.js` UI üretmeden şu işlerin sahibidir:

- `radio_ai_analyses` yükleme / oluşturma / güncelleme
- private `radio-audio` signed URL
- `@huggingface/transformers@4.2.0`
- `Xenova/whisper-tiny`
- WebGPU denemesi ve WASM/CPU fallback
- Whisper transkripsiyonu
- otomatik dil tahmini
- rehber + frekans + saat + dil + transkript + geçmiş tabanlı aday skorlama
- program tahmini, evidence ve confidence
- aday seçme ve günlük kaydına uygulama

`app-ai-ui.js` yalnız AI ekranını yönetir. AI sonucu doğrulanmış istasyon kimliği değildir. Gerçek radyo sesiyle uçtan uca runtime kalite testi ayrıca yapılmalıdır.

## Dinleme veri modeli

`radio_session_attempts` tüm `heard / weak / none` sonuçlarını saklar.

- **Yakaladım / heard:** attempt + normal `radio_logs`
- **Zayıf / weak:** yalnız attempt
- **Yok / none:** yalnız attempt

Bu sayede başarısız denemeler Atlas, Radio Memory ve kişisel frekans geçmişinde kullanılabilirken normal Günlük gerçek çekimlerle sınırlı kalır.

## Atlas ve Collection

`app-atlas-service.js` ülke, saat, frekans, bant, yaklaşık mesafe ve azimut hesaplarını UI'dan ayırır. Atlas noktaları **verici konumu değil ülke merkezidir**. Referans sırası: manuel konum → GPS'li günlük kaydı → Bozköy/Torbalı config konumu.

`app-achievements-service.js` 24 başarı tanımını ve rozet senkronizasyonunu yönetir. Collection UI rozet / ülke / dil / istasyon / seri ilerlemesini gösterir.

## PWA güncellemeleri

Yeni service worker kontrolü aldığında uygulama zorla reload olmaz. `app-pwa-updates.js` kullanıcıya **Sonra** veya **Şimdi yenile** seçeneği sunar.

V3.8.1 cache kimliği:

`v381-shell-decomposition-20260907-1`

Yeni shell modüllerinin tamamı PWA cache'e dahildir; `app-shell.js` dahil değildir. Supabase, NOAA SWPC ve Hugging Face model/canlı istekleri service worker tarafından zorla cache'lenmez.

## Emekliye ayrılan legacy feature dosyaları

V3.8.1 ile `app-shell.js` da kaldırıldı. Daha önce kaldırılan ana katmanlar arasında `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, `v30-ai-radio-assistant.js`, V33–V37 stability/audit dosyaları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` bulunur.

Eski kod Git geçmişinden geri alınabilir; production bootstrap ve PWA cache bu dosyaları kullanmaz.

## Tanı ve regresyon kontrolleri

`app-smoke.js` aktif provider'ları ve Home / Now / Menu / Quick Log / Log / Smart / Atlas / AI / Propagation route ve servislerini kontrol eder. Ayrıca gizli `#v24All` compatibility öğesinin artık bulunmadığını doğrular.

GitHub Actions **Radio Foundation Check** artık yeni shell dosyalarını doğrudan `node --check` ile kontrol eder. `tests/foundation-static-check.mjs` ayrıca:

- bootstrap sırası
- service worker cache listesi
- retired dosyaların fiziksel olarak kaldırılması
- core wrapper yasağı
- Home/Now/Menu/Quick Log/Log sahiplik ayrımı
- Collection tarafında V24 bridge bulunmaması
- AI / Listening / Atlas service-UI ayrımı

üzerinde regresyon kontrolü yapar.

## Geliştirme kuralı

1. İş mantığını UI'dan ayır.
2. Bir UI dosyasına birden fazla ana ekranın sahipliğini yükleme.
3. Mevcut Foundation / feature servisini kullan.
4. Route için `router.register(...)` kullan.
5. Modüller arası iletişimde `R.events` / `R.store` kullan.
6. Çekirdek fonksiyonlara feature wrapper ekleme.
7. Body-wide `MutationObserver` yerine açık event kullan.
8. Sürümü yalnız `app-config.js` üzerinden değiştir.
9. CI ve runtime smoke check'i yeşil tut.
