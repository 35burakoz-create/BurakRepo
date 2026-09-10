import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/supabase_guard.dart';

class AdminPlanResult {
  const AdminPlanResult({required this.ok, this.message, this.userId, this.plan, this.updatedAt});

  final bool ok;
  final String? message;
  final String? userId;
  final String? plan;
  final String? updatedAt;
}

class AdminPlanService {
  Future<AdminPlanResult> call({
    required String action,
    required String targetEmail,
    String? plan,
  }) async {
    if (!isSupabaseReady()) {
      return const AdminPlanResult(ok: false, message: 'Supabase bağlantısı yok. VIP işlemleri için çevrimiçi olmalısın.');
    }

    try {
      final res = await Supabase.instance.client.functions.invoke('admin_plan', body: {
        'action': action,
        'target_email': targetEmail,
        if (plan != null) 'plan': plan,
      });
      final root = (res.data as Map?)?.cast<String, dynamic>();
      if (root == null) return const AdminPlanResult(ok: false, message: 'Veri alınamadı.');
      if (root['ok'] != true) {
        return AdminPlanResult(ok: false, message: (root['message_tr'] ?? 'İşlem başarısız.') as String?);
      }
      return AdminPlanResult(
        ok: true,
        message: (root['message_tr'] ?? 'İşlem tamamlandı.') as String?,
        userId: root['user_id'] as String?,
        plan: root['plan'] as String?,
        updatedAt: root['updated_at'] as String?,
      );
    } catch (_) {
      return const AdminPlanResult(ok: false, message: 'Veri alınamadı.');
    }
  }
}
