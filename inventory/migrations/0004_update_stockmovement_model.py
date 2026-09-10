# Generated for Nelamar Stock stock movement history fields
from django.db import migrations, models
import django.db.models.deletion


def map_legacy_movement_types(apps, schema_editor):
    StockMovement = apps.get_model('inventory', 'StockMovement')
    mapping = {
        'in': 'created',
        'sale': 'sold',
        'reservation': 'reserved',
        'release': 'reservation_cancelled',
        'transfer': 'location_changed',
    }
    for old_value, new_value in mapping.items():
        StockMovement.objects.filter(movement_type=old_value).update(movement_type=new_value)


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0003_product_search_filter_fields'),
    ]

    operations = [
        migrations.RenameField('stockmovement', 'product', 'stock_item'),
        migrations.RenameField('stockmovement', 'from_location', 'old_location'),
        migrations.RenameField('stockmovement', 'to_location', 'new_location'),
        migrations.RenameField('stockmovement', 'notes', 'note'),
        migrations.RemoveField('stockmovement', 'customer'),
        migrations.RemoveField('stockmovement', 'document_no'),
        migrations.AlterField(
            model_name='stockmovement',
            name='stock_item',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movements', to='inventory.product', verbose_name='Stok kalemi'),
        ),
        migrations.AlterField(
            model_name='stockmovement',
            name='movement_type',
            field=models.CharField(choices=[('created', 'Oluşturuldu'), ('updated', 'Güncellendi'), ('location_changed', 'Konum Değişti'), ('reserved', 'Rezerve Edildi'), ('reservation_cancelled', 'Rezervasyon İptal'), ('sold', 'Satıldı'), ('adjusted', 'Düzeltildi'), ('deleted', 'Silindi')], max_length=30, verbose_name='Hareket tipi'),
        ),
        migrations.AlterField(
            model_name='stockmovement',
            name='old_location',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='old_stock_movements', to='inventory.location', verbose_name='Eski konum'),
        ),
        migrations.AlterField(
            model_name='stockmovement',
            name='new_location',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='new_stock_movements', to='inventory.location', verbose_name='Yeni konum'),
        ),
        migrations.AlterField(
            model_name='stockmovement',
            name='quantity_m2',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Miktar (m²)'),
        ),
        migrations.AlterField(
            model_name='stockmovement',
            name='note',
            field=models.TextField(blank=True, verbose_name='Not'),
        ),
        migrations.RunPython(map_legacy_movement_types, migrations.RunPython.noop),
    ]
