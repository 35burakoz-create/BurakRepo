# Radyo Günlüğüm — V3.7.4 Router & Event Migration

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

`app-core-bridge.js`, eski feature katmanları yüklenmeden önce çekirdeğin temiz `R.switch` fonksiyonunu `R.coreSwitch` olarak sabitler. Bu sayede daha eski V38/V41/V42 dosyalarında rollback amacıyla kalan wrapper kodları production navigasyon yoluna dahil edilmez.

`app-bootstrap.js` gelişmiş özellik modüllerini deterministik sırada yükler ve en sonda `R.boot()` çağrısını yalnız bir kez çalıştırır. Eski `insights.js`, `v39-navigation-state.js`, `v40-radio-memory.js` ve `v43-search-hotfix.js` production başlangıç yolunda kullanılmaz.

### Foundation servisleri

`app-foundation.js` ortak servisleri sağlar:

- `R.events` — küçük event bus
- `R.clock` — `Europe/Istanbul` merkezli ortak saat servisi
- `R.store` — log / rehber durumu ve arama indeksleri
- `R.features` — feature registry
- `R.diagnostics` — runtime hata ve sistem durumu tanıları

V3.7.4 ile navigasyonun aktif sahibi `app-router-core.js` oldu:

- `R.router` — tek public router
- `R.switch` — yalnız `R.router.go(...)` için compatibility giriş noktası
- gerçek DOM sekme geçişi — `R.coreSwitch` üzerinden yapılır
- Home / Şu An / Propagation / Memory gibi dinamik ekranlar route adapter'ları ile hazırlanır
- route değişimleri `route:before` ve `route:changed` event'leri üretir

`app-ui-state.js`, artık `R.switch` fonksiyonunu sarmalamadan aşağıdaki UI state davranışlarını yönetir:

- URL hash (`#tab=...`)
- tarayıcı geri / ileri
- son açık sekme
- sekme scroll konumu
- Şu An SW/MW/FM filtresi
- Günlük / rehber / takvim filtreleri
- kaydedilmemiş günlük taslağı
- startup sırasında eski katmanların istemeden Home'a yönlendirmesine karşı kısa boot guard

## Radio Memory

V3.7.2 ile eski V40 production yolundan çıkarıldı. `app-memory.js` doğrudan Foundation Store indekslerini kullanır ve `memory` route'unu `R.router.register(...)` ile kaydeder.

Profil ekranında ilk bakışta yalnız dört ana metrik gösterilir; diğer istatistikler açılır ayrıntı bölümündedir.

## Arama

V44 global arama motoru Foundation Store indeksini kullanabilir. Arama şu alanları kapsar:

- istasyon
- ülke
- frekans
- dil
- program / not / transkript
- yayın rehberi
- uygulama araçları

## Visual Foundation

`styles.css` legacy bileşen stillerini taşımaya devam eder; fakat `app-base.css` ondan hemen sonra yüklenerek uygulamanın temel görsel sistemini merkezi hale getirir.

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

`sw.js`, cache sürümünü `app-config.js` üzerinden alır. Yerel asset precache işlemi tek bir eksik dosya yüzünden tüm service worker kurulumunu düşürmemek için dosyaları bağımsız olarak önbelleğe alır.

Supabase, NOAA SWPC ve Hugging Face model kaynakları kendi ağ politikalarıyla çalışır; canlı veri istekleri service worker tarafından zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

Uygulama içinde **Menü → Sistem Durumu** bölümünden router, store, arama, Radio Memory, Propagation ve PWA durumu görülebilir. Runtime JavaScript hataları yerelde sınırlı bir tanı geçmişinde tutulur.

`app-smoke.js`, kullanıcı verisini değiştirmeden özellikle şunları kontrol eder:

- pristine core bridge
- `app-router-core` provider
- `app-ui-state` provider
- V39 ve V40'ın production'da yüklenmemesi
- Global Search
- Radio Memory
- Propagation
- Home / Şu An dinamik görünümleri

GitHub Actions'taki **Radio Foundation Check** workflow'u production zincirindeki önemli JavaScript dosyalarında `node --check` ve mimari regresyon kontrolleri çalıştırır.

## Veri ve Supabase

Supabase projesi: `radyo-gunlugum-v1-1` (`mesbtntnclokgzgunept`).

Başlıca veri alanları:

- `radio_logs`
- `station_schedules`
- `radio_session_attempts`
- `radio_ai_analyses`
- Radio Memory ve Propagation için mevcut günlük/deneme verileri

`radio-audio` bucket'ı private'tır ve kullanıcı bazlı Storage RLS politikaları kullanır. Service-role anahtarı istemci kodunda kullanılmaz.

## Geliştirme kuralı

Yeni özelliklerde tercih edilen sıra:

1. mevcut Foundation servisini kullan
2. gerekirse `router.register(...)` veya feature API ekle
3. modüller arası iletişim için `R.events` / `R.store` kullan
4. `R.switch`, `R.load`, `R.show` gibi çekirdek fonksiyonlara yeni wrapper ekleme
5. sürüm bilgisini yalnız `app-config.js` üzerinden değiştir
6. CI ve runtime smoke check'i yeşil tut

Bu yaklaşımın amacı, uygulama büyürken navigasyon, arama, PWA ve veri akışının yeniden kırılmasını önlemektir.
