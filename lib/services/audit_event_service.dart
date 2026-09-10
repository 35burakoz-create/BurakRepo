import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';

class AuditEventService {
  static Future<void> logUserAction({
    required String action,
    required String entityType,
    String? entityId,
    String? cityId,
    Map<String, dynamic>? payload,
    String? actorNickname,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) return;

    final resolvedCityId = cityId ?? await _resolveCityId(user.id);

    try {
      await SupabaseService.client.from('audit_events').insert({
        'actor_user_id': user.id,
        'actor_nickname': actorNickname,
        'action': action,
        'entity_type': entityType,
        'entity_id': entityId,
        'city_id': resolvedCityId,
        'payload': payload ?? <String, dynamic>{},
      });
    } catch (_) {
      // Best-effort logging; do not block MVP user actions.
    }
  }

  static Future<String> _resolveCityId(String userId) async {
    final profile = await SupabaseService.client
        .from('profiles')
        .select('city_id')
        .eq('id', userId)
        .maybeSingle();
    final cityId = profile?['city_id'] as String?;
    return (cityId == null || cityId.trim().isEmpty)
        ? AppConfig.defaultCityId
        : cityId.trim();
  }
}
