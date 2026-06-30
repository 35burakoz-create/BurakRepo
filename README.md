# Nelamar Stock

Copyright © 2026 Burak ÖZ. All rights reserved.

Nelamar Stock, mermer/traverten ihracatı yapan şirketler için hazırlanmış Django tabanlı web stok takip sistemidir. İlk aşamada lokal bilgisayarda veya şirket içi ağda çalışacak şekilde tasarlanmıştır; internete açık canlı sistem olarak kullanılmadan önce ek güvenlik adımları uygulanmalıdır.

## Bu program ne işe yarar?

Nelamar Stock ile şunları yapabilirsiniz:

- Stok kartı oluşturma ve düzenleme.
- Stokların A/B sıra ve X/Y/T/Z bölme mantığıyla krokide görülmesi.
- Stok konumu değiştirme.
- Rezervasyon oluşturma ve iptal etme.
- Satıştan m² düşme.
- Fotoğraf albümü, kapak görseli ve video linki tutma.
- Filtrelenmiş stok listesini PDF veya Excel olarak dışa aktarma.
- Mevcut Excel stok dökümünü önizleyerek içeri alma.
- Müşteri ve ihracat teklif taslağı oluşturma, teklif PDF çıktısı alma.
- Audit log ve stok hareket geçmişi ile önemli işlemleri izleme.

> **Önemli uyarı:** Gerçek şirket verisini, gerçek müşteri bilgisini, fiyat listesini, Google Photos albüm linklerini, `.env` dosyasını, veritabanı dosyasını, Excel yüklemelerini, PDF çıktıları veya medya dosyalarını Codex/GitHub'a koymayın. Test ve demo için sadece sahte örnek veri kullanın.

## Gereksinimler

- Python 3.11 veya üzeri önerilir.
- İlk aşamada SQLite kullanılır; ayrı veritabanı sunucusu gerekmez.
- Komutları proje klasörünün içinde çalıştırın.


## Windows’ta İlk Kurulum

Bu bölüm Windows kullanan ve komut satırına alışık olmayan kullanıcılar içindir. Gerçek şirket verisi, gerçek Excel dosyası, gerçek müşteri bilgisi veya gerçek Google Photos linki eklemeyin; ilk denemede sadece sahte/demo veri kullanın.

### 1. ZIP olarak indirme

1. Proje sayfasında **Download ZIP** veya benzer indirme seçeneğini kullanın.
2. ZIP dosyasını bilgisayarınıza indirin.
3. Dosyayı masaüstüne veya kolay bulacağınız bir klasöre taşıyın.

### 2. Klasörü çıkarma

1. ZIP dosyasına sağ tıklayın.
2. **Tümünü Ayıkla / Extract All** seçeneğine basın.
3. Oluşan klasörü açın.
4. Klasörün içinde `manage.py`, `requirements.txt`, `setup_windows.bat` ve `start_windows.bat` dosyalarını görmelisiniz.

### 3. İlk kurulumu başlatma

1. `setup_windows.bat` dosyasına çift tıklayın.
2. Windows güvenlik uyarısı gösterirse dosyanın bu proje klasöründen geldiğini kontrol edin ve çalıştırın.
3. Bu dosya otomatik olarak sanal ortam oluşturur, paketleri yükler, `.env` dosyasını hazırlar ve veritabanı migration işlemlerini çalıştırır.
4. İşlem bitince ekranda admin kullanıcı oluşturma talimatı gösterilir.

### 4. Admin kullanıcı oluşturma

`setup_windows.bat` tamamlandıktan sonra aynı siyah komut penceresinde şu komutu yazın:

```bat
python manage.py createsuperuser
```

Örnek olarak şunları girebilirsiniz:

```text
Username: admin
Email address: admin@example.local
Password: güçlü-bir-şifre-yazın
Password (again): aynı-şifreyi-yazın
```

Şifre yazarken ekranda karakter görünmemesi normaldir. Ortak kullanıcı hesabı kullanmayın; gerçek kullanımda her kişi için ayrı kullanıcı oluşturun.

