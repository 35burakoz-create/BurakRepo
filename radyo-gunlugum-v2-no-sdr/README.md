# Radyo Günlüğüm — V3.7.8 Listening & Smart Services Cleanup

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa:** o an için öne çıkan yayın adayları ve kişisel özet
- **Şu An:** Türkiye saatine göre gerçekten aktif SW / MW / FM adayları
- **Dinleme Modu:** büyük frekans görünümü, sinyal 1–5 ve Yakaladım / Zayıf / Yok sonucu
- **Akıllı Dinleme:** oturumlar, başarısız denemeler, yaklaşan yayınlar, kadran kalibrasyonu, gizemli yayınlar ve konuşarak kayıt
- **Hızlı Kayıt ve Günlük:** normal dinleme arşivi
- **Radyo Hafızası:** istasyon, frekans ve ülke profilleri
- **Yayılım Asistanı:** güneş geometrisi, gray-line, NOAA SWPC ve kişisel geçmiş
- **Global Arama:** istasyon, ülke, frekans, kayıt, rehber ve araçlar
- **AI Ses Analizi:** Whisper tabanlı transkripsiyon ve istasyon/program adayları
- **QSL / Atlas / Takvim / Analiz** araçları

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

V3.7.8 ile sorumluluklar tekil modüllere ayrılmıştır:

