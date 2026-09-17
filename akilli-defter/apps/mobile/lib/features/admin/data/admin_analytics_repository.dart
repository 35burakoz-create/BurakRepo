import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/supabase_guard.dart';

class MetricItem {
  const MetricItem({required this.label, required this.value, this.helper});

  final String label;
  final String value;
  final String? helper;
}

class AdminAnalyticsData {
  const AdminAnalyticsData({
    required this.connectionText,
    required this.general,
    required this.plans,
    required this.ai,
    required this.coupons,
    this.error,
  });

  final String connectionText;
  final List<MetricItem> general;
  final List<MetricItem> plans;
  final List<MetricItem> ai;
  final List<MetricItem> coupons;
  final String? error;
}

class AdminAnalyticsRepository {
  Future<AdminAnalyticsData> load() async {
    if (!isSupabaseReady()) {
      final prefs = await SharedPreferences.getInstance();
      final txs = prefs.getString('wallet_transactions');
      final txCount = txs == null || txs.isEmpty ? 0 : txs.split('{').length - 1;
      final lastSync = prefs.getString('last_sync_at') ?? '—';

      return AdminAnalyticsData(
        connectionText: 'Bağlantı yok',
        general: [
          MetricItem(label: 'Yerel işlem sayısı', value: '$txCount', helper: 'Sadece bu cihaz'),
          const MetricItem(label: 'Uygulama sürümü', value: '0.1.0+1'),
          MetricItem(label: 'Son eşitleme', value: lastSync),
        ],
        plans: const [MetricItem(label: 'Plan dağılımı', value: '—', helper: 'Kurulum gerekli')],
        ai: const [MetricItem(label: 'AI metriği', value: '—', helper: 'Kurulum gerekli')],
        coupons: const [MetricItem(label: 'Kupon metriği', value: '—', helper: 'Kurulum gerekli')],
      );
    }

    try {
      final client = Supabase.instance.client;
      final today = DateTime.now().toIso8601String().split('T').first;
      final sevenDaysAgo = DateTime.now().subtract(const Duration(days: 7)).toIso8601String().split('T').first;

      int countFrom(List rows) => rows.length;

      final profiles = await client.from('profiles').select('user_id,plan,trial_ends_at,updated_at').limit(5000);
      final aiToday = await client.from('ai_usage_daily').select('used_count,used_tokens').eq('day', today).limit(5000);
      final ai7 = await client.from('ai_usage_daily').select('day,used_count,user_id').gte('day', sevenDaysAgo).limit(5000);
      final paywall = await client
          .from('paywall_events')
          .select('event_name,ts')
          .eq('event_name', 'quota_exceeded')
          .gte('ts', sevenDaysAgo)
          .limit(5000);
      final coupon7 = await client
          .from('coupon_redemptions')
          .select('code,redeemed_at')
          .gte('redeemed_at', '${sevenDaysAgo}T00:00:00Z')
          .limit(5000);

      final profileList = (profiles as List).cast<Map<String, dynamic>>();
      final aiTodayList = (aiToday as List).cast<Map<String, dynamic>>();
      final ai7List = (ai7 as List).cast<Map<String, dynamic>>();
      final paywallList = (paywall as List).cast<Map<String, dynamic>>();
      final couponList = (coupon7 as List).cast<Map<String, dynamic>>();

      final planCounts = <String, int>{'FREE': 0, 'TRIAL': 0, 'PRO': 0, 'VIP': 0};
      final trialDays = <String, int>{};
      for (final row in profileList) {
        final plan = ('${row['plan'] ?? 'FREE'}').toUpperCase();
        planCounts[plan] = (planCounts[plan] ?? 0) + 1;
        if (plan == 'TRIAL' && row['trial_ends_at'] != null) {
          final end = DateTime.tryParse('${row['trial_ends_at']}');
          if (end != null) {
            final days = end.difference(DateTime.now()).inDays.clamp(0, 7);
            final k = '$days gün';
            trialDays[k] = (trialDays[k] ?? 0) + 1;
          }
        }
      }

      var todayReq = 0;
      var todayTokens = 0;
      final topUsers = <String, int>{};
      final aiByDay = <String, int>{};
      for (final row in aiTodayList) {
        todayReq += (row['used_count'] as num?)?.toInt() ?? 0;
        todayTokens += (row['used_tokens'] as num?)?.toInt() ?? 0;
      }
      for (final row in ai7List) {
        final uid = '${row['user_id'] ?? '-'}';
        final cnt = (row['used_count'] as num?)?.toInt() ?? 0;
        topUsers[uid] = (topUsers[uid] ?? 0) + cnt;
        final day = '${row['day'] ?? '-'}';
        aiByDay[day] = (aiByDay[day] ?? 0) + cnt;
      }
      final top10 = topUsers.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
      final top10Text = top10.take(10).map((e) => '${e.key.substring(0, 8)}…: ${e.value}').join(', ');
      final ai7Text = aiByDay.entries.map((e) => '${e.key}: ${e.value}').join(' | ');

      final couponTop = <String, int>{};
      for (final row in couponList) {
        final code = '${row['code'] ?? '-'}';
        couponTop[code] = (couponTop[code] ?? 0) + 1;
      }
      final couponTopText = (couponTop.entries.toList()..sort((a, b) => b.value.compareTo(a.value)))
          .take(5)
          .map((e) => '${e.key}: ${e.value}')
          .join(', ');

      return AdminAnalyticsData(
        connectionText: 'Supabase bağlı',
        general: [
          MetricItem(label: 'Toplam kullanıcı', value: '${countFrom(profileList)}'),
          const MetricItem(label: 'Bugün yeni kayıt', value: '—', helper: 'Kurulum gerekli'),
        ],
        plans: [
          MetricItem(label: 'Free / Trial / Pro / VIP', value: '${planCounts['FREE']}/${planCounts['TRIAL']}/${planCounts['PRO']}/${planCounts['VIP']}'),
          MetricItem(label: 'Deneme kalan gün', value: trialDays.entries.map((e) => '${e.key}: ${e.value}').join(', ').isEmpty ? '—' : trialDays.entries.map((e) => '${e.key}: ${e.value}').join(', ')),
        ],
        ai: [
          MetricItem(label: 'Bugün AI istek', value: '$todayReq'),
          MetricItem(label: 'Bugün token', value: '$todayTokens'),
          MetricItem(label: 'Son 7 gün AI istek', value: ai7Text.isEmpty ? '—' : ai7Text),
          MetricItem(label: 'Top 10 AI kullanıcı', value: top10Text.isEmpty ? '—' : top10Text),
          MetricItem(label: 'Quota aşımı (7g)', value: '${paywallList.length}'),
        ],
        coupons: [
          MetricItem(label: 'Son 7 gün kupon kullanımı', value: '${couponList.length}'),
          MetricItem(label: 'En çok kullanılan kuponlar', value: couponTopText.isEmpty ? '—' : couponTopText),
        ],
      );
    } catch (_) {
      return const AdminAnalyticsData(
        connectionText: 'Supabase bağlı',
        general: [MetricItem(label: 'Genel', value: '—', helper: 'Kurulum gerekli')],
        plans: [MetricItem(label: 'Planlar', value: '—', helper: 'Kurulum gerekli')],
        ai: [MetricItem(label: 'AI Kullanımı', value: '—', helper: 'Kurulum gerekli')],
        coupons: [MetricItem(label: 'Kuponlar', value: '—', helper: 'Kurulum gerekli')],
        error: 'Veri alınamadı.',
      );
    }
  }
}
