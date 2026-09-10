# Generated for Nelamar Stock export role permissions
from django.db import migrations


EXPORT_PERMISSIONS = {
    ('inventory', 'customer'): [
        ('view_customer', 'Can view customer'),
        ('add_customer', 'Can add customer'),
        ('change_customer', 'Can change customer'),
        ('delete_customer', 'Can delete customer'),
    ],
    ('inventory', 'offer'): [
        ('view_offer', 'Can view offer'),
        ('add_offer', 'Can add offer'),
        ('change_offer', 'Can change offer'),
        ('delete_offer', 'Can delete offer'),
    ],
}

ROLE_UPDATES = {
    'Admin': ['__all__'],
    'Sales': ['view_customer', 'add_customer', 'change_customer', 'view_offer', 'add_offer', 'change_offer'],
}


def ensure_permissions(apps):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    for (app_label, model_name), permissions in EXPORT_PERMISSIONS.items():
        content_type, _created = ContentType.objects.get_or_create(app_label=app_label, model=model_name)
        for codename, name in permissions:
            Permission.objects.get_or_create(
                content_type=content_type,
                codename=codename,
                defaults={'name': name},
            )


def update_roles(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ensure_permissions(apps)
    for role_name, codenames in ROLE_UPDATES.items():
        group, _created = Group.objects.get_or_create(name=role_name)
        if codenames == ['__all__']:
            group.permissions.set(Permission.objects.all())
            continue
        permissions = Permission.objects.filter(codename__in=codenames)
        group.permissions.add(*permissions)


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0011_customer_offer'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [migrations.RunPython(update_roles, migrations.RunPython.noop)]
