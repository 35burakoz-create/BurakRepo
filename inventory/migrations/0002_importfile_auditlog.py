# Generated for Nelamar Stock security/audit additions
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import inventory.models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ImportFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Güncellenme')),
                ('file', models.FileField(upload_to='imports/%Y/%m/', validators=[inventory.models.validate_excel_file], verbose_name='İçe aktarma dosyası')),
                ('original_name', models.CharField(max_length=255, verbose_name='Orijinal dosya adı')),
                ('processed', models.BooleanField(default=False, verbose_name='İşlendi')),
                ('delete_after_processing', models.BooleanField(default=True, verbose_name='İşlem sonrası sil')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Yükleyen kullanıcı')),
            ],
            options={'verbose_name': 'İçe aktarma dosyası', 'verbose_name_plural': 'İçe aktarma dosyaları', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Tarih')),
                ('action', models.CharField(choices=[('create', 'Oluşturma'), ('update', 'Güncelleme'), ('delete', 'Silme'), ('login', 'Giriş'), ('logout', 'Çıkış'), ('report', 'Rapor')], max_length=20, verbose_name='İşlem')),
                ('model_name', models.CharField(max_length=120, verbose_name='Model')),
                ('object_id', models.CharField(blank=True, max_length=64, verbose_name='Nesne ID')),
                ('object_repr', models.CharField(blank=True, max_length=255, verbose_name='Nesne')),
                ('details', models.JSONField(blank=True, default=dict, verbose_name='Detay')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Kullanıcı')),
            ],
            options={'verbose_name': 'Audit log', 'verbose_name_plural': 'Audit logları', 'ordering': ['-created_at']},
        ),
    ]
