# Radyo Günlüğüm — V3.8.0 AI Service & UI Separation

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
- `app-ai-service.js` — Whisper, dil tahmini, istasyon/program skorlama ve `radio_ai_analyses`
- `app-ai-ui.js` — AI route ve analiz ekranı
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları ve Dinleme Modu
- `app-atlas-service.js` / `app-atlas-ui.js` — Atlas hesapları ve Leaflet görünümü
- `app-user-services.js` — ayarlar, favoriler, hatırlatıcılar
- `app-shell.js` — Ana Sayfa, Şu An, dock, Menü, Hızlı Kayıt
- `app-propagation.js` — Yayılım Asistanı
- `app-memory.js` — Radyo Hafızası
- `v44-search-rebuild.js` — Global Arama
- `app-audio-safety.js` — bağsız ses kurtarma
- `app-backup.js` — CSV / JSON metadata yedekleri
- `app-pwa-updates.js` — kullanıcı kontrollü sürüm yenilemesi
- `app-ui-state.js` — URL, geri/ileri, scroll, filtre ve taslak durumu
- `app-smoke.js` — runtime bütünlük kontrolleri

Feature modülleri çekirdek `R.switch`, `R.load`, `R.show` veya `R.renderAll` fonksiyonlarını zincirleme sarmalamamalıdır.

## AI mimarisi

V3.8.0'da eski tek-parça V30 modülü iki katmana ayrıldı.

### `app-ai-service.js`

Servis UI üretmez. Şunların sahibidir:

- `radio_ai_analyses` yükleme / oluşturma / güncelleme
- private `radio-audio` için geçici signed URL
- `@huggingface/transformers@4.2.0`
- `Xenova/whisper-tiny`
- WebGPU denemesi ve WASM/CPU fallback
- Whisper transkripsiyonu
- otomatik **dil tahmini**
- rehber + frekans + saat + dil + transkript + geçmiş kayıt tabanlı istasyon adayları
- program tahmini
- açıklanabilir evidence ve güven puanı
- aday seçme
- transkript / smart alanlarını günlük kaydına uygulama

Model ve analiz durumu DOM'a yazılmaz; `ai:model`, `ai:data`, `ai:analysis-start`, `ai:analysis-complete`, `ai:analysis-error`, `ai:applied` ve `ai:candidate-selected` olayları üzerinden yayınlanır.

Dil sonucu heuristik bir otomatik tahmindir; kesin bir Whisper dil etiketi olarak değerlendirilmemelidir. AI sonucu da doğrulanmış istasyon kimliği değildir.

### `app-ai-ui.js`

AI ekranının tek sahibidir:

- gerçek `audio_path` bulunan kayıtları listeler
- analiz / yeniden analiz başlatır
- model indirme / hazırlama durumunu gösterir
- transkript, dil, confidence ve evidence gösterir
- ilk beş istasyon adayını gösterir
- kullanıcı aday seçebilir
- yalnız transkripti veya transkript + smart öneriyi kayda uygulayabilir
- ses içeren Günlük kartlarına `AI Analiz` eylemi ekler

AI artık Ana Sayfa'ya ayrı bir kart enjekte etmez; Menü, Global Arama veya ilgili Günlük kaydı üzerinden açılır.

## AI güvenlik / kalite sınırları

- Ses süresi metadata'da **180 saniyeden uzunsa** analiz başlamaz.
- Boş transkriptte confidence 10'a düşürülür.
- Çok kısa transkriptte confidence üst sınırı düşürülür.
- AI önerisini kayda uygulamak kaydı otomatik `confirmed` yapmaz.
- İlk model kullanımında internet gerekir; model tarayıcı cache'inden sonraki kullanımlarda yeniden kullanılabilir.
- Signed audio URL ve Supabase analiz kaydı için ağ bağlantısı gerekir.
- Gerçek radyo sesiyle uçtan uca kalite testi ayrıca yapılmalıdır; mimari/CI başarısı gerçek ses doğruluğu anlamına gelmez.

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

Yeni service worker kontrolü aldığında uygulama artık zorla reload olmaz. `app-pwa-updates.js` kullanıcıya **Sonra** veya **Şimdi yenile** seçeneği sunar.

V3.8.0 cache kimliği:

`v380-ai-services-20260907-1`

Supabase, NOAA SWPC ve Hugging Face model/canlı istekleri service worker tarafından zorla cache'lenmez.

## Emekliye ayrılan legacy feature dosyaları

V3.8.0 ile `v30-ai-radio-assistant.js` da kaldırıldı. Daha önce kaldırılan ana katmanlar arasında `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, V33–V37 stability/audit dosyaları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` bulunur.

Eski kod Git geçmişinden geri alınabilir; production bootstrap ve PWA cache bu dosyaları kullanmaz.

## Tanı ve regresyon kontrolleri

`app-smoke.js` aktif provider'ları ve Home / Now / Smart / Atlas / AI / Propagation route'larını kontrol eder.

`tests/foundation-static-check.mjs` modern production JavaScript dosyalarını `vm.Script` ile parse eder ve ayrıca:

- bootstrap sırası
- service worker cache listesi
- retired dosyaların fiziksel olarak kaldırılması
- core wrapper yasağı
- service / UI ayrımı
- AI service'in DOM'dan bağımsız olması
- model sürümünün açıkça pinlenmesi
- AI duration ve low-transcript confidence guard'ları

üzerinde regresyon kontrolü yapar.

## Geliştirme kuralı

1. İş mantığını UI'dan ayır.
2. Mevcut Foundation / feature servisini kullan.
3. Route için `router.register(...)` kullan.
4. Modüller arası iletişimde `R.events` / `R.store` kullan.
5. Çekirdek fonksiyonlara feature wrapper ekleme.
6. Body-wide `MutationObserver` yerine açık event kullan.
7. Sürümü yalnız `app-config.js` üzerinden değiştir.
8. CI ve runtime smoke check'i yeşil tut.
