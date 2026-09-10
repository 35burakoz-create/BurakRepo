# Codex çalışma kuralları

Bu depo Codex web üzerinden küçük ve kontrollü değişikliklerle geliştirilecektir.

- Her görev küçük, gözden geçirilebilir ve geri alınabilir değişiklikler yapmalıdır.
- Büyük mimari değişikliklerden önce kısa bir plan yazılmalıdır.
- Gerçek şirket verisi, gerçek müşteri verisi, fiyat listesi, Google Photos albüm linkleri veya hassas dosyalar repoya eklenmemelidir.
- Test ve demo için yalnızca sahte örnek veri kullanılmalıdır.
- `.env`, veritabanı dosyaları, upload edilen Excel/CSV dosyaları, PDF çıktıları ve medya dosyaları commit edilmemelidir.
- Gereksiz paket eklenmemelidir; paket eklenirse README içinde nedeni açıklanmalıdır.
- Güvenlik, yetki ve audit log mantığını bozacak değişiklik yapılmamalıdır.
- Uygulama ilk aşamada internete açık değildir; lokal veya şirket içi ağ kullanımı için tasarlanmalıdır.
- Her değişiklik sonunda değiştirilen dosyalar ve test etme yöntemi açıklanmalıdır.
