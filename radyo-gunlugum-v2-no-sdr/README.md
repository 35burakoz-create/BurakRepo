# Radyo Günlüğüm — V3.7.9 Collection & Atlas Services Cleanup

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa:** o an için öne çıkan yayın adayları ve kişisel özet
- **Şu An:** Türkiye saatine göre aktif SW / MW / FM adayları
- **Dinleme Modu:** büyük frekans görünümü, sinyal 1–5 ve Yakaladım / Zayıf / Yok
- **Akıllı Dinleme:** oturumlar, başarısız denemeler, yaklaşan yayınlar, kadran kalibrasyonu, gizemli yayınlar ve konuşarak kayıt
- **Günlük / Hızlı Kayıt:** gerçek dinleme arşivi
- **Radyo Hafızası:** istasyon, frekans ve ülke profilleri
- **Koleksiyon & Başarılar:** 24 rozet, ülke, dil, istasyon ve seri ilerlemesi
- **Radyo Atlası:** ülke merkezleri, yaklaşık yön/mesafe, bant, saat ve frekans analizi
- **Yayılım Asistanı:** güneş geometrisi, gray-line, NOAA SWPC ve kişisel geçmiş
- **Global Arama:** istasyon, ülke, frekans, kayıt, rehber ve araçlar
- **AI Ses Analizi:** Whisper tabanlı transkripsiyon ve istasyon/program adayları
- **QSL / Takvim / Analiz / Harita** araçları

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

`app-core-bridge.js`, feature katmanları yüklenmeden önce çekirdeğin temiz fonksiyonlarını saklar. `app-bootstrap.js` gelişmiş modülleri belirlenmiş sırada yükler ve `R.boot()` çağrısını yalnız bir kez çalıştırır.

## Aktif production sahipleri

- **`app-foundation.js`** — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- **`app-runtime-core.js`** — single-flight `R.load`, `R.show`, `R.renderAll`
- **`app-router-core.js`** — route sahipliği ve public `R.switch` compatibility giriş noktası
- **`app-current-programs.js`** — aktif yayın penceresi hesap motoru
- **`app-record-integrity.js`** — frekans doğrulama, normalize etme, edit/delete bütünlüğü
- **`app-smart-analyzer.js`** — rehber tabanlı akıllı eşleştirme
- **`app-achievements-service.js`** — 24 başarı tanımı, rozet senkronizasyonu ve koleksiyon istatistikleri
- **`app-collection-ui.js`** — Başarılar / Koleksiyon görünümü
- **`app-user-services.js`** — ayarlar, favoriler, hatırlatıcılar, stale AI bakımı
- **`app-listening-service.js`** — oturumlar, denemeler, kalibrasyon, gizemli yayınlar
- **`app-listening-ui.js`** — Dinleme Modu ve Akıllı Dinleme UI
- **`app-atlas-service.js`** — ülke, yön, mesafe, saat, frekans ve bant analizi
- **`app-atlas-ui.js`** — Radyo Atlası / Leaflet görünümü
- **`app-shell.js`** — Ana Sayfa, Şu An, dock, Menü, Hızlı Kayıt
- **`app-propagation.js`** — Yayılım Asistanı
- **`app-memory.js`** — Radyo Hafızası
- **`v44-search-rebuild.js`** — Global Arama
- **`app-audio-safety.js`** — bağsız ses tespiti / kurtarma
- **`app-backup.js`** — CSV ve JSON metadata yedekleri
- **`app-pwa-updates.js`** — güvenli sürüm bildirimi
- **`app-ui-state.js`** — URL, geri/ileri, scroll, filtre ve taslak durumu
- **`app-smoke.js`** — runtime bütünlük kontrolleri

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` üzerine zincirleme wrapper kurmamalıdır.

## Dinleme veri modeli

`radio_session_attempts` bütün sonuçları saklar: `heard`, `weak`, `none`.

- **Yakaladım / heard:** attempt + normal `radio_logs` kaydı
- **Zayıf / weak:** yalnız attempt
- **Yok / none:** yalnız attempt

Bu sayede başarısız denemeler de frekans geçmişi, Atlas ve Radio Memory için veri üretir; normal Günlük ise gerçek çekimlerle dolu kalır.

## Collection & Achievements

`app-achievements-service.js` eski V24'teki iş mantığını UI'dan ayırır. 24 başarı tanımı korunur.

Önemli semantik kurallar doğrudan kanonik tanımlarda yer alır:

- **Kısa Dalga 5/5:** yalnız SW kaydı
- **Gece MW:** 00:00–04:59 arası MW kaydı
- **Japonca Yayın:** Japonca/Japanese karşılıkları

`app-collection-ui.js` rozet ilerlemesini, ülke/dil/istasyon sayılarını ve koleksiyon listesini gösterir. Ülke etiketleri Radio Memory ülke profiline bağlanabilir.

Mevcut shell'deki eski `#v24All` menü referansı için Collection UI geçici, gizli bir compatibility giriş noktası sağlar. Shell parçalama turunda bu son referans da kaldırılacaktır.

