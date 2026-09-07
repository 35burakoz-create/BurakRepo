# Radyo Günlüğüm — V3.7.5 Wrapper Cleanup & Event UI

Tecsun R-9012 ile, RTL-SDR olmadan kullanılmak üzere geliştirilen kişisel radyo dinleme günlüğü ve saha asistanı.

## Ana kullanım akışı

- **Ana Sayfa:** o an için öne çıkan yayın adayları ve kişisel özet
- **Şu An:** SW / MW / FM yayın adayları
- **Dinleme Modu:** Yakaladım / Zayıf / Yok sonucu ve sinyal 1–5
- **Hızlı Kayıt ve Günlük:** dinleme arşivi
- **Radyo Hafızası:** istasyon, frekans ve ülke profilleri
- **Yayılım Asistanı:** güneş geometrisi, gray-line, NOAA SWPC verileri ve kişisel geçmişten bant sıralaması
- **Global Arama:** istasyon, ülke, frekans, kayıt, rehber ve uygulama araçlarında arama
- **AI Ses Analizi:** tarayıcıda Whisper tabanlı transkripsiyon, dil tahmini ve rehber destekli istasyon adayları
- **QSL / Atlas / Takvim / Analiz / Akıllı Dinleme** araçları

## V3.7 Foundation mimarisi

V3.7 serisi, önceki sürümlerde üst üste eklenen loader, navigation wrapper ve hotfix zincirlerini kontrollü biçimde konsolide eder.

### Statik başlangıç

`index.html` temel bağımlılıkları şu sırayla başlatır:

1. `app-config.js`
2. Supabase ve Leaflet
3. `core.js`
4. `app-core-bridge.js`
5. `audio-smart.js`
6. `v21-guide.js`
7. `v22-mobile.js`
8. `app-insights.js`
9. `app-bootstrap.js`

`app-core-bridge.js`, legacy feature katmanları yüklenmeden önce çekirdeğin temiz `R.switch`, `R.load`, `R.show` ve `R.renderAll` fonksiyonlarını saklar.

`app-bootstrap.js` gelişmiş özellik modüllerini deterministik sırada yükler ve en sonda `R.boot()` çağrısını yalnız bir kez çalıştırır.

### Aktif production sahipleri

V3.7.5 ile çekirdek davranışların tek sahipleri şunlardır:

- **`app-runtime-core.js`** — `R.load`, `R.show`, `R.renderAll`; veri/auth/render event'lerini üretir
- **`app-router-core.js`** — `R.router` ve public `R.switch` compatibility giriş noktası
- **`app-shell.js`** — Ana Sayfa, Şu An, bottom dock, Menü, Hızlı Kayıt, mini Dinleme barı ve ortak UI refresh
- **`app-propagation.js`** — Yayılım Asistanı; router/store event'leriyle çalışır
- **`app-memory.js`** — Radyo Hafızası ve Store indeksleri
- **`app-ui-state.js`** — URL hash, geri/ileri, filtre, scroll ve günlük taslak durumu
- **`v44-search-rebuild.js`** — tek Global Arama motoru

Bu modüller `R.switch`, `R.load`, `R.show` veya `R.renderAll` üzerine zincirleme feature wrapper kurmamalıdır.

### Emekliye ayrılan katmanlar

V3.7.5'te aşağıdaki eski wrapper modülleri repodan kaldırıldı; gerektiğinde Git geçmişinden geri alınabilirler:

- `v38-ux-shell.js`
- `v39-navigation-state.js`
- `v40-radio-memory.js`
- `v40-radio-memory.css`
- `v41-propagation-assistant.js`
- `v42-ui-polish.js`

`v38-ux-cleanup.css`, `v41-propagation-assistant.css` ve `v42-design-system.css` hâlâ yeni modüllerin görsel katmanları tarafından kullanılır; yalnız eski JavaScript sahipliği kaldırılmıştır.

## Event Bus ve Store

`app-foundation.js` ortak servisleri sağlar:

- `R.events` — event bus
- `R.clock` — `Europe/Istanbul` merkezli saat servisi
- `R.store` — log / rehber durumu ve arama indeksleri
- `R.features` — feature registry
- `R.diagnostics` — runtime hata ve sistem durumu tanıları

Yeni UI kodu özellikle şu event'lerden yararlanır:

- `route:before`
- `route:changed`
- `auth:changed`
- `data:loading`
- `data:loaded`
- `store:updated`
- `render:all`
- `menu:opened`