- **`app-foundation.js`** — yalnız ortak altyapı: Event Bus, Clock, Store/index, Feature Registry ve Diagnostics
- **`app-runtime-core.js`** — single-flight `R.load`, `R.show`, `R.renderAll`; data/auth/render event'leri
- **`app-router-core.js`** — `R.router` ve public `R.switch` compatibility giriş noktası
- **`app-current-programs.js`** — Türkiye saati, geçerlilik ve aktif yayın pencerelerine göre `R.radioNowCandidates`
- **`app-record-integrity.js`** — frekans doğrulama, SW MHz→kHz normalizasyonu, edit/body/reset/delete bütünlüğü ve AI önerisini kayda uygulama
- **`app-smart-analyzer.js`** — rehber tabanlı akıllı istasyon eşleştirme
- **`app-user-services.js`** — kullanıcı ayarları, favoriler, hatırlatıcılar, achievement düzeltmeleri ve stale AI bakımı
- **`app-listening-service.js`** — dinleme oturumları, denemeler, kadran kalibrasyonu, gizemli yayın eşleştirmesi, yaklaşan yayınlar ve konuşarak kayıt ayrıştırması
- **`app-shell.js`** — Ana Sayfa, Şu An, bottom dock, Menü ve Hızlı Kayıt
- **`app-listening-ui.js`** — Dinleme Modu ve Akıllı Dinleme ekranının tek UI sahibi
- **`app-propagation.js`** — Yayılım Asistanı
- **`app-memory.js`** — Radyo Hafızası ve Store indeksleri
- **`v44-search-rebuild.js`** — Global Arama
- **`app-audio-safety.js`** — bağsız ses tespiti ve kurtarma
- **`app-backup.js`** — tam CSV ve JSON metadata yedekleri
- **`app-ui-state.js`** — URL, geri/ileri, filtre, scroll ve taslak durumu
- **`app-smoke.js`** — runtime bütünlük kontrolleri

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` üzerine zincirleme wrapper kurmamalıdır.

## Dinleme veri modeli

Dinleme sonucu iki katmanda tutulur:

- **`radio_session_attempts`** bütün sonuçları saklar: `heard`, `weak`, `none`.
- **`radio_logs`** normal kişisel günlük kayıtlarını saklar.

V3.7.8'de tek kanonik davranış şöyledir:

- **Yakaladım / `heard`:** bir session attempt oluşturur ve normal `radio_logs` kaydı oluşturur.
- **Zayıf / `weak`:** yalnız session attempt oluşturur.
- **Yok / `none`:** yalnız session attempt oluşturur.

Böylece duyamadığın veya çok zayıf aldığın frekanslar Propagation / Radio Memory / kişisel frekans geçmişi için veri olmaya devam eder; normal Günlük ise yalnız gerçek çekimlerle dolu kalır.

`app-listening-service.js` aynı zamanda aktif oturumun istatistiklerini (`heard / weak / none / successRate`) ve daha önce denenmemiş sıradaki yayın hedeflerini üretir.

## Dinleme Modu ve Akıllı Dinleme

`app-listening-ui.js` şu davranışların tek UI sahibidir:

- tam ekran frekans hedefi
- 1–5 sinyal seçimi
- Yakaladım / Zayıf / Yok
- dinleme ekranını küçültme ve geri açma
- Ses Kaydı ekranına aktarım
- aktif dinleme oturumu
- oturum geçmişi
- yaklaşan 60 dakikalık yayınlar
- R-9012 kadran kalibrasyonu
- gizemli yayın işaretleme ve adayla çözme
- konuşarak kayıt

UI doğrudan `R.listening` servis API'sini kullanır. Dinleme veritabanı işlemleri UI dosyasında tekrarlanmaz.

## Kadran kalibrasyonu

`app-listening-service.js`, doğruladığın kalibrasyon noktalarından analog kadran tahmini üretir.

- SW için gerçek yayın frekansı kHz, R-9012 kadran değeri MHz olarak tutulabilir.
- MW kHz kullanır.
- FM MHz kullanır.

Birden fazla kalibrasyon noktası olduğunda hedef frekansa en yakın noktalar arasında doğrusal tahmin yapılır. Home, Şu An ve Akıllı Dinleme kartları uygun olduğunda kişisel kadran ipucunu gösterebilir.

## Gizemli yayınlar

Bir günlük kaydı `is_mystery` olarak işaretlenebilir. Servis:

- bant ve frekans yakınlığını,
- rehber puanını,
- dili,
- not / transkript / program kelimelerini

kullanarak yakın rehber adayları üretir. Kullanıcı bir adayı seçtiğinde kayıt doğrulanmış istasyon bilgileriyle güncellenebilir.

## Emekliye ayrılan eski listening katmanları

V3.7.8'de aşağıdaki iki eski JavaScript dosyası production zincirinden çıkarıldı ve çalışma ağacından kaldırıldı:

- `v25-smart-listening.js`
- `v38-listening-mode.js`

Eski V25 dosyasındaki veri, modal, CSS, MutationObserver ve `R.load / R.switch` wrapper sorumlulukları yeni service/UI/CSS katmanlarına ayrıldı. Eski V38'deki ikinci dinleme kayıt yolu da kaldırıldı.

Daha önce emekliye ayrılmış V33–V43 wrapper/hotfix katmanları da production dışında kalır. Gerekirse Git geçmişinden geri alınabilirler.

## Foundation servisleri

`app-foundation.js` yalnız şu ortak altyapıları sağlar:

- `R.events` — Event Bus
- `R.clock` — `Europe/Istanbul` saat servisi
- `R.store` — log / rehber state'i ve arama indeksleri
- `R.features` — feature registry
- `R.diagnostics` — runtime hata ve sistem tanıları

Router ve runtime çekirdek fonksiyonlarının sahibi Foundation değildir. CI, Foundation içine yeniden `R.router`, `R.switch`, `R.load`, `R.show` veya `R.renderAll` sahipliği eklenmesini engeller.

Temel olaylar: `route:before`, `route:changed`, `auth:changed`, `data:loading`, `data:loaded`, `store:updated`, `render:all`, `menu:opened`, `listening:data`, `listening:attempt`.

## Veri bütünlüğü

`app-record-integrity.js` bant aralıklarını doğrular. Kısa dalgada kullanıcı örneğin `17.650 MHz` biçiminde bir değer girerse uygun olduğunda bunu `17650 kHz` biçimine normalize eder.

Düzenleme sırasında mevcut `source` ve smart alanları gereksiz yere kaybolmaz. Ses preview süresi varsa `audio_duration_seconds` kayda eklenir. Bir kayıt silindiğinde ona bağlı private Storage ses dosyası da temizlenmeye çalışılır.

## Ses güvenliği

`app-audio-safety.js`, `radio-audio` içindeki kullanıcı dosyalarını günlük kayıtlarının `audio_path` değerleriyle karşılaştırır. Bağsız dosyalar dinlenebilir, yakın zamandaki olası kayda bağlanabilir veya yeni bir kayda aktarılabilir.

Ses dosyalarının kendisi JSON yedeğine gömülmez. `app-backup.js`, ses metadata manifestini ve doğrudan yeni Listening Service state'inden kalibrasyon / oturum / deneme verisini yedeğe ekler.

## Şu An ve yayın motoru

`app-current-programs.js`, eski V34'ün faydalı hesap mantığını UI'dan ayırır. SW ve MW için aktif saat penceresi zorunludur; FM istasyon hedefleri gün boyu aday olabilir. `valid_from / valid_to`, hafta içi / hafta sonu kuralları, bant profili ve kişisel sinyal geçmişi puana katılır.

## Navigasyon ve UI state

`app-router-core.js` gerçek sekme geçişini yalnız `R.coreSwitch` üzerinden yapar. Dinamik ekranlar `router.register(...)` ile route adapter kaydeder. `smart` route'u artık `app-listening-ui.js` tarafından kaydedilir.

`app-ui-state.js`, çekirdek fonksiyonları sarmalamadan URL hash (`#tab=...`), geri/ileri, son sekme, scroll, Şu An `ALL / SW / MW / FM` filtresi, günlük/rehber/takvim filtreleri ve kaydedilmemiş günlük taslağını yönetir.