### 5. Programı açma

1. Kurulumdan sonra `start_windows.bat` dosyasına çift tıklayın.
2. Bu dosya sanal ortamı aktif eder ve Django geliştirme sunucusunu sadece lokal kullanım için `127.0.0.1:8000` adresinde başlatır.
3. Tarayıcınızı açın ve şu adrese girin:

```text
http://127.0.0.1:8000/
```

Admin paneli için:

```text
http://127.0.0.1:8000/admin/
```

Program penceresini kapatmak için komut penceresinde `CTRL+C` yapın. Daha sonra tekrar açmak için yeniden `start_windows.bat` dosyasına çift tıklayın.

## Sıfırdan Kurulum Adımları

Aşağıdaki adımlar hiç Django bilmeyen bir kullanıcı için sırayla yazılmıştır.

### 1. Python kurulumu

Python kurulu değilse işletim sisteminize uygun Python sürümünü kurun. Kurulumdan sonra terminal/komut satırında kontrol edin:

```bash
python --version
```

Bazı sistemlerde komut `python3` olabilir:

```bash
python3 --version
```

### 2. Proje dosyalarını indirme

Git kullanıyorsanız projeyi indirin:

```bash
git clone <repo-adresi> nelamar_stock
cd nelamar_stock
```

ZIP olarak aldıysanız ZIP dosyasını açın ve terminalde açılan proje klasörüne girin:

```bash
cd nelamar_stock
```

### 3. `.env` dosyasını hazırlama

Örnek ayar dosyasını kopyalayın:

```bash
cp .env.example .env
```

Windows PowerShell kullanıyorsanız:

```powershell
Copy-Item .env.example .env
```

`.env` dosyasını açın ve en az `DJANGO_SECRET_KEY` değerini uzun/rastgele bir değerle değiştirin. `.env` dosyası Git'e eklenmemelidir.

### 4. Sanal ortam oluşturma

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Komut satırında `(.venv)` görüyorsanız sanal ortam aktiftir.

### 5. Paketleri yükleme

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Kullanılan paketler:

- `Django`: Web uygulaması, kullanıcı girişi, admin paneli, ORM ve şablon sistemi için.
- `ReportLab`: PDF rapor ve teklif çıktıları için.
- `openpyxl`: Excel import/export işlemleri için.

### 6. Veritabanını hazırlama

SQLite veritabanı migration komutuyla hazırlanır:

```bash
python manage.py migrate
```

Bu işlem `database/db.sqlite3` dosyasını oluşturur. Bu dosya Git'e eklenmez.

### 7. İlk admin kullanıcısını oluşturma

Aşağıdaki komutla admin kullanıcısı oluşturun:

```bash
python manage.py createsuperuser
```

Örnek girişler:

```text
Username: admin
Email address: admin@example.local
Password: güçlü-bir-şifre-yazın
Password (again): aynı-şifreyi-yazın
```

> Örnek kullanıcı adı sadece ilk kurulum anlatımı içindir. Canlı/gerçek kullanımda güçlü ve kişiye özel kullanıcı hesapları oluşturun; ortak kullanıcı hesabı kullanmayın.

### 8. Sahte demo stok verisi ekleme

Gerçek şirket verisi kullanmadan demo stok ve demo konum oluşturmak için:

```bash
python manage.py seed_demo
```

Demo veriyi sıfırlayıp yeniden oluşturmak için:

```bash
python manage.py seed_demo --reset
```

Bu komut yalnızca `DEMO-` ile başlayan sahte stokları ve sahte demo konumları kullanır. Gerçek müşteri, gerçek fiyat veya gerçek fotoğraf linki eklemez.

### 9. Programı çalıştırma

```bash
python manage.py runserver
```

Tarayıcıda açın:

```text
http://127.0.0.1:8000/
```

Admin paneli:

```text
http://127.0.0.1:8000/admin/
```

Programı durdurmak için terminalde `CTRL+C` kullanın.

## İlk Açılışta Yapılacak Ayarlar

Program ilk kez açıldıktan sonra şu ayarları kontrol edin:

