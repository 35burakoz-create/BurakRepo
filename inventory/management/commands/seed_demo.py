from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from inventory.models import Location, Product


DEMO_LOCATIONS = ['A1-Z', 'A1-T', 'A1-Y', 'A1-X', 'B1-X', 'B1-Y', 'B1-T', 'B1-Z']

DEMO_PRODUCTS = [
    {
        'sku': 'DEMO-TRV-001',
        'name': 'Demo Classic Travertine',
        'product_type': Product.ProductType.TRAVERTINE,
        'material_name': 'Demo Classic Travertine',
        'cut_direction': 'Vein Cut',
        'surface_finish': 'Honed',
        'quality': 'A',
        'thickness': '2 cm',
        'size': '30x60',
        'location': 'A1-Z',
        'crate_m2': Decimal('18.50'),
        'quantity_m2': Decimal('92.50'),
        'unit_price_usd': Decimal('0'),
    },
    {
        'sku': 'DEMO-MRM-002',
        'name': 'Demo Beige Marble',
        'product_type': Product.ProductType.MARBLE,
        'material_name': 'Demo Beige Marble',
        'cut_direction': 'Cross Cut',
        'surface_finish': 'Polished',
        'quality': 'A+',
        'thickness': '1.2 cm',
        'size': '40x80',
        'location': 'A1-T',
        'crate_m2': Decimal('16.00'),
        'quantity_m2': Decimal('64.00'),
        'unit_price_usd': Decimal('0'),
    },
    {
        'sku': 'DEMO-TRV-003',
        'name': 'Demo Silver Travertine',
        'product_type': Product.ProductType.TRAVERTINE,
        'material_name': 'Demo Silver Travertine',
        'cut_direction': 'Vein Cut',
        'surface_finish': 'Brushed',
        'quality': 'B',
        'thickness': '3 cm',
        'size': 'French Pattern',
        'location': 'A1-Y',
        'crate_m2': Decimal('12.75'),
        'quantity_m2': Decimal('51.00'),
        'unit_price_usd': Decimal('0'),
    },
    {
        'sku': 'DEMO-MRM-004',
        'name': 'Demo White Marble',
        'product_type': Product.ProductType.MARBLE,
        'material_name': 'Demo White Marble',
        'cut_direction': 'Cross Cut',
        'surface_finish': 'Honed',
        'quality': 'A',
        'thickness': '2.1 cm',
        'size': '60x60',
        'location': 'B1-X',
        'crate_m2': Decimal('14.40'),
        'quantity_m2': Decimal('72.00'),
        'unit_price_usd': Decimal('0'),
    },
    {
        'sku': 'DEMO-TRV-005',
        'name': 'Demo Noce Travertine',
        'product_type': Product.ProductType.TRAVERTINE,
        'material_name': 'Demo Noce Travertine',
        'cut_direction': 'Vein Cut',
        'surface_finish': 'Tumbled',
        'quality': 'Commercial',
        'thickness': '1 cm',
        'size': '10x10',
        'location': 'B1-Y',
        'crate_m2': Decimal('10.00'),
        'quantity_m2': Decimal('40.00'),
        'unit_price_usd': Decimal('0'),
    },
]


class Command(BaseCommand):
    help = 'Gerçek veri kullanmadan sahte demo konum ve stok kayıtları oluşturur.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Önce DEMO- ile başlayan sahte stokları siler, sonra yeniden oluşturur.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            deleted_count, _details = Product.objects.filter(sku__startswith='DEMO-').delete()
            self.stdout.write(self.style.WARNING(f'{deleted_count} demo stok kaydı silindi.'))

        locations = {}
        for code in DEMO_LOCATIONS:
            location, _created = Location.objects.get_or_create(name=code, defaults={'address': 'Sahte demo konum'})
            locations[code] = location

        created = 0
        updated = 0
        for data in DEMO_PRODUCTS:
            location = locations[data.pop('location')]
            product, was_created = Product.objects.update_or_create(
                sku=data['sku'],
                defaults={**data, 'location': location, 'status': Product.StockStatus.AVAILABLE},
            )
            if was_created:
                created += 1
            else:
                updated += 1
            data['location'] = location.name

        self.stdout.write(self.style.SUCCESS(f'Demo seed tamamlandı: {created} yeni, {updated} güncellenen stok.'))
