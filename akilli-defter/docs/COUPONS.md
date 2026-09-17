# Kupon / Promosyon Kodu (Google Play uyumlu akış)

Bu projede **uygulama içi özel indirim kodu** (ör. `SAVE10`) uygulanmaz.
Google Play abonelik kurallarına uyum için promosyon kodları yalnızca Play Store üzerinden kullanılır.

## 1) Play Console'da promosyon kodu oluşturma (yüksek seviye)
1. Google Play Console'da ilgili uygulamayı açın.
2. Monetization/Subscriptions bölümünden ilgili aboneliği seçin.
3. Promosyon kodu veya uygun abonelik teklifini oluşturun.
4. Kodları hedef kullanıcı grubuna dağıtın (internal testing / kapalı test önerilir).

> Not: Kurguya göre promosyon kodu ücretsiz deneme, indirimli dönem veya uygun ürüne bağlı farklı haklar sağlayabilir.

## 2) Kullanıcı tarafı kullanım adımları
1. Kullanıcı Play Store'da **Ödemeler ve abonelikler > Kodu kullan** adımından kodu kullanır.
2. Uygulamaya geri döner.
3. Ayarlar > **Kupon / Promosyon Kodu** ekranında:
   - **Satın alımı geri yükle**
   - **Durumu yenile**
   düğmelerine dokunur.
4. EntitlementService mağaza bilgisini yeniler ve plan hakları güncellenir.

## 3) Internal testing doğrulama
1. Test hesabını internal testing kanalına ekleyin.
2. Test kodunu Play Store'da kullanın.
3. Uygulamada geri yükleme + yenileme adımlarını çalıştırın.
4. Plan/özellik kilitlerinin açıldığını doğrulayın.

## 4) Uyum notu
- Uygulama, “kodu buraya gir anında indirim” gibi yanıltıcı bir iddia içermez.
- Kod doğrulama ve fiyatlama Play Store/abonelik altyapısının kendi mekanizmasıyla yönetilir.
