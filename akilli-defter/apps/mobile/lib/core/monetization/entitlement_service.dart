import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum PlanType { free, personalPremium, business }

class AiQuota {
  const AiQuota({required this.limit, required this.used});

  final int limit;
  final int used;

  int get remaining => (limit - used).clamp(0, limit);

  Map<String, dynamic> toMap() => {'limit': limit, 'used': used};

  factory AiQuota.fromMap(Map<String, dynamic> map) => AiQuota(
        limit: (map['limit'] as num?)?.toInt() ?? 0,
        used: (map['used'] as num?)?.toInt() ?? 0,
      );
}

class Entitlements {
  const Entitlements({
    required this.planType,
    required this.canUsePersonal,
    required this.canUseBusiness,
    required this.businessReadOnly,
    required this.canExport,
    required this.canUseDeviceLock,
    required this.canUseCloudSync,
    required this.canUseFxScenario,
    required this.canUseProfitability,
    required this.canUseCollectionsMessaging,
    required this.aiQuotas,
  });

  final PlanType planType;
  final bool canUsePersonal;
  final bool canUseBusiness;
  final bool businessReadOnly;
  final bool canExport;
  final bool canUseDeviceLock;
  final bool canUseCloudSync;
  final bool canUseFxScenario;
  final bool canUseProfitability;
  final bool canUseCollectionsMessaging;
  final Map<String, AiQuota> aiQuotas;

  static Entitlements free() => const Entitlements(
        planType: PlanType.free,
        canUsePersonal: true,
        canUseBusiness: true,
        businessReadOnly: true,
        canExport: false,
        canUseDeviceLock: false,
        canUseCloudSync: false,
        canUseFxScenario: false,
        canUseProfitability: false,
        canUseCollectionsMessaging: false,
        aiQuotas: {
          'categorize_transaction': AiQuota(limit: 30, used: 0),
          'weekly_summary': AiQuota(limit: 2, used: 0),
          'nl_query': AiQuota(limit: 10, used: 0),
          'collection_message': AiQuota(limit: 0, used: 0),
        },
      );

  Map<String, dynamic> toMap() => {
        'planType': planType.name,
        'canUsePersonal': canUsePersonal,
        'canUseBusiness': canUseBusiness,
        'businessReadOnly': businessReadOnly,
        'canExport': canExport,
        'canUseDeviceLock': canUseDeviceLock,
        'canUseCloudSync': canUseCloudSync,
        'canUseFxScenario': canUseFxScenario,
        'canUseProfitability': canUseProfitability,
        'canUseCollectionsMessaging': canUseCollectionsMessaging,
        'aiQuotas': aiQuotas.map((k, v) => MapEntry(k, v.toMap())),
      };

  factory Entitlements.fromMap(Map<String, dynamic> map) {
    final quotaRaw = (map['aiQuotas'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    return Entitlements(
      planType: PlanType.values.firstWhere(
        (p) => p.name == map['planType'],
        orElse: () => PlanType.free,
      ),
      canUsePersonal: map['canUsePersonal'] == true,
      canUseBusiness: map['canUseBusiness'] == true,
      businessReadOnly: map['businessReadOnly'] == true,
      canExport: map['canExport'] == true,
      canUseDeviceLock: map['canUseDeviceLock'] == true,
      canUseCloudSync: map['canUseCloudSync'] == true,
      canUseFxScenario: map['canUseFxScenario'] == true,
      canUseProfitability: map['canUseProfitability'] == true,
      canUseCollectionsMessaging: map['canUseCollectionsMessaging'] == true,
      aiQuotas: quotaRaw.map((k, v) => MapEntry(k, AiQuota.fromMap((v as Map).cast<String, dynamic>()))),
    );
  }
}

abstract class BillingProvider {
  Future<void> purchasePlan(PlanType plan);
  Future<void> restorePurchases();
}

class SupabaseBillingProvider implements BillingProvider {
  @override
  Future<void> purchasePlan(PlanType plan) async {
    if (!Supabase.initialized) return;
    await Supabase.instance.client.functions.invoke('billing_manage', body: {'action': 'set_plan', 'plan_type': plan.name});
  }

  @override
  Future<void> restorePurchases() async {
    if (!Supabase.initialized) return;
    await Supabase.instance.client.functions.invoke('billing_manage', body: {'action': 'restore'});
  }
}

class EntitlementService {
  EntitlementService({required this.billingProvider});

  final BillingProvider billingProvider;
  static const _cacheKey = 'entitlements_cache';

  Future<Entitlements> loadCached() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cacheKey);
    if (raw == null || raw.isEmpty) return Entitlements.free();
    return Entitlements.fromMap((jsonDecode(raw) as Map).cast<String, dynamic>());
  }

  Future<void> cache(Entitlements entitlements) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cacheKey, jsonEncode(entitlements.toMap()));
  }

  Future<Entitlements> refresh() async {
    if (!Supabase.initialized) {
      final local = await loadCached();
      return local;
    }
    try {
      final res = await Supabase.instance.client.functions.invoke('entitlements');
      final data = (res.data as Map?)?.cast<String, dynamic>();
      if (data == null) return loadCached();
      final ai = (data['ai_quotas'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      final entitlements = Entitlements(
        planType: PlanType.values.firstWhere((e) => e.name == (data['plan_type'] ?? 'free'), orElse: () => PlanType.free),
        canUsePersonal: data['can_use_personal'] == true,
        canUseBusiness: data['can_use_business'] == true,
        businessReadOnly: data['business_read_only'] == true,
        canExport: data['can_export'] == true,
        canUseDeviceLock: data['can_use_device_lock'] == true,
        canUseCloudSync: data['can_use_cloud_sync'] == true,
        canUseFxScenario: data['can_use_fx_scenario'] == true,
        canUseProfitability: data['can_use_profitability'] == true,
        canUseCollectionsMessaging: data['can_use_collections_messaging'] == true,
        aiQuotas: ai.map((k, v) => MapEntry(k, AiQuota.fromMap((v as Map).cast<String, dynamic>()))),
      );
      await cache(entitlements);
      return entitlements;
    } catch (_) {
      return loadCached();
    }
  }

  Future<Entitlements> purchaseAndRefresh(PlanType plan) async {
    await billingProvider.purchasePlan(plan);
    return refresh();
  }

  Future<Entitlements> restoreAndRefresh() async {
    await billingProvider.restorePurchases();
    return refresh();
  }
}
