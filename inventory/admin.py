from django.contrib import admin
from .models import AuditLog, Customer, ImportFile, Location, Offer, Product, Reservation, StockMovement


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'updated_at')
    search_fields = ('name', 'address')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'display_material_name', 'cut_direction', 'display_surface_finish', 'quality', 'thickness', 'display_size', 'status', 'location', 'quantity_m2', 'reserved_m2', 'sold_m2', 'crate_m2', 'available_m2', 'estimated_total_weight_kg', 'photo_status')
    list_filter = ('product_type', 'status', 'photo_status', 'surface_finish', 'cut_direction', 'quality', 'thickness', 'location')
    search_fields = ('sku', 'name', 'material_name', 'cut_direction', 'surface_finish', 'quality', 'thickness', 'size', 'location__name', 'status', 'photo_album_url', 'video_url', 'photo_note', 'block_no', 'dimensions')

    def save_model(self, request, obj, form, change):
        obj._current_user = request.user
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        obj._current_user = request.user
        super().delete_model(request, obj)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'country', 'contact_name', 'email', 'phone', 'whatsapp')
    search_fields = ('company_name', 'country', 'contact_name', 'email', 'phone', 'whatsapp', 'note')


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('offer_number', 'customer', 'currency', 'incoterm', 'validity_date', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'currency', 'incoterm', 'validity_date', 'created_at')
    search_fields = ('offer_number', 'customer__company_name', 'customer__country', 'note')
    filter_horizontal = ('selected_stock_items',)

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('stock_item', 'movement_type', 'old_location', 'new_location', 'quantity_m2', 'created_at', 'created_by')
    list_filter = ('movement_type', 'created_at')
    search_fields = ('stock_item__sku', 'stock_item__name', 'stock_item__material_name', 'note')


@admin.register(ImportFile)
class ImportFileAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'uploaded_by', 'processed', 'delete_after_processing', 'created_at')
    list_filter = ('processed', 'delete_after_processing', 'created_at')
    search_fields = ('original_name',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'model_name', 'object_id', 'object_repr')
    list_filter = ('action', 'model_name', 'created_at')
    search_fields = ('actor__username', 'model_name', 'object_repr', 'object_id')
    readonly_fields = ('created_at', 'actor', 'action', 'model_name', 'object_id', 'object_repr', 'details')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('stock_item', 'customer_name', 'reserved_m2', 'valid_until', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'valid_until', 'created_at')
    search_fields = ('stock_item__sku', 'stock_item__material_name', 'customer_name', 'note')

    def save_model(self, request, obj, form, change):
        obj._current_user = request.user
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
