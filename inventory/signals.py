from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import AuditLog, Customer, ImportFile, Location, Offer, Product, Reservation, StockMovement

TRACKED_MODELS = (Location, Product, Customer, Offer, Reservation, StockMovement, ImportFile)


def create_audit_log(action, instance=None, actor=None, details=None):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        model_name=instance.__class__.__name__ if instance is not None else 'auth',
        object_id=str(getattr(instance, 'pk', '') or ''),
        object_repr=str(instance)[:255] if instance is not None else '',
        details=details or {},
    )


def create_stock_movement(stock_item, movement_type, quantity_m2=0, old_location=None, new_location=None, note='', created_by=None):
    StockMovement.objects.create(
        stock_item=stock_item,
        movement_type=movement_type,
        old_location=old_location,
        new_location=new_location,
        quantity_m2=quantity_m2 or 0,
        note=note,
        created_by=created_by,
    )


@receiver(pre_save, sender=Product)
def remember_previous_product_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_product_state = None
        return
    instance._previous_product_state = Product.objects.filter(pk=instance.pk).first()


@receiver(post_save, sender=Product)
def record_product_stock_movement(sender, instance, created, **kwargs):
    if created:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.CREATED,
            quantity_m2=instance.quantity_m2,
            new_location=instance.location,
            note='Yeni stok girişi oluşturuldu.',
            created_by=getattr(instance, '_current_user', None),
        )
        return

    previous = getattr(instance, '_previous_product_state', None)
    if previous is None:
        return

    if previous.location_id != instance.location_id:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.LOCATION_CHANGED,
            quantity_m2=instance.quantity_m2,
            old_location=previous.location,
            new_location=instance.location,
            note='Stok konumu değiştirildi.',
            created_by=getattr(instance, '_current_user', None),
        )
    if instance.reserved_m2 > previous.reserved_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.RESERVED,
            quantity_m2=instance.reserved_m2 - previous.reserved_m2,
            old_location=instance.location,
            new_location=instance.location,
            note='Stok rezervasyonu artırıldı.',
            created_by=getattr(instance, '_current_user', None),
        )
    elif instance.reserved_m2 < previous.reserved_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.RESERVATION_CANCELLED,
            quantity_m2=previous.reserved_m2 - instance.reserved_m2,
            old_location=instance.location,
            new_location=instance.location,
            note='Stok rezervasyonu azaltıldı veya iptal edildi.',
            created_by=getattr(instance, '_current_user', None),
        )
    if instance.sold_m2 > previous.sold_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.SOLD,
            quantity_m2=instance.sold_m2 - previous.sold_m2,
            old_location=instance.location,
            new_location=instance.location,
            note=getattr(instance, '_sale_note', 'Stok satış miktarı artırıldı.'),
            created_by=getattr(instance, '_current_user', None),
        )
    elif instance.sold_m2 < previous.sold_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.ADJUSTED,
            quantity_m2=previous.sold_m2 - instance.sold_m2,
            old_location=instance.location,
            new_location=instance.location,
            note='Stok satış miktarı düzeltildi.',
            created_by=getattr(instance, '_current_user', None),
        )
    if instance.quantity_m2 < previous.quantity_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.SOLD,
            quantity_m2=previous.quantity_m2 - instance.quantity_m2,
            old_location=instance.location,
            new_location=instance.location,
            note='Stok miktarı satış/çıkış nedeniyle düşürüldü.',
            created_by=getattr(instance, '_current_user', None),
        )
    elif instance.quantity_m2 > previous.quantity_m2:
        create_stock_movement(
            stock_item=instance,
            movement_type=StockMovement.MovementType.ADJUSTED,
            quantity_m2=instance.quantity_m2 - previous.quantity_m2,
            old_location=instance.location,
            new_location=instance.location,
            note='Stok miktarı düzeltildi.',
            created_by=getattr(instance, '_current_user', None),
        )


@receiver(post_delete, sender=Product)
def record_product_delete_movement(sender, instance, **kwargs):
    create_stock_movement(
        stock_item=None,
        movement_type=StockMovement.MovementType.DELETED,
        quantity_m2=instance.quantity_m2,
        old_location=instance.location,
        note=f'Stok kalemi silindi: {instance.sku} - {instance.display_material_name}',
        created_by=getattr(instance, '_current_user', None),
    )


@receiver(post_save)
def audit_save(sender, instance, created, **kwargs):
    if sender not in TRACKED_MODELS:
        return
    create_audit_log(AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE, instance=instance)


@receiver(post_delete)
def audit_delete(sender, instance, **kwargs):
    if sender not in TRACKED_MODELS:
        return
    create_audit_log(AuditLog.Action.DELETE, instance=instance)


@receiver(user_logged_in)
def audit_login(sender, request, user, **kwargs):
    create_audit_log(AuditLog.Action.LOGIN, actor=user, details={'ip': request.META.get('REMOTE_ADDR', '')})


@receiver(user_logged_out)
def audit_logout(sender, request, user, **kwargs):
    create_audit_log(AuditLog.Action.LOGOUT, actor=user if user and user.is_authenticated else None, details={'ip': request.META.get('REMOTE_ADDR', '')})