1. **Şirket bilgileri:** `nelamar_stock/settings.py` ve `.env` içinde şirket adı, telif metni ve host ayarlarını kontrol edin.
2. **A/B sıraları:** Kroki mantığında sol taraf A, sağ taraf B olarak çalışır. Satır sayısı `KROKI_ROWS` ayarıyla belirlenir.
3. **X/Y/T/Z bölmeleri:** A tarafı soldan sağa `Z, T, Y, X`; B tarafı soldan sağa `X, Y, T, Z` olarak tanımlıdır.
4. **Kalınlık katsayıları:** Tahmini ağırlık hesapları `Product.THICKNESS_WEIGHT_COEFFICIENTS` içinde tutulur. Tanımsız kalınlıklarda “Katsayı tanımlı değil” gösterilir.
5. **Kullanıcı rolleri:** Migration sonrası `Admin`, `Warehouse`, `Sales`, `Viewer` grupları oluşur. Admin panelinden kullanıcıları uygun gruplara ekleyin.

## Rol Mantığı

- **Admin:** Her şeyi yapabilir; kullanıcı ve yetki yönetebilir.
- **Warehouse:** Stok ekleyebilir/düzenleyebilir, konum değiştirebilir, fotoğraf linki ekleyebilir; satış fiyatlarını göremez.
- **Sales:** Stokları görür, arama/filtreleme yapar, rezervasyon oluşturur, satıştan düşer, PDF/Excel rapor ve teklif çıktısı oluşturur.
- **Viewer:** Sadece stok listesi ve krokiyi görür; değişiklik yapamaz.

## Günlük Kullanım Adımları

### Stok ekleme

1. Programa giriş yapın.
2. Üst menüden **Stok** sayfasına gidin.
3. **Yeni stok** butonuna basın.
4. Malzeme adı, kesim yönü, yüzey, kalite, kalınlık, ölçü, konum ve m² bilgilerini girin.
5. Kaydedin.

### Konum değiştirme

1. **Stok** listesinden ilgili stok detayına girin.
2. **Konum Değiştir** butonuna basın.
3. Yeni `side`, `row_number` ve `section` değerlerini seçin.
4. Kaydedin. İşlem stok hareket geçmişine işlenir ve kroki otomatik güncellenir.

### Rezervasyon oluşturma

1. Stok detay sayfasını açın.
2. **Rezervasyon Oluştur** butonuna basın.
3. Müşteri adı, rezerve m², geçerlilik tarihi ve not girin.
4. Kaydedin. Rezerve m² stoktan düşülür ve hareket geçmişine kaydedilir.

### Satıştan düşme

1. Stok detayından **Satıştan Düş** butonuna basın veya üst menüden **Satış** ekranına girin.
2. Satılan m², müşteri adı, satış notu ve varsa bağlı rezervasyonu seçin.
3. Kaydedin. Satılabilir m² güncellenir; miktar biterse durum `sold`, kısmi satışta `partially_sold` olur.

### PDF stok raporu alma

1. **Stok** sayfasında arama/filtreleme yapın.
2. PDF seçeneklerinden konum, ağırlık, fotoğraf albümü ve satılabilir m² seçeneklerini belirleyin.
3. **PDF oluştur** butonuna basın.

### Excel dışa aktarma

1. **Stok** sayfasında istediğiniz filtreleri uygulayın.
2. **Excel’e aktar** butonuna basın.
3. İndirilen `.xlsx` dosyası aktif filtrelere göre hazırlanır.

### Kroki kullanma

1. Üst menüden **Kroki** sayfasına girin.
2. A tarafında satırlar `A1-Z A1-T A1-Y A1-X`, B tarafında `B1-X B1-Y B1-T B1-Z` düzeninde görünür.
3. Hücrede o konumdaki aktif stokların kısa bilgisi görünür.
4. Hücreye tıklayınca o konumdaki stok listesi açılır.
5. Stok detayındaki **Krokide Göster** butonu ilgili konuma gider.

### İhracat teklifi oluşturma

