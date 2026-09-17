from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db import models
from django.urls import reverse


class TimestampedModel(models.Model):
    created_at = models.DateTimeField('Oluşturulma', auto_now_add=True)
    updated_at = models.DateTimeField('Güncellenme', auto_now=True)

    class Meta:
        abstract = True


class Location(TimestampedModel):
    name = models.CharField('Konum adı', max_length=120, unique=True)
    address = models.TextField('Adres/not', blank=True)

    class Meta:
        verbose_name = 'Konum'
        verbose_name_plural = 'Konumlar'
        ordering = ['name']

    def __str__(self):
        return self.name


def validate_cover_image(value):
    max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * 1024 * 1024)
    allowed_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    filename = value.name.lower()
    if not filename.endswith(allowed_extensions):
        raise ValidationError('Kapak fotoğrafı için sadece .jpg, .jpeg, .png veya .webp yüklenebilir.')
    if value.size > max_size:
        raise ValidationError(f'Kapak fotoğrafı {max_size} byte sınırını aşamaz.')


class Product(TimestampedModel):
    class ProductType(models.TextChoices):
        MARBLE = 'marble', 'Mermer'
        TRAVERTINE = 'travertine', 'Traverten'
        OTHER = 'other', 'Diğer'

    class StockStatus(models.TextChoices):
        AVAILABLE = 'available', 'Satılabilir'
        RESERVED = 'reserved', 'Rezerve'
        SOLD = 'sold', 'Satıldı'
        PARTIALLY_SOLD = 'partially_sold', 'Kısmi Satıldı'
        HOLD = 'hold', 'Beklemede'

    class PhotoStatus(models.TextChoices):
        MISSING = 'missing', 'Fotoğraf yok'
        PENDING = 'pending', 'Beklemede'
        READY = 'ready', 'Hazır'
        NEEDS_UPDATE = 'needs_update', 'Güncelleme gerekli'

    sku = models.CharField('Stok kodu', max_length=60, unique=True)
    name = models.CharField('Ürün adı', max_length=160)
    product_type = models.CharField('Ürün tipi', max_length=20, choices=ProductType.choices)
    material_name = models.CharField('Malzeme adı', max_length=160, blank=True)
    cut_direction = models.CharField('Kesim yönü', max_length=80, blank=True)
    surface_finish = models.CharField('Yüzey işlemi', max_length=80, blank=True)
    quality = models.CharField('Kalite', max_length=80, blank=True)
    thickness = models.CharField('Kalınlık', max_length=40, blank=True)
    size = models.CharField('Ölçü', max_length=120, blank=True)
    status = models.CharField('Durum', max_length=20, choices=StockStatus.choices, default=StockStatus.AVAILABLE)
    block_no = models.CharField('Blok/kasa no', max_length=80, blank=True)
    finish = models.CharField('Yüzey işlemi', max_length=80, blank=True)
    dimensions = models.CharField('Ebat', max_length=120, blank=True)
    location = models.ForeignKey(Location, verbose_name='Konum', on_delete=models.PROTECT, related_name='products')
    quantity_m2 = models.DecimalField('Miktar (m²)', max_digits=12, decimal_places=2, default=0)
    reserved_m2 = models.DecimalField('Rezerve (m²)', max_digits=12, decimal_places=2, default=0)
    sold_m2 = models.DecimalField('Satılan (m²)', max_digits=12, decimal_places=2, default=0)
    crate_m2 = models.DecimalField('Kasa m²', max_digits=12, decimal_places=2, default=0)
    unit_price_usd = models.DecimalField('Birim fiyat (USD)', max_digits=12, decimal_places=2, default=0)
    photo_album_url = models.URLField('Fotoğraf albümü URL', blank=True)
    cover_image = models.FileField('Kapak fotoğrafı', upload_to='covers/%Y/%m/', blank=True, validators=[validate_cover_image])
    video_url = models.URLField('Video URL', blank=True)
    photo_status = models.CharField('Fotoğraf durumu', max_length=30, choices=PhotoStatus.choices, default=PhotoStatus.MISSING)
    photo_note = models.TextField('Fotoğraf notu', blank=True)
    notes = models.TextField('Notlar', blank=True)

    class Meta:
        verbose_name = 'Ürün'
        verbose_name_plural = 'Ürünler'
        ordering = ['sku']
        permissions = [
            ('view_dashboard', 'Dashboard görüntüleyebilir'),
            ('export_reports', 'PDF/Excel rapor oluşturabilir'),
            ('import_stock', 'Stok import edebilir'),
            ('process_sale', 'Satıştan stok düşebilir'),
            ('view_prices', 'Satış fiyatlarını görebilir'),
        ]


    THICKNESS_WEIGHT_COEFFICIENTS = {
        Decimal('1'): Decimal('25'),
        Decimal('1.2'): Decimal('29'),
        Decimal('2'): Decimal('50'),
        Decimal('2.1'): Decimal('60'),
        Decimal('3'): Decimal('75'),
    }
    CRATE_TARE_KG = Decimal('30')

    def _normalized_thickness(self):
        value = (self.thickness or '').lower().replace('cm', '').replace(',', '.').strip()
        if not value:
            return None
        try:
            return Decimal(value)
        except InvalidOperation:
            return None

    @property
    def weight_coefficient_kg_m2(self):
        thickness = self._normalized_thickness()
        if thickness is None:
            return None
        return self.THICKNESS_WEIGHT_COEFFICIENTS.get(thickness)

    @property
    def estimated_crate_weight_kg(self):
        coefficient = self.weight_coefficient_kg_m2
        if coefficient is None:
            return None
        return self.crate_m2 * coefficient + self.CRATE_TARE_KG

    @property
    def estimated_total_weight_kg(self):
        coefficient = self.weight_coefficient_kg_m2
        if coefficient is None:
            return None
        return self.quantity_m2 * coefficient + self.CRATE_TARE_KG

    @property
    def available_m2(self):
        return self.quantity_m2 - self.reserved_m2 - self.sold_m2

    @property
    def stock_value_usd(self):
        return self.quantity_m2 * self.unit_price_usd

    @property
    def display_material_name(self):
        return self.material_name or self.name

    @property
    def display_surface_finish(self):
        return self.surface_finish or self.finish

    @property
    def display_size(self):
        return self.size or self.dimensions

    def get_absolute_url(self):
        return reverse('product_detail', args=[self.pk])

    def __str__(self):
        return f'{self.sku} - {self.name}'


