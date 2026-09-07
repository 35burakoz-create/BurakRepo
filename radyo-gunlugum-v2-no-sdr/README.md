# Radyo Günlüğüm — V3.7.1 Foundation

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

V3.7 ile önceki sürümlerde üst üste eklenen loader ve hotfix zinciri konsolide edilmeye başlandı.

### Statik başlangıç

`index.html` yalnızca temel bağımlılıkları yükler:

1. `app-config.js`
2. Supabase ve Leaflet
3. `core.js`
4. `audio-smart.js`
5. `v21-guide.js`
6. `v22-mobile.js`
7. `app-insights.js`
8. `app-bootstrap.js`

`app-bootstrap.js` gelişmiş özellik modüllerini deterministik sırada yükler ve en sonda `R.boot()` çağrısını yalnız bir kez çalıştırır.

Eski `insights.js` dinamik modül loader'ı ve `v43-search-hotfix.js` production başlangıç yolunda kullanılmaz.

### Foundation servisleri

`app-foundation.js` yeni kod için ortak servisleri sağlar:

- `R.router` — merkezi navigasyon giriş noktası
- `R.events` — küçük event bus
- `R.clock` — `Europe/Istanbul` merkezli ortak saat servisi
- `R.store` — log / rehber durumu ve arama indeksleri
- `R.features` — feature registry
- `R.diagnostics` — runtime hata ve sistem durumu tanıları

Eski modüller henüz tamamen yeniden yazılmadı; Foundation mevcut davranışın üstünde kontrollü geçiş katmanı olarak çalışır. Yeni geliştirmelerde mümkün olduğunca Foundation API'leri kullanılmalıdır; `R.switch`, `R.load` veya başka çekirdek fonksiyonların yeni wrapper'larla tekrar override edilmesinden kaçınılmalıdır.

## Arama

V3.6.2 ile yeniden yazılan V44 arama motoru V3.7.1'de Foundation Store indeksini kullanabilir. Arama şu alanları kapsar:

- istasyon
- ülke
- frekans
- dil
- program / not / transkript
- yayın rehberi
- uygulama araçları

## PWA ve offline

`sw.js`, cache sürümünü `app-config.js` üzerinden alır. Yerel asset precache işlemi tek bir eksik dosya yüzünden tüm service worker kurulumunu düşürmemek için dosyaları bağımsız olarak önbelleğe alır.

Supabase, NOAA SWPC ve Hugging Face model kaynakları kendi ağ politikalarıyla çalışır; canlı veri istekleri service worker tarafından zorla cache'lenmez.

## Tanı ve regresyon kontrolleri

Uygulama içinde **Menü → Sistem Durumu** bölümünden router, store, arama, Radio Memory, Propagation ve PWA durumu görülebilir. Runtime JavaScript hataları yerelde sınırlı bir tanı geçmişinde tutulur.

`app-smoke.js`, kullanıcı verisini değiştirmeden temel runtime kontrollerini çalıştırır.

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

Yeni özellik eklemeden önce şu sıra tercih edilir:

1. mevcut Foundation servisini kullan
2. gerekirse feature API ekle
3. event/store üzerinden haberleş
4. çekirdek fonksiyonları yeni wrapper'larla sarmalama
5. CI ve runtime smoke check'i yeşil tut

Bu yaklaşımın amacı, uygulamanın özellik sayısı büyürken navigasyon, arama, PWA ve veri akışının yeniden kırılmasını önlemektir.
