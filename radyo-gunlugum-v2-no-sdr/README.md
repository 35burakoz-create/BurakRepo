# Radyo Günlüğüm V2 — RTL-SDR'siz

Bu sürüm Tecsun R-9012 ile RTL-SDR satın almadan kullanılmak üzere hazırlanmıştır.

## Özellikler
- Telefon–bilgisayar bulut senkronizasyonu (Supabase)
- FM / MW / SW1–SW10 günlük kayıtları
- Tarih, saat, frekans, konum/GPS, dil, ülke, istasyon, program, içerik türü, sinyal 1–5
- Anten yönü/açısı ve analog kadran notu
- Mikrofondan kısa ses kaydı veya ses dosyası yükleme; dosyalar kullanıcıya özel kapalı Storage alanında
- Tarayıcı SpeechRecognition ile canlı transkript
- Metinden dil önerisi
- Frekans + saat + dil + A26/MW referans çizelgesi ile istasyon/program aday puanlama
- A26/MW yayın rehberi başlangıç verileri
- Harita
- Dinleme takvimi
- QSL takip merkezi ve kopyalanabilir İngilizce reception report
- Bant/dil/istasyon istatistikleri
- Geçmiş sinyal puanlarından kişisel en iyi bant+saat tahmini
- CSV ve JSON yedek
- Gelecekte RTL-SDR bağlamak için `source = rtl_sdr` veri modeli hazır

## Önemli not
Genel amaçlı ücretli bir AI API'sine bağlı değildir. Canlı transkript, tarayıcı konuşma tanıma desteğini kullanır; istasyon/program önerisi referans çizelgesi ve puanlama mantığı ile yapılır. Kaydedilmiş bir ses dosyasını sunucuda Whisper benzeri bir modelle otomatik transkribe etme özelliği henüz harici AI servisi olmadan eklenmemiştir.

## Supabase
Proje: `radyo-gunlugum-v1-1` (`mesbtntnclokgzgunept`). `radio_logs` ve `station_schedules` tablolarında RLS açıktır. `radio-audio` bucket'ı private'tır ve kullanıcı klasörü bazlı Storage RLS politikaları kullanır.