class Customer(TimestampedModel):
    company_name = models.CharField('Şirket adı', max_length=180)
    country = models.CharField('Ülke', max_length=120)
    contact_name = models.CharField('Yetkili kişi', max_length=160, blank=True)
    email = models.EmailField('E-posta', blank=True)
    phone = models.CharField('Telefon', max_length=80, blank=True)
    whatsapp = models.CharField('WhatsApp', max_length=80, blank=True)
    note = models.TextField('Not', blank=True)

    class Meta:
        verbose_name = 'Müşteri'
        verbose_name_plural = 'Müşteriler'
        ordering = ['company_name']

    def __str__(self):
        return self.company_name


class Offer(TimestampedModel):
    class OfferStatus(models.TextChoices):
        DRAFT = 'draft', 'Taslak'
        SENT = 'sent', 'Gönderildi'
        WAITING_REPLY = 'waiting_reply', 'Yanıt Bekleniyor'
        RESERVED = 'reserved', 'Rezerve'
        CONFIRMED = 'confirmed', 'Onaylandı'
        LOST = 'lost', 'Kaybedildi'
        CANCELLED = 'cancelled', 'İptal Edildi'

    customer = models.ForeignKey(Customer, verbose_name='Müşteri', on_delete=models.PROTECT, related_name='offers')
    offer_number = models.CharField('Teklif numarası', max_length=60, unique=True)
    selected_stock_items = models.ManyToManyField(Product, verbose_name='Seçilen stoklar', related_name='offers')
    currency = models.CharField('Para birimi', max_length=10, default='USD')
    incoterm = models.CharField('Incoterm', max_length=40, blank=True)
    payment_terms = models.CharField('Ödeme koşulları', max_length=180, blank=True)
    validity_date = models.DateField('Geçerlilik tarihi')
    status = models.CharField('Durum', max_length=30, choices=OfferStatus.choices, default=OfferStatus.DRAFT)
    note = models.TextField('Not', blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='Kullanıcı', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Teklif'
        verbose_name_plural = 'Teklifler'
        ordering = ['-created_at']

    def get_absolute_url(self):
        return reverse('offer_detail', args=[self.pk])

    @property
    def total_m2(self):
        return sum(item.quantity_m2 for item in self.selected_stock_items.all())

    @property
    def total_available_m2(self):
        return sum(item.available_m2 for item in self.selected_stock_items.all())

    def __str__(self):
        return f'{self.offer_number} - {self.customer}'


class Reservation(TimestampedModel):
    class ReservationStatus(models.TextChoices):
        ACTIVE = 'active', 'Aktif'
        EXPIRED = 'expired', 'Süresi Doldu'
        CANCELLED = 'cancelled', 'İptal Edildi'
        CONVERTED_TO_SALE = 'converted_to_sale', 'Satışa Dönüştü'

    stock_item = models.ForeignKey(Product, verbose_name='Stok kalemi', on_delete=models.CASCADE, related_name='reservations')
    customer_name = models.CharField('Müşteri adı', max_length=160)
    reserved_m2 = models.DecimalField('Rezerve m²', max_digits=12, decimal_places=2)
    valid_until = models.DateField('Geçerlilik tarihi')
    note = models.TextField('Not', blank=True)
    status = models.CharField('Durum', max_length=30, choices=ReservationStatus.choices, default=ReservationStatus.ACTIVE)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='Kullanıcı', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Rezervasyon'
        verbose_name_plural = 'Rezervasyonlar'
        ordering = ['valid_until', '-created_at']

    def clean(self):
        super().clean()
        if self.status == self.ReservationStatus.ACTIVE and self._state.adding and self.reserved_m2 > self.stock_item.available_m2:
            raise ValidationError({'reserved_m2': 'Rezervasyon miktarı satılabilir m² değerinden fazla olamaz.'})

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        self.full_clean()
        with transaction.atomic():
            super().save(*args, **kwargs)
            if is_new and self.status == self.ReservationStatus.ACTIVE:
                self.stock_item.reserved_m2 += self.reserved_m2
                self.stock_item._current_user = getattr(self, '_current_user', None) or self.created_by
                self.stock_item.save(update_fields=['reserved_m2', 'updated_at'])

    def cancel(self, user=None):
        if self.status != self.ReservationStatus.ACTIVE:
            return
        with transaction.atomic():
            self.status = self.ReservationStatus.CANCELLED
            self._current_user = user
            self.save(update_fields=['status', 'updated_at'])
            self.stock_item.reserved_m2 = max(self.stock_item.reserved_m2 - self.reserved_m2, 0)
            self.stock_item._current_user = user
            self.stock_item.save(update_fields=['reserved_m2', 'updated_at'])

    def __str__(self):
        return f'{self.stock_item} - {self.customer_name} ({self.reserved_m2} m²)'


class StockMovement(TimestampedModel):
    class MovementType(models.TextChoices):
        CREATED = 'created', 'Oluşturuldu'
        UPDATED = 'updated', 'Güncellendi'
        LOCATION_CHANGED = 'location_changed', 'Konum Değişti'
        RESERVED = 'reserved', 'Rezerve Edildi'
        RESERVATION_CANCELLED = 'reservation_cancelled', 'Rezervasyon İptal'
        SOLD = 'sold', 'Satıldı'
        ADJUSTED = 'adjusted', 'Düzeltildi'
        DELETED = 'deleted', 'Silindi'

    stock_item = models.ForeignKey(Product, verbose_name='Stok kalemi', on_delete=models.SET_NULL, null=True, blank=True, related_name='movements')
    movement_type = models.CharField('Hareket tipi', max_length=30, choices=MovementType.choices)
    old_location = models.ForeignKey(Location, verbose_name='Eski konum', on_delete=models.PROTECT, null=True, blank=True, related_name='old_stock_movements')
    new_location = models.ForeignKey(Location, verbose_name='Yeni konum', on_delete=models.PROTECT, null=True, blank=True, related_name='new_stock_movements')
    quantity_m2 = models.DecimalField('Miktar (m²)', max_digits=12, decimal_places=2, default=0)
    note = models.TextField('Not', blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='Kullanıcı', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Stok hareketi'
        verbose_name_plural = 'Stok hareketleri'
        ordering = ['-created_at']

    def __str__(self):
        sku = self.stock_item.sku if self.stock_item else 'Silinmiş stok'
        return f'{sku} - {self.get_movement_type_display()} ({self.quantity_m2} m²)'


def validate_excel_file(value):
    max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * 1024 * 1024)
    allowed_extensions = ('.xlsx', '.xls', '.csv')
    filename = value.name.lower()
    if not filename.endswith(allowed_extensions):
        raise ValidationError('Sadece .xlsx, .xls veya .csv dosyaları yüklenebilir.')
    if value.size > max_size:
        raise ValidationError(f'Dosya boyutu {max_size} byte sınırını aşamaz.')


class ImportFile(TimestampedModel):
    file = models.FileField('İçe aktarma dosyası', upload_to='imports/%Y/%m/', validators=[validate_excel_file])
    original_name = models.CharField('Orijinal dosya adı', max_length=255)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='Yükleyen kullanıcı', on_delete=models.SET_NULL, null=True, blank=True)
    processed = models.BooleanField('İşlendi', default=False)
    delete_after_processing = models.BooleanField('İşlem sonrası sil', default=True)

    class Meta:
        verbose_name = 'İçe aktarma dosyası'
        verbose_name_plural = 'İçe aktarma dosyaları'
        ordering = ['-created_at']

    def __str__(self):
        return self.original_name


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Oluşturma'
        UPDATE = 'update', 'Güncelleme'
        DELETE = 'delete', 'Silme'
        LOGIN = 'login', 'Giriş'
        LOGOUT = 'logout', 'Çıkış'
        REPORT = 'report', 'Rapor'

    created_at = models.DateTimeField('Tarih', auto_now_add=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='Kullanıcı', on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField('İşlem', max_length=20, choices=Action.choices)
    model_name = models.CharField('Model', max_length=120)
    object_id = models.CharField('Nesne ID', max_length=64, blank=True)
    object_repr = models.CharField('Nesne', max_length=255, blank=True)
    details = models.JSONField('Detay', default=dict, blank=True)

    class Meta:
        verbose_name = 'Audit log'
        verbose_name_plural = 'Audit logları'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.action} {self.model_name}#{self.object_id}'
