# Generated for Nelamar Stock estimated weight calculations
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0006_product_partially_sold_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='crate_m2',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Kasa m²'),
        ),
    ]