1. Önce **İhracat > Müşteriler** alanından müşteri oluşturun.
2. Stok detayında **Teklife Ekle** butonuna basın veya **İhracat > Yeni teklif** ekranına gidin.
3. Müşteri, teklif numarası, seçilecek stoklar, para birimi, incoterm, ödeme koşulları ve geçerlilik tarihini girin.
4. Teklifi kaydedin.
5. Teklif detayından **PDF indir** butonuyla teklif taslağı PDF’i alın.

## Excel Import Ekranı Nasıl Kullanılır?

1. Üst menüden **Excel Import** sayfasına gidin.
2. `.xlsx` veya `.csv` dosyanızı seçin.
3. Dosyayı yükleyin. Sistem önce önizleme gösterir.
4. Hatalı satırlar varsa ekranda listelenir; hataları Excel dosyasında düzeltip tekrar yükleyin.
5. Hata yoksa import onayını verin.
6. Başarılı import sonrası stok kayıtları oluşturulur.

Beklenen Excel sütun eşleşmeleri:

| Excel sütunu | Anlamı |
| --- | --- |
| B | Konum veya bölme bilgisi |
| C | Sıra bilgisi |
| D | Malzeme adı |
| E | Kesim yönü |
| F | Yüzey işlemi |
| G | Kalite |
| H | Kalınlık |
| I | Ölçü |
| K | Kasa m² |
| M | Toplam m² |

Excel/CSV dosyaları `uploads/imports/` altında tutulur veya işlem sonrası silinebilir. Bu dosyalar Git'e eklenmemelidir.

## İlk Kullanım Kontrol Listesi

- [ ] Python kuruldu ve `python --version` çalışıyor.
- [ ] Proje dosyaları indirildi.
- [ ] `.env.example` dosyası `.env` olarak kopyalandı.
- [ ] `DJANGO_SECRET_KEY` değiştirildi.
- [ ] Sanal ortam oluşturuldu ve aktif edildi.
- [ ] `python -m pip install -r requirements.txt` çalıştırıldı.
- [ ] `python manage.py migrate` çalıştırıldı.
- [ ] `python manage.py createsuperuser` ile admin kullanıcı oluşturuldu.
- [ ] İsteğe bağlı olarak `python manage.py seed_demo` ile sahte demo stok eklendi.
- [ ] `python manage.py runserver` ile program açıldı.
- [ ] Admin panelinde kullanıcılar uygun rollere eklendi.
- [ ] Gerçek şirket verisi, müşteri verisi, fiyat listesi veya fotoğraf linki GitHub/Codex ortamına eklenmedi.

## Geliştirme Notları

- Ana ayarlar `nelamar_stock/settings.py` içindedir.
- Stok uygulaması `inventory` modülündedir.
- Sabit seçimler Django `TextChoices` model yapılarıyla tutulur.
- Varsayılan veritabanı SQLite dosyası `database/db.sqlite3` olarak oluşur ve Git'e eklenmez.
- Demo veriler yalnızca `python manage.py seed_demo` komutuyla oluşturulan sahte kayıtlardan oluşmalıdır.

## Codex Web Geliştirme Kuralları

- Değişiklikleri küçük, kontrol edilebilir ve kolay review edilebilir tutun.
- Büyük mimari değişikliklerden önce kısa bir plan yazın.
- Gerçek şirket verisi, gerçek müşteri verisi, fiyat listesi, Google Photos albüm linki veya hassas dosya eklemeyin.
- Test ve demo için sadece sahte örnek veri kullanın.
- `.env`, veritabanı dosyaları, upload edilen Excel/CSV dosyaları, PDF çıktıları ve medya dosyaları GitHub'a commit edilmemelidir. Bu dosyalar `.gitignore` kapsamındadır.
- Güvenlik, permission ve audit log mantığını bozacak değişiklik yapmayın.
- Her değişiklikten sonra hangi dosyaların değiştiğini ve nasıl test edileceğini PR/final açıklamasında belirtin.

### Değişiklik Sonrası Kontrol Listesi

