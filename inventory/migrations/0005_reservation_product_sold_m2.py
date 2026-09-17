# Generated for Nelamar Stock reservations
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0004_update_stockmovement_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='sold_m2',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Satılan (m²)'),
        ),
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('customer_name', models.CharField(max_length=160, verbose_name='Müşteri adı')),
                ('reserved_m2', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Rezerve m²')),
                ('valid_until', models.DateField(verbose_name='Geçerlilik tarihi')),
                ('note', models.TextField(blank=True, verbose_name='Not')),
                ('status', models.CharField(choices=[('active', 'Aktif'), ('expired', 'Süresi Doldu'), ('cancelled', 'İptal Edildi'), ('converted_to_sale', 'Satışa Dönüştü')], default='active', max_length=30, verbose_name='Durum')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Kullanıcı')),
                ('stock_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to='inventory.product', verbose_name='Stok kalemi')),
            ],
            options={'verbose_name': 'Rezervasyon', 'verbose_name_plural': 'Rezervasyonlar', 'ordering': ['valid_until', '-created_at']},
        ),
    ]