## PWA ve offline

`sw.js`, cache sürümünü `app-config.js` üzerinden alır. V3.7.8 cache kimliği `v378-listening-services-20260907-1`'dir.

PWA cache'inde `app-listening-service.js`, `app-listening-ui.js` ve `app-listening.css` bulunur; emekliye ayrılan V25/V38 listening dosyaları bulunmaz. Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

Uygulamada **Menü → Sistem Durumu** bölümünden provider, router, store, arama, Memory, Propagation ve PWA durumu görülebilir.

`app-smoke.js` ayrıca Listening Service, Listening UI, `smart` route ve eski dinleme scriptlerinin yüklenmediğini kontrol eder.

GitHub Actions **Radio Foundation Check**:

- production JavaScript dosyalarında `node --check`,
- bootstrap yükleme sırası,
- service worker cache listesi,
- eski V25/V33–V43 dosyalarının production'a geri dönmemesi,
- emekliye ayrılan V25/V38 listening dosyalarının çalışma ağacından gerçekten kaldırılması,
- shell'in listening davranışını `R.listeningUI` API'sine devretmesi,
- listening service/UI modüllerinin çekirdek wrapper veya MutationObserver kullanmaması,
- `heard` dışındaki sonuçların normal log oluşturmaması

için regresyon kontrolü çalıştırır.

## Geliştirme kuralı

Yeni özelliklerde tercih edilen sıra:

1. mevcut Foundation veya feature servisini kullan
2. veri / iş mantığını UI'dan ayrı tut
3. gerekirse `router.register(...)` veya açık feature API ekle
4. modüller arası iletişim için `R.events` / `R.store` kullan
5. çekirdek fonksiyonlara feature wrapper ekleme
6. body-wide `MutationObserver` yerine açık event üret
7. sürüm bilgisini yalnız `app-config.js` üzerinden değiştir
8. CI ve runtime smoke check'i yeşil tut

Amaç, özellik sayısı büyürken navigasyon, arama, dinleme, PWA ve veri akışının yeniden kırılmasını önlemektir.
