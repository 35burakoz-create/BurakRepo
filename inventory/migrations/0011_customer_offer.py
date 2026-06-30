# Generated for Nelamar Stock export module
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0010_seed_roles'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('company_name', models.CharField(max_length=180, verbose_name='Şirket adı')),
                ('country', models.CharField(max_length=120, verbose_name='Ülke')),
                ('contact_name', models.CharField(blank=True, max_length=160, verbose_name='Yetkili kişi')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='E-posta')),
                ('phone', models.CharField(blank=True, max_length=80, verbose_name='Telefon')),
                ('whatsapp', models.CharField(blank=True, max_length=80, verbose_name='WhatsApp')),
                ('note', models.TextField(blank=True, verbose_name='Not')),
            ],
            options={
                'verbose_name': 'Müşteri',
                'verbose_name_plural': 'Müşteriler',
                'ordering': ['company_name'],
            },
        ),
        migrations.CreateModel(
            name='Offer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('offer_number', models.CharField(max_length=60, unique=True, verbose_name='Teklif numarası')),
                ('currency', models.CharField(default='USD', max_length=10, verbose_name='Para birimi')),
                ('incoterm', models.CharField(blank=True, max_length=40, verbose_name='Incoterm')),
                ('payment_terms', models.CharField(blank=True, max_length=180, verbose_name='Ödeme koşulları')),
                ('validity_date', models.DateField(verbose_name='Geçerlilik tarihi')),
                ('status', models.CharField(choices=[('draft', 'Taslak'), ('sent', 'Gönderildi'), ('waiting_reply', 'Yanıt Bekleniyor'), ('reserved', 'Rezerve'), ('confirmed', 'Onaylandı'), ('lost', 'Kaybedildi'), ('cancelled', 'İptal Edildi')], default='draft', max_length=30, verbose_name='Durum')),
                ('note', models.TextField(blank=True, verbose_name='Not')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Kullanıcı')),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='offers', to='inventory.customer', verbose_name='Müşteri')),
                ('selected_stock_items', models.ManyToManyField(related_name='offers', to='inventory.product', verbose_name='Seçilen stoklar')),
            ],
            options={
                'verbose_name': 'Teklif',
                'verbose_name_plural': 'Teklifler',
                'ordering': ['-created_at'],
            },
        ),
    ]
