# Generated for Nelamar Stock sale status
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0005_reservation_product_sold_m2'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='status',
            field=models.CharField(choices=[('available', 'Satılabilir'), ('reserved', 'Rezerve'), ('sold', 'Satıldı'), ('partially_sold', 'Kısmi Satıldı'), ('hold', 'Beklemede')], default='available', max_length=20, verbose_name='Durum'),
        ),
    ]
