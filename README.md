# BurakRepo

Şirket web sitesindeki ürün gamını tarayıp, stoktaki ürünler içinden en uyumlu 2 ürünü bulan ve her ürün için WhatsApp mesajı üreten basit CLI uygulaması.

## Kurulum

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Kullanım

```bash
python app.py --company "Tile AU" --url "https://example.com"
```

Opsiyonel parametreler:

- `--stock`: stok JSON dosya yolu (varsayılan `stock_products.json`)
- `--top-n`: döndürülecek ürün adedi (varsayılan `2`)

## Mesaj formatı

Her ürün için çıktı tam olarak şu şablonu takip eder:

```text
Hi <Şirket Adı>,
Burak from NELAMAR (Turkey).
<Ürün Adı>,
<Ürün Özelliği>
Are you interested in this stone or others?
Reply STOP to unsubscribe.
```

`Burak from NELAMAR (Turkey).`, `Are you interested in this stone or others?`, ve `Reply STOP to unsubscribe.` satırları sabittir.
