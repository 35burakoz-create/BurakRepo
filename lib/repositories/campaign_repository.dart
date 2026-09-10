import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/services/audit_event_service.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';

const _cooldownDays = 7;
const _blockedKeywords = <String>[
  'silah',
  'tabanca',
  'tüfek',
  'uyusturucu',
  'uyuşturucu',
  'esrar',
  'kokain',
  'eroin',
  'porno',
  'müstehcen',
  'mufredatdisi',
  'ırkçı',
  'nefret',
  'extremist',
  'aşırıcı',
  'teror',
  'terör',
];

class CampaignRepository {
  bool _containsBlockedContent(String value) {
    final normalized = value.toLowerCase();
    for (final keyword in _blockedKeywords) {
      if (normalized.contains(keyword)) {
        return true;
      }
    }
    return false;
  }

  Future<String> fetchCurrentUserCityId() async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) return AppConfig.defaultCityId;

    final profile = await SupabaseService.client
        .from('profiles')
        .select('city_id')
        .eq('id', user.id)
        .maybeSingle();

    final cityId = (profile?['city_id'] as String?)?.trim();
    return cityId == null || cityId.isEmpty ? AppConfig.defaultCityId : cityId;
  }

  Future<List<Map<String, dynamic>>> fetchActivePickupPointsForCurrentCity() async {
    final cityId = await fetchCurrentUserCityId();
    final result = await SupabaseService.client
        .from('pickup_points')
        .select('id, name, address, phone, sponsored_until')
        .eq('city_id', cityId)
        .eq('is_active', true)
        .order('sponsored_until', ascending: false)
        .order('name', ascending: true);

    final rows = (result as List)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final nowUtc = DateTime.now().toUtc();
    rows.sort((a, b) {
      bool isSponsored(Map<String, dynamic> row) {
        final raw = row['sponsored_until'] as String?;
        final until = raw == null ? null : DateTime.tryParse(raw)?.toUtc();
        return until != null && until.isAfter(nowUtc);
      }

      final aSponsored = isSponsored(a);
      final bSponsored = isSponsored(b);
      if (aSponsored != bSponsored) return aSponsored ? -1 : 1;
      return (a['name'] as String? ?? '').compareTo(b['name'] as String? ?? '');
    });
    return rows;
  }

  Future<DateTime?> fetchCurrentUserCooldownUntil() async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final profile = await SupabaseService.client
        .from('profiles')
        .select('cooldown_until')
        .eq('id', user.id)
        .maybeSingle();

    final value = profile?['cooldown_until'] as String?;
    if (value == null || value.isEmpty) {
      return null;
    }

    return DateTime.tryParse(value)?.toUtc();
  }

  Future<void> applyCooldownToCurrentUser() async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final cooldownUntil =
        DateTime.now().toUtc().add(const Duration(days: _cooldownDays));

    await SupabaseService.client
        .from('profiles')
        .update({'cooldown_until': cooldownUntil.toIso8601String()})
        .eq('id', user.id);
  }

  Future<void> _createSponsorshipRequest({
    required String cityId,
    required String type,
    required String businessName,
    required String contactPhone,
    String? targetId,
    String? note,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final inserted = await SupabaseService.client
        .from('sponsorship_requests')
        .insert({
          'city_id': cityId,
          'user_id': user.id,
          'business_name': businessName.trim(),
          'contact_phone': contactPhone.trim(),
          'type': type,
          'target_id': targetId,
          'note': note?.trim(),
        })
        .select('id')
        .single();

    await AuditEventService.logUserAction(
      action: 'sponsorship_request_create',
      entityType: 'sponsorship_request',
      entityId: inserted['id'] as String?,
      cityId: cityId,
      payload: {'type': type, 'target_id': targetId},
    );
  }

  Future<void> createCampaign({
    required String title,
    required int targetCount,
    required int durationHours,
    required String deliveryMode,
    String? pickupPointName,
    String? pickupPointId,
    bool requestCampaignSponsorship = false,
    bool requestPickupPointSponsorship = false,
    String? sponsorBusinessName,
    String? sponsorContactPhone,
    String? sponsorNote,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final profile = await SupabaseService.client
        .from('profiles')
        .select('city_id, neighborhood')
        .eq('id', user.id)
        .single();

    final cityId = (profile['city_id'] as String?) ?? AppConfig.defaultCityId;
    final neighborhood = profile['neighborhood'] as String?;

    if (neighborhood == null || neighborhood.trim().isEmpty) {
      throw Exception('Kampanya oluşturmak için profil mahallesi gerekli.');
    }

    final mergedContent = [
      title,
      if (pickupPointName != null) pickupPointName,
    ].join(' ').trim();

    if (_containsBlockedContent(mergedContent)) {
      throw Exception(
        'Kampanya içeriği topluluk kurallarına aykırı görünüyor ve oluşturulamadı.',
      );
    }

    final normalizedMode = deliveryMode.trim();
    final payload = <String, dynamic>{
      'city_id': cityId,
      'neighborhood': neighborhood.trim(),
      'title': title.trim(),
      'target_count': targetCount,
      'ends_at': DateTime.now()
          .toUtc()
          .add(Duration(hours: durationHours))
          .toIso8601String(),
      'delivery_mode': normalizedMode,
      'pickup_point_name':
          normalizedMode == 'pickup_point' ? pickupPointName?.trim() : null,
      'pickup_point_id':
          normalizedMode == 'pickup_point' ? pickupPointId?.trim() : null,
      'created_by': user.id,
      'status': 'active',
    };

    final inserted = await SupabaseService.client
        .from('campaigns')
        .insert(payload)
        .select('id')
        .single();

    final campaignId = inserted['id'] as String;

    await AuditEventService.logUserAction(
      action: 'campaign_create',
      entityType: 'campaign',
      entityId: campaignId,
      cityId: cityId,
      payload: {
        'target_count': targetCount,
        'delivery_mode': normalizedMode,
      },
    );

    if ((requestCampaignSponsorship || requestPickupPointSponsorship) &&
        ((sponsorBusinessName ?? '').trim().isEmpty ||
            (sponsorContactPhone ?? '').trim().isEmpty)) {
      throw Exception('Sponsorluk talebi için işletme adı ve telefon zorunludur.');
    }

    if (requestCampaignSponsorship) {
      await _createSponsorshipRequest(
        cityId: cityId,
        type: 'campaign',
        businessName: sponsorBusinessName ?? '',
        contactPhone: sponsorContactPhone ?? '',
        targetId: campaignId,
        note: sponsorNote,
      );
    }

    if (requestPickupPointSponsorship && pickupPointId != null && pickupPointId.isNotEmpty) {
      await _createSponsorshipRequest(
        cityId: cityId,
        type: 'pickup_point',
        businessName: sponsorBusinessName ?? '',
        contactPhone: sponsorContactPhone ?? '',
        targetId: pickupPointId,
        note: sponsorNote,
      );
    }
  }

  Future<Map<String, dynamic>> fetchCampaignById(String campaignId) async {
    return await SupabaseService.client
        .from('campaigns')
        .select(
          'id, title, neighborhood, target_count, ends_at, status, city_id, created_by, delivery_mode, pickup_point_name, pickup_point_id',
        )
        .eq('id', campaignId)
        .single();
  }

  Future<Map<String, dynamic>?> fetchPickupPointById(String pickupPointId) async {
    return await SupabaseService.client
        .from('pickup_points')
        .select('id, name, address, phone, sponsored_until')
        .eq('id', pickupPointId)
        .maybeSingle();
  }

  Future<int> fetchParticipantCount(String campaignId) async {
    final rows = await SupabaseService.client
        .from('participants')
        .select('id')
        .eq('campaign_id', campaignId);
    return (rows as List).length;
  }

  Future<void> joinCampaign({
    required String campaignId,
    required int qty,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    await SupabaseService.client.from('participants').upsert(
      {
        'campaign_id': campaignId,
        'user_id': user.id,
        'qty': qty,
        'pledged': true,
      },
      onConflict: 'campaign_id,user_id',
    );

    await AuditEventService.logUserAction(
      action: 'participant_join',
      entityType: 'participant',
      entityId: campaignId,
      payload: {'qty': qty},
    );
  }

  Future<void> setWillCome({
    required String campaignId,
    required bool willCome,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final participant = await SupabaseService.client
        .from('participants')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (participant == null) {
      throw Exception('Önce kampanyaya katılmalısınız.');
    }

    await SupabaseService.client
        .from('participants')
        .update({'will_come': willCome})
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

    if (!willCome) {
      await applyCooldownToCurrentUser();
      // TODO: Add server-side cooldown enforcement when user does not confirm will_come within X hours after campaign fill.
    }

    await AuditEventService.logUserAction(
      action: 'participant_will_come',
      entityType: 'participant',
      entityId: campaignId,
      payload: {'will_come': willCome},
    );
  }

  Future<void> submitReport({
    required String campaignId,
    required String reason,
  }) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    final inserted = await SupabaseService.client
        .from('reports')
        .insert({
          'campaign_id': campaignId,
          'reporter_id': user.id,
          'reason': reason.trim(),
        })
        .select('id')
        .single();

    await AuditEventService.logUserAction(
      action: 'report_create',
      entityType: 'report',
      entityId: inserted['id'] as String?,
      payload: {'reason': reason.trim()},
    );
  }

  Future<void> markCampaignCompleted(String campaignId) async {
    final user = SupabaseService.client.auth.currentUser;
    if (user == null) {
      throw Exception('Oturum bulunamadı.');
    }

    await SupabaseService.client
        .from('campaigns')
        .update({'status': 'completed'})
        .eq('id', campaignId)
        .eq('created_by', user.id);

    await AuditEventService.logUserAction(
      action: 'campaign_complete',
      entityType: 'campaign',
      entityId: campaignId,
      payload: {'status': 'completed'},
    );
  }
}
