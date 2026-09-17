# LEGAL & PRIVACY (TR-first)

## 1) Hangi veriler tutulur?
- Kimlik: Supabase Auth kullanıcı kimliği
- Uygulama verisi: hesaplar, işlemler, bütçeler, kişiler, anlaşmalar, tahsilat planları
- Tercihler: dil, tema, AI açık/kapalı, rehber tur durumu, ek depolama tercihi

## 2) AI nasıl çalışır?
- AI çağrıları yalnızca sunucu tarafında (Supabase Edge Functions) yapılır.
- Flutter uygulamasında OpenAI anahtarı tutulmaz.
- AI'ya gönderilen metinler PII maskelemesinden geçer (e-posta/telefon/ad-soyad vb.).
- Kişi adları token’lanır (ör. “Müşteri A”).

## 3) Loglama ilkesi
- AI logları yalnızca şu metadataları saklar:
  - `feature_name`, `prompt_version`, `workspace_id`, `success/failure`, `latency_ms`, `timestamp`
- Ham kullanıcı metni ve doğrudan kimlikleyici içerikler loglanmaz.

## 4) KVKK/GDPR hakları
- **Veri dışa aktarma:** Ayarlar > Veri Yönetimi > “Verilerimi Dışa Aktar”
- **Hesap silme:** Ayarlar > Veri Yönetimi > “Hesabı ve Tüm Verileri Sil”
  - `DELETE` yazarak onay gerekir.
  - Kullanıcı workspace sahibiyse workspace verileri silinir.
  - Sadece üyeyse üyelik kaldırılır.

## 5) Plan ve kota
- FREE: AI aylık kota -> categorize=30, weekly_summary=2, nl_query=10, collection_message=0
- PERSONAL_PREMIUM: 300/5/100/0
- BUSINESS: 500/5/300/200
- Kota ve erişim kontrolleri sunucu tarafında doğrulanır.

## 6) Güvenlik ve erişim
- RLS ile tüm workspace tabloları üyelik bazlı sınırlandırılır.
- `accountant` rolü Personal workspace verilerine erişemez.
- AI çağrılarında günlük kota/rate-limit uygulanır.

## 7) Platform izinleri
- Repo içinde Android/iOS platform klasörleri şu an bulunmadığı için manifest izin denetimi build çıktısında ayrıca yapılmalıdır.
- Hedef politika: SMS/Çağrı Kaydı/Kişiler/Accessibility izinleri eklenmez.

## 8) Ekler ve yerel önbellek
- Ekler için “Bulut” veya “Cihaz” tercihi sunulur (Bulut önerilir).
- Yükleme öncesi görsel sıkıştırma politikası belirtilir.
- Yerel önbellek için ~200MB sınır bilgisi ve “Önbelleği Temizle” aksiyonu vardır.

---

## EN Summary
- AI is server-side only; no OpenAI key in Flutter app.
- AI payloads are masked/tokenized before processing.
- Logs keep metadata only (no raw text).
- Users can export data or delete account/data from Settings.
- RLS enforces workspace scoping; accountant cannot access Personal data.
