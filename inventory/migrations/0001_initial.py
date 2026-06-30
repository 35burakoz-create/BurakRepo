# Generated for Nelamar Stock initial schema
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='Konum adı')),
                ('address', models.TextField(blank=True, verbose_name='Adres/not')),
            ],
            options={'verbose_name': 'Konum', 'verbose_name_plural': 'Konumlar', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('sku', models.CharField(max_length=60, unique=True, verbose_name='Stok kodu')),
                ('name', models.CharField(max_length=160, verbose_name='Ürün adı')),
                ('product_type', models.CharField(choices=[('marble', 'Mermer'), ('travertine', 'Traverten'), ('other', 'Diğer')], max_length=20, verbose_name='Ürün tipi')),
                ('block_no', models.CharField(blank=True, max_length=80, verbose_name='Blok/kasa no')),
                ('finish', models.CharField(blank=True, max_length=80, verbose_name='Yüzey işlemi')),
                ('dimensions', models.CharField(blank=True, max_length=120, verbose_name='Ebat')),
                ('quantity_m2', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Miktar (m²)')),
                ('reserved_m2', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Rezerve (m²)')),
                ('unit_price_usd', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Birim fiyat (USD)')),
                ('notes', models.TextField(blank=True, verbose_name='Notlar')),
                ('location', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='products', to='inventory.location', verbose_name='Konum')),
            ],
            options={'verbose_name': 'Ürün', 'verbose_name_plural': 'Ürünler', 'ordering': ['sku']},
        ),
        migrations.CreateModel(
            name='StockMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('movement_type', models.CharField(choices=[('in', 'Stok Girişi'), ('sale', 'Satış'), ('reservation', 'Rezervasyon'), ('release', 'Rezervasyon İptali'), ('transfer', 'Konum Transferi')], max_length=20, verbose_name='Hareket tipi')),
                ('quantity_m2', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Miktar (m²)')),
                ('customer', models.CharField(blank=True, max_length=160, verbose_name='Müşteri')),
                ('document_no', models.CharField(blank=True, max_length=80, verbose_name='Belge no')),
                ('notes', models.TextField(blank=True, verbose_name='Notlar')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Kullanıcı')),
                ('from_location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='outgoing_movements', to='inventory.location', verbose_name='Çıkış konumu')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movements', to='inventory.product', verbose_name='Ürün')),
                ('to_location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='incoming_movements', to='inventory.location', verbose_name='Varış konumu')),
            ],
            options={'verbose_name': 'Stok hareketi', 'verbose_name_plural': 'Stok hareketleri', 'ordering': ['-created_at']},
        ),
    ]
