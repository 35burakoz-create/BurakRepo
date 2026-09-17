# Generated for Nelamar Stock role seed data
from django.db import migrations


MODEL_PERMISSIONS = {
    ('inventory', 'product'): [
        ('view_product', 'Can view product'),
        ('add_product', 'Can add product'),
        ('change_product', 'Can change product'),
        ('delete_product', 'Can delete product'),
        ('view_dashboard', 'Dashboard görüntüleyebilir'),
        ('export_reports', 'PDF/Excel rapor oluşturabilir'),
        ('import_stock', 'Stok import edebilir'),
        ('process_sale', 'Satıştan stok düşebilir'),
        ('view_prices', 'Satış fiyatlarını görebilir'),
    ],
    ('inventory', 'location'): [
        ('view_location', 'Can view location'),
        ('add_location', 'Can add location'),
        ('change_location', 'Can change location'),
        ('delete_location', 'Can delete location'),
    ],
    ('inventory', 'stockmovement'): [
        ('view_stockmovement', 'Can view stock movement'),
        ('add_stockmovement', 'Can add stock movement'),
        ('change_stockmovement', 'Can change stock movement'),
        ('delete_stockmovement', 'Can delete stock movement'),
    ],
    ('inventory', 'reservation'): [
        ('view_reservation', 'Can view reservation'),
        ('add_reservation', 'Can add reservation'),
        ('change_reservation', 'Can change reservation'),
        ('delete_reservation', 'Can delete reservation'),
    ],
    ('inventory', 'importfile'): [
        ('view_importfile', 'Can view import file'),
        ('add_importfile', 'Can add import file'),
        ('change_importfile', 'Can change import file'),
        ('delete_importfile', 'Can delete import file'),
    ],
    ('inventory', 'auditlog'): [
        ('view_auditlog', 'Can view audit log'),
        ('add_auditlog', 'Can add audit log'),
        ('change_auditlog', 'Can change audit log'),
        ('delete_auditlog', 'Can delete audit log'),
    ],
    ('auth', 'user'): [
        ('view_user', 'Can view user'),
        ('add_user', 'Can add user'),
        ('change_user', 'Can change user'),
        ('delete_user', 'Can delete user'),
    ],
    ('auth', 'group'): [
        ('view_group', 'Can view group'),
        ('add_group', 'Can add group'),
        ('change_group', 'Can change group'),
        ('delete_group', 'Can delete group'),
    ],
}

ROLE_PERMISSIONS = {
    'Admin': ['__all__'],
    'Warehouse': [
        'view_product', 'add_product', 'change_product',
        'view_location', 'add_location', 'change_location',
        'view_stockmovement', 'import_stock', 'view_dashboard',
    ],
    'Sales': [
        'view_product', 'view_location', 'view_reservation', 'add_reservation', 'change_reservation',
        'process_sale', 'export_reports', 'view_dashboard',
    ],
    'Viewer': ['view_product'],
}


def ensure_role_permissions(apps):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    for (app_label, model_name), permissions in MODEL_PERMISSIONS.items():
        content_type, _created = ContentType.objects.get_or_create(app_label=app_label, model=model_name)
        for codename, name in permissions:
            Permission.objects.get_or_create(
                content_type=content_type,
                codename=codename,
                defaults={'name': name},
            )


def seed_roles(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ensure_role_permissions(apps)
    for role_name, codenames in ROLE_PERMISSIONS.items():
        group, _created = Group.objects.get_or_create(name=role_name)
        if codenames == ['__all__']:
            group.permissions.set(Permission.objects.all())
            continue
        permissions = Permission.objects.filter(codename__in=codenames)
        group.permissions.set(permissions)


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0009_product_role_permissions'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [migrations.RunPython(seed_roles, migrations.RunPython.noop)]
