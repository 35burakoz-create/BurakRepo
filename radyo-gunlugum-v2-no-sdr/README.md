# Radyo Günlüğüm — V3.8.2 Legacy Mobile Services Cleanup

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa / Şu An:** o an denenebilecek yayın adayları
- **Dinleme Modu:** sinyal 1–5 ve Yakaladım / Zayıf / Yok
- **Akıllı Dinleme:** oturumlar, kalibrasyon, gizemli yayınlar ve yaklaşan hedefler
- **Günlük / Radyo Hafızası:** kişisel dinleme arşivi ve istasyon/frekans/ülke profilleri
- **Koleksiyon / Atlas:** rozetler, ülke koleksiyonu, yaklaşık yön ve mesafe analizi
- **Yayılım Asistanı:** gray-line, NOAA SWPC ve kişisel geçmiş
- **AI Ses Analizi:** cihazda Whisper transkripsiyonu ve açıklanabilir istasyon/program adayları
- **Global Arama / QSL / Takvim / Analiz / Harita** araçları

## Başlangıç mimarisi

`index.html` temel bağımlılıkları yükler. `app-core-bridge.js`, feature katmanları gelmeden önce çekirdek fonksiyonların temiz referanslarını saklar. `app-bootstrap.js` modern modülleri deterministik sırada başlatır ve `R.boot()` yalnız bir kez çalışır.

Feature modülleri `R.switch`, `R.load`, `R.show` veya `R.renderAll` fonksiyonlarını zincirleme sarmalamamalıdır.

## Aktif production sahipleri

- `app-foundation.js` — Event Bus, Clock, Store/index, Feature Registry, Diagnostics
- `app-toast.js` — ortak toast bildirimleri
- `app-pwa-install.js` — service worker kaydı ve PWA kurulum istemi
- `app-runtime-core.js` — `R.load`, `R.show`, `R.renderAll`
- `app-router-core.js` — route sahipliği ve public `R.switch`
- `app-current-programs.js` — rehber verisini yükleme ve aktif yayın hesap motoru
- `app-record-integrity.js` — frekans / edit / delete bütünlüğü
- `app-offline-service.js` — offline IndexedDB outbox, `R.queueLog`, `R.syncOutbox`
- `app-smart-analyzer.js` — rehber tabanlı eşleştirme
- `app-ai-service.js` / `app-ai-ui.js` — Whisper analiz motoru ve AI ekranı
- `app-achievements-service.js` / `app-collection-ui.js` — başarılar ve koleksiyon
- `app-user-services.js` — ayarlar, favoriler ve hatırlatıcılar
- `app-listening-service.js` / `app-listening-ui.js` — dinleme oturumları ve Dinleme Modu
- `app-atlas-service.js` / `app-atlas-ui.js` — Atlas hesapları ve Leaflet görünümü
- `app-shell-core.js` — alt dock, topbar arama, ağ durumu ve ortak tıklamalar
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

## V3.8.2 — Legacy Mobile Services Cleanup

Eski `v22-mobile.js`, yararlı altyapı işlerini eski V2.2 arayüzü ve core wrapper'larla aynı dosyada tutuyordu. V3.8.2'de dosya production'dan ve repodan kaldırıldı; gerekli işlevler açık sahipliklere ayrıldı.

### Korunan davranışlar

- **Offline outbox korunur.** Yeni `app-offline-service.js`, eski IndexedDB kimliğini aynen kullanır: `radio-gunlugum-v22 / outbox`. Böylece cihazda bekleyen eski offline kayıtların formatı değiştirilmez.
- **PWA kurulumu korunur.** `app-pwa-install.js`, service worker kaydını ve `beforeinstallprompt` akışını yönetir. Menü yalnız `R.installPWA()` çağırır.
- **Toast korunur.** Ortak bildirimler `app-toast.js` sahibidir.
- **Kayıt formu sadeleştirmesi korunur.** Gelişmiş alanlar `app-log-form-ui.js` tarafından tek disclosure altında tutulur.
- Offline iken mevcut kayıt düzenleme hâlâ engellenir; yeni kayıtlar kuyruğa alınır ve bağlantı geri geldiğinde senkronize edilir.

