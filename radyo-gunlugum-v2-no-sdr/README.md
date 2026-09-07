# Radyo Günlüğüm — V3.7.6 Legacy Core Modules Cleanup

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa:** o an için öne çıkan yayın adayları ve kişisel özet
- **Şu An:** Türkiye saatine göre gerçekten aktif SW / MW / FM adayları
- **Dinleme Modu:** Yakaladım / Zayıf / Yok ve sinyal 1–5
- **Hızlı Kayıt ve Günlük:** dinleme arşivi
- **Radyo Hafızası:** istasyon, frekans ve ülke profilleri
- **Yayılım Asistanı:** güneş geometrisi, gray-line, NOAA SWPC ve kişisel geçmiş
- **Global Arama:** istasyon, ülke, frekans, kayıt, rehber ve araçlar
- **AI Ses Analizi:** Whisper tabanlı transkripsiyon ve istasyon/program adayları
- **QSL / Atlas / Takvim / Analiz / Akıllı Dinleme** araçları

## Başlangıç mimarisi

`index.html` yalnız temel bağımlılıkları başlatır:

1. `app-config.js`
2. Supabase ve Leaflet
3. `core.js`
4. `app-core-bridge.js`
5. `audio-smart.js`
6. `v21-guide.js`
7. `v22-mobile.js`
8. `app-insights.js`
9. `app-bootstrap.js`

`app-core-bridge.js`, feature katmanları yüklenmeden önce çekirdeğin temiz `R.switch`, `R.load`, `R.show`, `R.renderAll`, `R.body`, `R.reset`, `R.edit` ve `R.del` fonksiyonlarını saklar.

`app-bootstrap.js`, gelişmiş modülleri deterministik sırada yükler ve `R.boot()` çağrısını yalnız bir kez çalıştırır.

## Aktif production sahipleri

V3.7.6 ile sorumluluklar tekil modüllere ayrılmıştır:

