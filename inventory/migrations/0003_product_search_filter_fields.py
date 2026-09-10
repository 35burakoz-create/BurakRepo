# Generated for Nelamar Stock stock search/filter fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0002_importfile_auditlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='material_name',
            field=models.CharField(blank=True, max_length=160, verbose_name='Malzeme adı'),
        ),
        migrations.AddField(
            model_name='product',
            name='cut_direction',
            field=models.CharField(blank=True, max_length=80, verbose_name='Kesim yönü'),
        ),
        migrations.AddField(
            model_name='product',
            name='surface_finish',
            field=models.CharField(blank=True, max_length=80, verbose_name='Yüzey işlemi'),
        ),
        migrations.AddField(
            model_name='product',
            name='quality',
            field=models.CharField(blank=True, max_length=80, verbose_name='Kalite'),
        ),
        migrations.AddField(
            model_name='product',
            name='thickness',
            field=models.CharField(blank=True, max_length=40, verbose_name='Kalınlık'),
        ),
        migrations.AddField(
            model_name='product',
            name='size',
            field=models.CharField(blank=True, max_length=120, verbose_name='Ölçü'),
        ),
        migrations.AddField(
            model_name='product',
            name='status',
            field=models.CharField(choices=[('available', 'Satılabilir'), ('reserved', 'Rezerve'), ('sold', 'Satıldı'), ('hold', 'Beklemede')], default='available', max_length=20, verbose_name='Durum'),
        ),
    ]