## Navigasyon ve UI State

`app-router-core.js` gerçek DOM sekme geçişini yalnız `R.coreSwitch` üzerinden yapar. Dinamik ekranlar `router.register(...)` ile kendi `prepare` / `enter` adapter'larını kaydeder.

`app-ui-state.js`, çekirdek fonksiyonları sarmalamadan aşağıdaki davranışları yönetir:

- URL hash (`#tab=...`)
- tarayıcı geri / ileri
- son açık sekme
- sekme scroll konumu
- Şu An `ALL / SW / MW / FM` filtresi
- Günlük / Rehber / Takvim filtreleri
- kaydedilmemiş günlük taslağı
- startup boot guard

## Radio Memory

`app-memory.js` doğrudan Foundation Store indekslerini kullanır ve `memory` route'unu `R.router.register(...)` ile kaydeder.

Profil ekranında ilk bakışta yalnız dört ana metrik gösterilir; diğer istatistikler açılır ayrıntı bölümündedir.

## Propagation Assistant

`app-propagation.js` artık eski `R.switch / R.load / R.show` wrapper'larını veya `MutationObserver` kullanmaz. Güneş geometrisi cihazda hesaplanır; NOAA SWPC Kp, R/G/S ve F10.7 verileri canlı veya 24 saatlik yerel cache üzerinden kullanılır.

0–99 bant puanı kalibre edilmiş bir başarı olasılığı değildir; rehber saati, güneş fazı, uzay havası ve kişisel dinleme geçmişini birleştiren yardımcı sıralamadır.

## Global Arama

V44 arama motoru Foundation Store indeksini kullanabilir. Arama şu alanları kapsar:

- istasyon
- ülke
- frekans
- dil
- program / not / transkript
- yayın rehberi
- uygulama araçları

## Visual Foundation

`styles.css` legacy bileşen stillerini taşımaya devam eder; `app-base.css` hemen ardından yüklenerek temel görsel sistemi merkezi hale getirir.

Ana design token'ları:

- surface / background / text / muted / border
- primary indigo
- success / warning / danger
- 12 px control radius
- 18 px card radius
- 24 px panel radius
- ortak focus ring ve kart gölgesi

Yeni ekranlarda Georgia veya eski bej tema kullanılmamalıdır.

## PWA ve offline

`sw.js`, cache sürümünü `app-config.js` üzerinden alır. Yerel asset'ler bağımsız olarak cache'lenir; tek bir eksik dosya tüm service worker kurulumunu düşürmez.

Supabase, NOAA SWPC ve Hugging Face canlı/model istekleri service worker tarafından zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

Uygulama içinde **Menü → Sistem Durumu** bölümünden router, store, arama, Radio Memory, Propagation ve PWA durumu görülebilir.

`app-smoke.js` özellikle şunları kontrol eder:

- pristine core bridge
- Runtime Core provider
- Router Core provider
- App Shell provider
- App Propagation provider
- App Memory provider
- Global Search
- Home / Şu An / Propagation görünümleri
- legacy V38/V39/V40/V41/V42/V43 katmanlarının production'da yüklenmemesi

GitHub Actions'taki **Radio Foundation Check** workflow'u production JavaScript dosyalarında `node --check` ve mimari regresyon kontrolleri çalıştırır.

## Veri ve Supabase

Supabase projesi: `radyo-gunlugum-v1-1` (`mesbtntnclokgzgunept`).

Başlıca veri alanları:

- `radio_logs`
- `station_schedules`
- `radio_session_attempts`
- `radio_ai_analyses`

`radio-audio` bucket'ı private'tır ve kullanıcı bazlı Storage RLS politikaları kullanır. Service-role anahtarı istemci kodunda kullanılmaz.

## Geliştirme kuralı

Yeni özelliklerde tercih edilen sıra:

1. mevcut Foundation servisini kullan
2. gerekirse `router.register(...)` veya feature API ekle
3. modüller arası iletişim için `R.events` / `R.store` kullan
4. `R.switch`, `R.load`, `R.show`, `R.renderAll` için feature wrapper ekleme
5. `MutationObserver` yerine açık event üret
6. sürüm bilgisini yalnız `app-config.js` üzerinden değiştir
7. CI ve runtime smoke check'i yeşil tut

Bu yaklaşımın amacı, uygulama büyürken navigasyon, arama, PWA ve veri akışının yeniden kırılmasını önlemektir.
