import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/screens/campaign_detail_screen.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';
import 'package:tire_toplu_alim/widgets/adaptive_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _campaigns = const [];

  @override
  void initState() {
    super.initState();
    _loadCampaigns();
  }

  Future<void> _loadCampaigns() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final user = SupabaseService.client.auth.currentUser;
      String? neighborhood;
      var cityId = AppConfig.defaultCityId;

      if (user != null) {
        final profile = await SupabaseService.client
            .from('profiles')
            .select('neighborhood, city_id')
            .eq('id', user.id)
            .maybeSingle();
        neighborhood = profile?['neighborhood'] as String?;
        cityId = (profile?['city_id'] as String?)?.trim().isNotEmpty == true
            ? (profile?['city_id'] as String).trim()
            : AppConfig.defaultCityId;
      }

      dynamic query = SupabaseService.client
          .from('campaigns')
          .select(
            'id, title, neighborhood, target_count, ends_at, featured, sponsor_name, sponsor_until',
          )
          .eq('city_id', cityId)
          .eq('status', 'active')
          .order('ends_at', ascending: true);

      if (neighborhood != null && neighborhood.trim().isNotEmpty) {
        query = query.eq('neighborhood', neighborhood.trim());
      }

      final response = await query;
      final list = (response as List)
          .map((item) => item as Map<String, dynamic>)
          .toList();

      final nowUtc = DateTime.now().toUtc();
      bool isSponsored(Map<String, dynamic> item) {
        final featured = item['featured'] == true;
        final sponsorUntilRaw = item['sponsor_until'] as String?;
        final sponsorUntil =
            sponsorUntilRaw == null ? null : DateTime.tryParse(sponsorUntilRaw)?.toUtc();
        return featured && sponsorUntil != null && sponsorUntil.isAfter(nowUtc);
      }

      list.sort((a, b) {
        final aSponsored = isSponsored(a);
        final bSponsored = isSponsored(b);
        if (aSponsored != bSponsored) return aSponsored ? -1 : 1;

        final aEnds = DateTime.tryParse((a['ends_at'] as String?) ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final bEnds = DateTime.tryParse((b['ends_at'] as String?) ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return aEnds.compareTo(bEnds);
      });

      if (!mounted) return;
      setState(() {
        _campaigns = list;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Kampanyalar yüklenemedi: $e';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = _buildContent(context);
    return Column(
      children: [
        Expanded(child: content),
        const SafeArea(
          top: false,
          child: AdaptiveBanner(adUnitId: AppConfig.homeBannerAdUnitId),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _loadCampaigns,
                child: Text(AppLocalizations.of(context).retry),
              ),
            ],
          ),
        ),
      );
    }

    if (_campaigns.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inventory_2_outlined, size: 64),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).homeNoCampaign,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              AppLocalizations.of(context).homeNoCampaignInTire,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadCampaigns,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _campaigns.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final campaign = _campaigns[index];
          final campaignId = campaign['id'] as String;

          final sponsorUntilRaw = campaign['sponsor_until'] as String?;
          final sponsorUntil = sponsorUntilRaw == null
              ? null
              : DateTime.tryParse(sponsorUntilRaw)?.toUtc();
          final isSponsored = campaign['featured'] == true &&
              sponsorUntil != null &&
              sponsorUntil.isAfter(DateTime.now().toUtc());
          final sponsorName = (campaign['sponsor_name'] as String?)?.trim();

          return ListTile(
            title: Row(
              children: [
                Expanded(child: Text(campaign['title'] as String? ?? '-')),
                if (isSponsored)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child:
                        Text(AppLocalizations.of(context).sponsored, style: const TextStyle(fontSize: 12)),
                  ),
              ],
            ),
            subtitle: Text(
              '${AppLocalizations.of(context).homeNeighborhood(campaign['neighborhood']?.toString() ?? '-')}\n'
              '${AppLocalizations.of(context).homeTargetEnds(campaign['target_count']?.toString() ?? '-', campaign['ends_at']?.toString() ?? '-')}'+
              '${isSponsored && sponsorName != null && sponsorName.isNotEmpty ? '\n${AppLocalizations.of(context).sponsor(sponsorName)}' : ''}',
            ),
            isThreeLine: true,
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => CampaignDetailScreen(campaignId: campaignId),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