### Kaldırılan V22 sorumlulukları

- eski V2.2 tema/CSS enjeksiyonu
- eski bottom navigation
- eski quick-log sheet
- eski Home aksiyon kartı
- tekrar eden favorites/reminders UI
- `R.switch` ve `R.load` wrapper'ları
- runtime'da V2.2 başlık/sürüm manipülasyonu

`index.html` manifest ve iOS PWA meta etiketlerini zaten statik olarak taşıdığı için V22'nin bunları DOM'a tekrar eklemesine ihtiyaç yoktur.

## Rehber veri sahipliği

`app-current-programs.js`, gerektiğinde doğrudan:

- `guide_entries`
- `guide_time_rules`
- `guide_band_profiles`

verilerini yükler. Bu nedenle modern aktif yayın motoru eski V21/V22 `R.load` wrapper'larına bağımlı değildir.

Bu ayrım V3.8.3'te `v21-guide.js` dosyasını da emekliye ayırmak için zemin hazırlar.

## Dinleme veri modeli

`radio_session_attempts` tüm `heard / weak / none` sonuçlarını saklar.

- **Yakaladım / heard:** attempt + normal `radio_logs`
- **Zayıf / weak:** yalnız attempt
- **Yok / none:** yalnız attempt

Normal Günlük gerçek çekimlerle sınırlı kalırken başarısız denemeler Atlas, Radio Memory ve kişisel frekans geçmişinde kullanılabilir.

## AI sınırları

AI sonucu doğrulanmış istasyon kimliği değildir. `app-ai-service.js` `Xenova/whisper-tiny` ile transkripsiyon ve heuristik aday skorlama yapar. Gerçek radyo sesiyle uçtan uca kalite testi mimari/CI kontrolünden ayrıdır.

## Atlas sınırı

Atlas noktaları gerçek verici konumu değil, saklanan ülke bilgisinin yaklaşık **ülke merkezi** koordinatıdır. Mesafe ve yön de buna göre yaklaşık değerdir.

## PWA

V3.8.2 cache kimliği:

`v382-mobile-services-20260907-1`

Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri service worker tarafından zorla cache'lenmez. Yeni worker bulunduğunda uygulama zorla reload olmak yerine `app-pwa-updates.js` üzerinden kullanıcıya yenileme seçeneği sunar.

## Emekliye ayrılan ana legacy dosyalar

`v22-mobile.js`, `app-shell.js`, `v24-achievements.js`, `v25-smart-listening.js`, `v26-radio-atlas.js`, `v30-ai-radio-assistant.js`, V33–V37 stability/audit katmanları, `v38-listening-mode.js`, `v38-ux-shell.js`, `v39-navigation-state.js`, `v40-radio-memory.js`, `v41-propagation-assistant.js`, `v42-ui-polish.js` ve `v43-search-hotfix.js` artık production zincirinde değildir ve repodan kaldırılmıştır.

## Regresyon kontrolleri

GitHub Actions **Radio Foundation Check** üç katman uygular:

1. Modern JavaScript modüllerine doğrudan `node --check`.
2. `tests/foundation-static-check.mjs` ile bootstrap, cache, retired dosyalar, core-wrapper yasağı ve kritik sahiplik kuralları.
3. `tests/mobile-services-static-check.mjs` ile V22 kaldırma, aynı IndexedDB outbox kimliğinin korunması, PWA install delegasyonu ve yeni servis sahiplikleri.

Foundation testi bootstrap'ın gerçek `MODULES` listesini okuyarak boot edilen modülleri dinamik olarak syntax/cache kontrolünden geçirir; her sürümde elle dev bir dosya listesi güncellemek gerekmez.

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