- **`app-runtime-core.js`** — single-flight `R.load`, `R.show`, `R.renderAll`; data/auth/render event'leri
- **`app-router-core.js`** — `R.router` ve public `R.switch` compatibility giriş noktası
- **`app-current-programs.js`** — Türkiye saati, geçerlilik ve aktif yayın pencerelerine göre `R.radioNowCandidates`
- **`app-record-integrity.js`** — frekans doğrulama, SW MHz→kHz normalizasyonu, edit/body/reset/delete bütünlüğü ve AI önerisini kayda uygulama
- **`app-smart-analyzer.js`** — rehber tabanlı akıllı istasyon eşleştirme
- **`app-user-services.js`** — kullanıcı ayarları, favoriler, hatırlatıcılar, achievement düzeltmeleri ve stale AI bakımı
- **`app-shell.js`** — Ana Sayfa, Şu An, bottom dock, Menü, Hızlı Kayıt, mini Dinleme barı
- **`app-propagation.js`** — Yayılım Asistanı
- **`app-memory.js`** — Radyo Hafızası ve Store indeksleri
- **`v44-search-rebuild.js`** — Global Arama
- **`app-audio-safety.js`** — bağsız ses tespiti ve kurtarma
- **`app-backup.js`** — tam CSV ve JSON metadata yedekleri
- **`app-ui-state.js`** — URL, geri/ileri, filtre, scroll ve taslak durumu
- **`app-smoke.js`** — runtime bütünlük kontrolleri

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` üzerine zincirleme wrapper kurmamalıdır.

## V3.7.6 ile emekliye ayrılan V33–V37 katmanları

Aşağıdaki eski JavaScript katmanları production zincirinden çıkarıldı ve çalışma ağacından kaldırıldı; Git geçmişinden gerektiğinde geri alınabilir:

- `v33-stability-hotfix.js`
- `v34-current-programs.js`
- `v35-audit-fixes.js`
- `v35-runtime-bridge.js`
- `v36-integrity-audit.js`
- `v37-integrity-followup.js`

Bunların gerekli davranışları yukarıdaki `app-*` servislerine taşındı. Böylece eski Home'a zorlama tamirleri, global UI CSS enjeksiyonları, body-wide MutationObserver'lar ve çekirdek wrapper zincirleri çalışmıyor.

V3.7.5'te daha önce kaldırılmış eski UI sahipleri de production dışında kalmaya devam eder: `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js`.

## Foundation servisleri

`app-foundation.js` şu ortak altyapıları sağlar:

- `R.events` — Event Bus
- `R.clock` — `Europe/Istanbul` saat servisi
- `R.store` — log / rehber state'i ve arama indeksleri
- `R.features` — feature registry
- `R.diagnostics` — runtime hata ve sistem tanıları

Temel olaylar: `route:before`, `route:changed`, `auth:changed`, `data:loading`, `data:loaded`, `store:updated`, `render:all`, `menu:opened`.

## Veri bütünlüğü

`app-record-integrity.js` bant aralıklarını doğrular. Kısa dalgada kullanıcı örneğin `17.650 MHz` biçiminde bir değer girerse uygun olduğunda bunu `17650 kHz` biçimine normalize eder.

Düzenleme sırasında mevcut `source` ve smart alanları gereksiz yere kaybolmaz. Ses preview süresi varsa `audio_duration_seconds` kayda eklenir. Bir kayıt silindiğinde ona bağlı private Storage ses dosyası da temizlenmeye çalışılır.

## Ses güvenliği

`app-audio-safety.js`, `radio-audio` içindeki kullanıcı dosyalarını günlük kayıtlarının `audio_path` değerleriyle karşılaştırır. Bağsız dosyalar:

- dinlenebilir,
- yakın zamandaki olası kayda bağlanabilir,
- yeni bir kayda aktarılabilir.

Ses dosyalarının kendisi JSON yedeğine gömülmez; `app-backup.js` bunların metadata manifestini yedeğe ekler.

## Şu An ve yayın motoru

`app-current-programs.js`, eski V34'ün faydalı hesap mantığını UI'dan ayırır. SW ve MW için aktif saat penceresi zorunludur; FM istasyon hedefleri gün boyu aday olabilir. `valid_from / valid_to`, hafta içi / hafta sonu kuralları, bant profili ve kişisel sinyal geçmişi puana katılır.

## Kullanıcı servisleri

`app-user-services.js`:

- günlük hedefi,
- ülke sayacı görünümünü,
- dinleme serisi görünümünü,
- favorileri,
- yayın hatırlatıcılarını,
- İstanbul saatli reminder kontrolünü,
- eski achievement semantik düzeltmelerini,
- 15 dakikadan uzun süre `running` kalan yarım AI analizlerinin hata durumuna alınmasını

yönetir.

## Navigasyon ve UI state

`app-router-core.js` gerçek sekme geçişini yalnız `R.coreSwitch` üzerinden yapar. Dinamik ekranlar `router.register(...)` ile route adapter kaydeder.

`app-ui-state.js`, çekirdek fonksiyonları sarmalamadan URL hash (`#tab=...`), geri/ileri, son sekme, scroll, Şu An `ALL / SW / MW / FM` filtresi, günlük/rehber/takvim filtreleri ve kaydedilmemiş günlük taslağını yönetir.

## PWA ve offline

`sw.js`, cache sürümünü `app-config.js` üzerinden alır. V3.7.6 cache kimliği `v376-legacy-core-cleanup-20260907-1`'dir. Yerel varlıklar bağımsız cache'lenir; Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

Uygulamada **Menü → Sistem Durumu** bölümünden router, store, arama, Memory, Propagation ve PWA durumu görülebilir.

`app-smoke.js` aktif provider'ları ve eski V33–V43 katmanlarının yüklenmediğini kontrol eder.

GitHub Actions **Radio Foundation Check**:

- production JavaScript dosyalarında `node --check`,
- bootstrap sahiplik kuralları,
- service worker cache listesi,
- eski V33–V37 dosyalarının çalışma ağacından gerçekten kaldırılmış olması,
- core wrapper'ların geri dönmemesi

için regresyon kontrolü çalıştırır.

## Geliştirme kuralı

Yeni özelliklerde tercih edilen sıra:

1. mevcut Foundation servisini kullan
2. gerekirse `router.register(...)` veya feature API ekle
3. modüller arası iletişim için `R.events` / `R.store` kullan
4. çekirdek fonksiyonlara feature wrapper ekleme
5. body-wide `MutationObserver` yerine açık event üret
6. sürüm bilgisini yalnız `app-config.js` üzerinden değiştir
7. CI ve runtime smoke check'i yeşil tut

Amaç, özellik sayısı büyürken navigasyon, arama, PWA ve veri akışının yeniden kırılmasını önlemektir.
