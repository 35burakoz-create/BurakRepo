# Generated for Nelamar Stock stock photo album fields
from django.db import migrations, models
import inventory.models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0007_product_crate_m2'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='photo_album_url',
            field=models.URLField(blank=True, verbose_name='Fotoğraf albümü URL'),
        ),
        migrations.AddField(
            model_name='product',
            name='cover_image',
            field=models.FileField(blank=True, upload_to='covers/%Y/%m/', validators=[inventory.models.validate_cover_image], verbose_name='Kapak fotoğrafı'),
        ),
        migrations.AddField(
            model_name='product',
            name='video_url',
            field=models.URLField(blank=True, verbose_name='Video URL'),
        ),
        migrations.AddField(
            model_name='product',
            name='photo_status',
            field=models.CharField(choices=[('missing', 'Fotoğraf yok'), ('pending', 'Beklemede'), ('ready', 'Hazır'), ('needs_update', 'Güncelleme gerekli')], default='missing', max_length=30, verbose_name='Fotoğraf durumu'),
        ),
        migrations.AddField(
            model_name='product',
            name='photo_note',
            field=models.TextField(blank=True, verbose_name='Fotoğraf notu'),
        ),
    ]
