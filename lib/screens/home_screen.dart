import 'package:flutter/material.dart';
import 'package:tire_toplu_alim/l10n/app_localizations.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/screens/campaign_detail_screen.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';
import 'package:tire_toplu_alim/ui/app_spacing.dart';
import 'package:tire_toplu_alim/widgets/adaptive_banner.dart';

enum _SortMode { sponsoredFirst, endingSoon }

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _campaigns = const [];
  String? _selectedNeighborhood;
  _SortMode _sortMode = _SortMode.sponsoredFirst;

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

  List<String> get _neighborhoods {
    final values = _campaigns
        .map((e) => (e['neighborhood'] as String?)?.trim())
        .whereType<String>()
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList()
      ..sort();
    return values;
  }

  List<Map<String, dynamic>> _visibleCampaigns() {
    final nowUtc = DateTime.now().toUtc();

    bool isSponsored(Map<String, dynamic> item) {
      final featured = item['featured'] == true;
      final sponsorUntilRaw = item['sponsor_until'] as String?;
      final sponsorUntil =
          sponsorUntilRaw == null ? null : DateTime.tryParse(sponsorUntilRaw)?.toUtc();
      return featured && sponsorUntil != null && sponsorUntil.isAfter(nowUtc);
    }

    final list = _campaigns.where((item) {
      if (_selectedNeighborhood == null) return true;
      return (item['neighborhood']?.toString() ?? '') == _selectedNeighborhood;
    }).toList();

    list.sort((a, b) {
      if (_sortMode == _SortMode.sponsoredFirst) {
        final aSponsored = isSponsored(a);
        final bSponsored = isSponsored(b);
        if (aSponsored != bSponsored) return aSponsored ? -1 : 1;
      }

      final aEnds = DateTime.tryParse((a['ends_at'] as String?) ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bEnds = DateTime.tryParse((b['ends_at'] as String?) ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return aEnds.compareTo(bEnds);
    });

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visibleCampaigns();
    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadCampaigns,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                _FilterSection(
                  neighborhoods: _neighborhoods,
                  selectedNeighborhood: _selectedNeighborhood,
                  sortMode: _sortMode,
                  onNeighborhoodSelected: (value) {
                    setState(() => _selectedNeighborhood = value);
                  },
                  onSortModeSelected: (value) {
                    setState(() => _sortMode = value);
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                if (_loading)
                  const _HomeLoadingSkeleton()
                else if (_error != null)
                  _ErrorState(message: _error!, onRetry: _loadCampaigns)
                else if (visible.isEmpty)
                  _EmptyState(onRetry: _loadCampaigns)
                else
                  ...visible.map((campaign) => _CampaignCard(campaign: campaign)),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: AdaptiveBanner(adUnitId: AppConfig.homeBannerAdUnitId),
        ),
      ],
    );
  }
}

class _FilterSection extends StatelessWidget {
  const _FilterSection({
    required this.neighborhoods,
    required this.selectedNeighborhood,
    required this.sortMode,
    required this.onNeighborhoodSelected,
    required this.onSortModeSelected,
  });

  final List<String> neighborhoods;
  final String? selectedNeighborhood;
  final _SortMode sortMode;
  final ValueChanged<String?> onNeighborhoodSelected;
  final ValueChanged<_SortMode> onSortModeSelected;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(AppLocalizations.of(context).filters, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                ChoiceChip(
                  label: Text(AppLocalizations.of(context).allNeighborhoods),
                  selected: selectedNeighborhood == null,
                  onSelected: (_) => onNeighborhoodSelected(null),
                ),
                ...neighborhoods.map(
                  (n) => ChoiceChip(
                    label: Text(n),
                    selected: selectedNeighborhood == n,
                    onSelected: (_) => onNeighborhoodSelected(n),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            SegmentedButton<_SortMode>(
              segments: [
                ButtonSegment(
                  value: _SortMode.sponsoredFirst,
                  label: Text(AppLocalizations.of(context).sortSponsoredFirst),
                ),
                ButtonSegment(
                  value: _SortMode.endingSoon,
                  label: Text(AppLocalizations.of(context).sortEndingSoon),
                ),
              ],
              selected: {sortMode},
              onSelectionChanged: (value) => onSortModeSelected(value.first),
            ),
          ],
        ),
      ),
    );
  }
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({required this.campaign});

  final Map<String, dynamic> campaign;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final campaignId = campaign['id'] as String;
    final sponsorUntilRaw = campaign['sponsor_until'] as String?;
    final sponsorUntil =
        sponsorUntilRaw == null ? null : DateTime.tryParse(sponsorUntilRaw)?.toUtc();
    final isSponsored = campaign['featured'] == true &&
        sponsorUntil != null &&
        sponsorUntil.isAfter(DateTime.now().toUtc());
    final sponsorName = (campaign['sponsor_name'] as String?)?.trim();

    final target = (campaign['target_count'] as num?)?.toInt() ?? 1;
    final current = 0;
    final progress = target <= 0 ? 0.0 : (current / target).clamp(0.0, 1.0);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => CampaignDetailScreen(campaignId: campaignId),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      campaign['title'] as String? ?? '-',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  if (isSponsored) Chip(label: Text(l10n.sponsored)),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                children: [
                  Chip(
                    label: Text(
                      l10n.homeNeighborhood(campaign['neighborhood']?.toString() ?? '-'),
                    ),
                  ),
                  Chip(
                    label: Text(
                      l10n.endAt(campaign['ends_at']?.toString() ?? '-'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              LinearProgressIndicator(value: progress),
              const SizedBox(height: AppSpacing.xs),
              Text('$current / $target'),
              if (isSponsored && sponsorName != null && sponsorName.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: Text(
                    l10n.sponsor(sponsorName),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeLoadingSkeleton extends StatelessWidget {
  const _HomeLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Column(
      children: List.generate(
        4,
        (_) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: Container(
            height: 128,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 56,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(l10n.homeNoCampaign, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.xs),
            Text(l10n.homeNoCampaignInTire, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.md),
            FilledButton(onPressed: onRetry, child: Text(l10n.retry)),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.md),
            FilledButton(onPressed: onRetry, child: Text(l10n.retry)),
          ],
        ),
      ),
    );
  }
}
