from django import forms
from django.conf import settings
from .models import Customer, ImportFile, Location, Offer, Product, Reservation, StockMovement


class BootstrapModelForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            css_class = 'form-select' if isinstance(field.widget, forms.Select) else 'form-control'
            field.widget.attrs['class'] = f"{field.widget.attrs.get('class', '')} {css_class}".strip()


class LocationForm(BootstrapModelForm):
    class Meta:
        model = Location
        fields = ['name', 'address']


class ProductForm(BootstrapModelForm):
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if not self.user or not self.user.has_perm('inventory.view_prices'):
            self.fields.pop('unit_price_usd', None)

    class Meta:
        model = Product
        fields = ['sku', 'name', 'product_type', 'material_name', 'cut_direction', 'surface_finish', 'quality', 'thickness', 'size', 'status', 'block_no', 'finish', 'dimensions', 'location', 'quantity_m2', 'reserved_m2', 'sold_m2', 'crate_m2', 'unit_price_usd', 'photo_album_url', 'cover_image', 'video_url', 'photo_status', 'photo_note', 'notes']


class CustomerForm(BootstrapModelForm):
    class Meta:
        model = Customer
        fields = ['company_name', 'country', 'contact_name', 'email', 'phone', 'whatsapp', 'note']


class OfferForm(BootstrapModelForm):
    class Meta:
        model = Offer
        fields = ['customer', 'offer_number', 'selected_stock_items', 'currency', 'incoterm', 'payment_terms', 'validity_date', 'status', 'note']
        widgets = {
            'validity_date': forms.DateInput(attrs={'type': 'date'}),
            'selected_stock_items': forms.CheckboxSelectMultiple(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['selected_stock_items'].queryset = Product.objects.select_related('location').exclude(status=Product.StockStatus.SOLD).order_by('location__name', 'sku')
        self.fields['selected_stock_items'].widget.attrs.pop('class', None)


class ProductLocationChangeForm(forms.Form):
    side = forms.ChoiceField(label='Side', choices=(('A', 'A'), ('B', 'B')))
    row_number = forms.IntegerField(label='Satır', min_value=1, max_value=settings.KROKI_ROWS)
    section = forms.ChoiceField(label='Section')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        sections = sorted(set(settings.KROKI_A_SLOTS + settings.KROKI_B_SLOTS))
        self.fields['section'].choices = [(section, section) for section in sections]
        for field in self.fields.values():
            css_class = 'form-select' if isinstance(field.widget, forms.Select) else 'form-control'
            field.widget.attrs['class'] = f"{field.widget.attrs.get('class', '')} {css_class}".strip()

    def clean(self):
        cleaned_data = super().clean()
        side = cleaned_data.get('side')
        section = cleaned_data.get('section')
        if side == 'A' and section not in settings.KROKI_A_SLOTS:
            self.add_error('section', 'A tarafı için geçerli bir section seçin.')
        if side == 'B' and section not in settings.KROKI_B_SLOTS:
            self.add_error('section', 'B tarafı için geçerli bir section seçin.')
        return cleaned_data

    def location_code(self):
        return f"{self.cleaned_data['side']}{self.cleaned_data['row_number']}-{self.cleaned_data['section']}"


class ReservationForm(BootstrapModelForm):
    class Meta:
        model = Reservation
        fields = ['customer_name', 'reserved_m2', 'valid_until', 'note']
        widgets = {'valid_until': forms.DateInput(attrs={'type': 'date'})}

    def __init__(self, *args, **kwargs):
        self.stock_item = kwargs.pop('stock_item')
        super().__init__(*args, **kwargs)

    def clean_reserved_m2(self):
        reserved_m2 = self.cleaned_data['reserved_m2']
        if reserved_m2 > self.stock_item.available_m2:
            raise forms.ValidationError('Rezervasyon miktarı satılabilir m² değerinden fazla olamaz.')
        return reserved_m2


class SaleForm(forms.Form):
    stock_item = forms.ModelChoiceField(label='Stok', queryset=Product.objects.select_related('location').order_by('sku'))
    sold_m2 = forms.DecimalField(label='Satılan m²', min_value=0, max_digits=12, decimal_places=2)
    customer_name = forms.CharField(label='Müşteri adı', max_length=160)
    note = forms.CharField(label='Satış notu', required=False, widget=forms.Textarea(attrs={'rows': 3}))
    reservation = forms.ModelChoiceField(label='Bağlı rezervasyon', queryset=Reservation.objects.none(), required=False)

    def __init__(self, *args, **kwargs):
        stock_item = kwargs.pop('stock_item', None)
        super().__init__(*args, **kwargs)
        self.fields['reservation'].queryset = Reservation.objects.select_related('stock_item').filter(status=Reservation.ReservationStatus.ACTIVE).order_by('valid_until')
        if stock_item:
            self.fields['stock_item'].initial = stock_item
            self.fields['reservation'].queryset = self.fields['reservation'].queryset.filter(stock_item=stock_item)
        for field in self.fields.values():
            css_class = 'form-select' if isinstance(field.widget, forms.Select) else 'form-control'
            field.widget.attrs['class'] = f"{field.widget.attrs.get('class', '')} {css_class}".strip()

    def clean(self):
        cleaned_data = super().clean()
        stock_item = cleaned_data.get('stock_item')
        sold_m2 = cleaned_data.get('sold_m2')
        reservation = cleaned_data.get('reservation')
        if not stock_item or sold_m2 is None:
            return cleaned_data
        allowed_m2 = stock_item.available_m2
        if reservation:
            if reservation.stock_item_id != stock_item.id:
                self.add_error('reservation', 'Seçilen rezervasyon bu stoğa ait değil.')
                return cleaned_data
            allowed_m2 += reservation.reserved_m2
        if sold_m2 > allowed_m2:
            self.add_error('sold_m2', 'Satılan m², satılabilir m² değerinden fazla olamaz.')
        return cleaned_data


class ExcelImportUploadForm(BootstrapModelForm):
    class Meta:
        model = ImportFile
        fields = ['file', 'delete_after_processing']



class StockMovementForm(BootstrapModelForm):
    class Meta:
        model = StockMovement
        fields = ['stock_item', 'movement_type', 'old_location', 'new_location', 'quantity_m2', 'note']