1. `git status --short` çıktısında `.env`, `database/`, `uploads/`, `reports/`, `media/`, Excel/CSV veya PDF çıktısı görünmemeli.
2. Test veya demo verisi gerekiyorsa yalnızca sahte firma, sahte müşteri, sahte SKU ve örnek fiyat/miktar kullanın.
3. Güvenlik, permission ve audit log davranışını etkileyen dosyalara dokunulduysa bunu PR/final açıklamasında ayrıca belirtin.
4. Çalıştırılan test/komutları ve sonucu PR/final açıklamasında yazın.
5. Yeni paket eklenmediyse bunu belirtmeye gerek yoktur; yeni paket eklendiyse gerekçesini bağımlılıklar bölümüne ekleyin.

## Bağımlılıklar

- `Django`: Web framework, kimlik doğrulama, admin paneli, ORM ve şablon altyapısı için kullanılır.
- `ReportLab`: Stok ve teklif PDF raporlarını üretmek için kullanılır.
- `openpyxl`: Mevcut `.xlsx` stok dökümlerini güvenli import önizlemesiyle içeri almak ve stok listesini Excel'e aktarmak için kullanılır.

Gereksiz paket eklemeyin. Yeni paket gerekiyorsa bu bölümde nedenini açıklayın ve üçüncü parti lisans bilgisini `THIRD_PARTY_NOTICES.md` içine ekleyin.

## Lisans

Bu proje proprietary/özel yazılımdır. Ayrıntılar için `LICENSE`, `NOTICE` ve üçüncü parti bağımlılıklar için `THIRD_PARTY_NOTICES.md` dosyalarına bakın.

## Security Notes

Bu uygulama ilk aşamada internete açık çalışacak şekilde tasarlanmamıştır; varsayılan hedef lokal bilgisayar veya şirket içi ağdır.

### Güvenli yerel/şirket içi kurulum

1. `.env.example` dosyasını `.env` olarak kopyalayın ve `DJANGO_SECRET_KEY` değerini uzun/rastgele bir değerle değiştirin.
2. `.env` dosyasını Git'e eklemeyin; `.gitignore` içinde hariç tutulmuştur.
3. Varsayılan veritabanı dosyası `database/db.sqlite3` altında tutulur. Uygulama çalışma dosyaları için yalnızca `database/`, `uploads/` ve `reports/` klasörleri kullanılacak şekilde ayarlanmıştır.
4. `DJANGO_ALLOWED_HOSTS` değerini sadece lokal veya şirket içi ağ host/IP değerleriyle sınırlandırın.
5. Her kullanıcı için ayrı hesap oluşturun; ortak kullanıcı hesabı kullanmayın.
6. Rolleri Django admin panelindeki `Groups` ve `Permissions` ile yönetin. Migration sonrası `Admin`, `Warehouse`, `Sales` ve `Viewer` grupları oluşturulur.
7. Ürün, müşteri, teklif, konum, stok hareketi, dosya import kaydı, giriş/çıkış ve rapor üretimi gibi önemli işlemler `AuditLog` modeliyle kayıt altına alınır.
8. Excel/CSV import dosyaları yalnızca `uploads/imports/` altında saklanacak şekilde modellenmiştir; izin verilen türler `.xlsx`, `.xls`, `.csv`, varsayılan maksimum boyut 5 MB'dir.
9. PDF rapor URL'leri login ve rol/permission kontrolü gerektirir; açık/public dosya URL'si olarak sunulmaz.

### Production veya internete açma hazırlığı

İleride uygulama internete açılırsa en az şu ayarları uygulayın:

```env
DJANGO_ENV=production
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<uzun-rastgele-secret>
DJANGO_ALLOWED_HOSTS=stok.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://stok.example.com
DJANGO_SECURE_COOKIES=True
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_HSTS_SECONDS=31536000
```

Ek olarak HTTPS terminasyonu, güçlü şifre politikası, MFA, rate limiting, düzenli yedekleme, log izleme ve güvenlik güncelleme süreci planlanmalıdır.