## Radyo Atlası

`app-atlas-service.js` eski V26'nın hesap mantığını UI'dan ayırır:

- ülke koleksiyonu
- yaklaşık mesafe
- azimut / yön
- saat performansı
- sık kullanılan frekanslar
- FM / MW / SW dağılımı
- Listening Service `heard / weak / none` alım oranı

Yön ve mesafe referansı şu sırayla seçilir:

1. kullanıcı tarafından seçilmiş geçici konum
2. GPS içeren son günlük kaydı
3. `app-config.js` içindeki Bozköy/Torbalı referansı

Atlas'taki ülke işaretleri **verici konumu değildir**. Bunlar yaklaşık ülke merkezleridir; mesafe ve yön değerleri de dinleme referansı → ülke merkezi arasındaki yaklaşık değerlerdir.

## PWA güncelleme davranışı

Eski V24, yeni service worker kontrolü ele aldığında sayfayı otomatik `location.reload()` ile yeniliyordu. Bu davranış kaldırıldı.

`app-pwa-updates.js` yeni sürüm hazır olduğunda kullanıcıya:

- **Sonra**
- **Şimdi yenile**

seçeneklerini gösterir. Yenileme yalnız kullanıcı isterse yapılır. Böylece form doldururken veya dinleme kaydı hazırlarken sürpriz sayfa yenileme riski azalır.

## Emekliye ayrılan eski katmanlar

V3.7.9 ile çalışma ağacından kaldırılan son feature sahipleri:

- `v24-achievements.js`
- `v26-radio-atlas.js`

Daha önce kaldırılanlar arasında `v25-smart-listening.js`, `v33–v37` stability/audit katmanları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` bulunur.

Gerekirse eski kod Git geçmişinden geri alınabilir; production bootstrap ve PWA cache bu dosyaları kullanmaz.

## Foundation servisleri

`app-foundation.js` yalnız şu ortak altyapıları sağlar:

- `R.events`
- `R.clock`
- `R.store`
- `R.features`
- `R.diagnostics`

Router ve runtime çekirdek fonksiyonlarının sahibi Foundation değildir.

## PWA ve offline

Sürüm ve cache kimliği `app-config.js` içinden gelir.

V3.7.9 cache kimliği:

`v379-collection-atlas-20260907-1`

Yeni Collection, Atlas ve PWA update dosyaları cache'e dahildir; emekliye ayrılan V24/V26 dosyaları dahil değildir. Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

**Menü → Sistem Durumu** ile aktif provider'lar, router, store, arama, Memory, Propagation, Listening, Atlas ve PWA durumu kontrol edilebilir.

`app-smoke.js` V3.7.9'da ayrıca:

- Achievements Service
- Collection UI
- Atlas Service
- Atlas UI
- PWA Update notifier
- eski V24/V26'nın yüklenmemesi

kontrollerini yapar.

GitHub Actions içindeki `foundation-static-check.mjs` artık modern production JavaScript dosyalarını `vm.Script` ile parse ederek yeni modüllerin syntax'ını da doğrular. Ayrıca bootstrap sahipliği, service worker cache listesi, retired dosyaların fiziksel olarak silinmiş olması, core wrapper yasağı ve yeni service/UI ayrımını kontrol eder.

## Geliştirme kuralı

1. iş mantığını UI'dan ayır
2. mevcut Foundation/feature servisini kullan
3. route için `router.register(...)` kullan
4. modüller arası iletişimde `R.events` / `R.store` kullan
5. çekirdek fonksiyonlara feature wrapper ekleme
6. body-wide `MutationObserver` yerine açık event kullan
7. sürümü yalnız `app-config.js` üzerinden değiştir
8. CI ve runtime smoke check'i yeşil tut

Amaç, özellik sayısı büyürken navigasyon, dinleme, koleksiyon, Atlas, arama, PWA ve veri akışının yeniden kırılmasını önlemektir.
