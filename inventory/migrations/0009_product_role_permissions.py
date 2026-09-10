# Generated for Nelamar Stock role-based permissions
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0008_product_photo_fields'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='product',
            options={
                'verbose_name': 'Ürün',
                'verbose_name_plural': 'Ürünler',
                'ordering': ['sku'],
                'permissions': [
                    ('view_dashboard', 'Dashboard görüntüleyebilir'),
                    ('export_reports', 'PDF/Excel rapor oluşturabilir'),
                    ('import_stock', 'Stok import edebilir'),
                    ('process_sale', 'Satıştan stok düşebilir'),
                    ('view_prices', 'Satış fiyatlarını görebilir'),
                ],
            },
        ),
    ]
