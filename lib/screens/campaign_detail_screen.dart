import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/repositories/campaign_repository.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';
import 'package:tire_toplu_alim/widgets/adaptive_banner.dart';
import 'package:url_launcher/url_launcher.dart';

class CampaignDetailScreen extends StatefulWidget {
  const CampaignDetailScreen({super.key, required this.campaignId});

  final String campaignId;

  @override
  State<CampaignDetailScreen> createState() => _CampaignDetailScreenState();
}

class _CampaignDetailScreenState extends State<CampaignDetailScreen> {
  final _repository = CampaignRepository();
  final _qtyController = TextEditingController(text: '1');

  bool _loading = true;
  bool _actionLoading = false;
  String? _error;
  Map<String, dynamic>? _campaign;
  Map<String, dynamic>? _pickupPoint;
  int _participantCount = 0;
  DateTime? _cooldownUntil;

  static const _reportReasons = <String>[
    'Fraud/Scam',
    'Illegal item',
    'Harassment',
    'Personal data',
    'Other',
  ];

  bool get _isJoinBlockedByCooldown {
    if (_cooldownUntil == null) return false;
    return _cooldownUntil!.isAfter(DateTime.now().toUtc());
  }

  String get _cooldownMessage {
    if (_cooldownUntil == null) return '';
    return 'Katılımınız geçici olarak kısıtlandı. Tekrar katılım: ${_cooldownUntil!.toLocal()}';
  }

  @override
  void initState() {
    super.initState();
    _loadCampaign();
  }

  @override
  void dispose() {
    _qtyController.dispose();
    super.dispose();
  }

  Future<void> _loadCampaign() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final campaign = await _repository.fetchCampaignById(widget.campaignId);
      final participantCount =
          await _repository.fetchParticipantCount(widget.campaignId);
      final cooldownUntil = await _repository.fetchCurrentUserCooldownUntil();

      Map<String, dynamic>? pickupPoint;
      final pickupPointId = campaign['pickup_point_id'] as String?;
      if (pickupPointId != null && pickupPointId.isNotEmpty) {
        pickupPoint = await _repository.fetchPickupPointById(pickupPointId);
      }

      if (!mounted) return;
      setState(() {
        _campaign = campaign;
        _participantCount = participantCount;
        _cooldownUntil = cooldownUntil;
        _pickupPoint = pickupPoint;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Kampanya detayı yüklenemedi: $e';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _runAction(Future<void> Function() action) async {
    setState(() {
      _actionLoading = true;
    });

    try {
      await action();
      await _loadCampaign();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${AppLocalizations.of(context).actionFailed} $e')),
      );
    } finally {
      if (!mounted) return;
      setState(() {
        _actionLoading = false;
      });
    }
  }

  Future<void> _shareToWhatsApp() async {
    if (_campaign == null) return;

    final title = _campaign!['title'] ?? '-';
    final target = _campaign!['target_count'] ?? '-';
    final endsAt = _campaign!['ends_at'] ?? '-';
    final neighborhood = _campaign!['neighborhood'] ?? '-';
    final deliveryMode = _campaign!['delivery_mode'] ?? '-';
    final pickupPointName = _pickupPoint?['name'] ?? _campaign!['pickup_point_name'] ?? '-';

    final deliveryInfo = deliveryMode == 'pickup_point'
        ? 'Teslimat: pickup_point ($pickupPointName)'
        : 'Teslimat: seller';

    final message =
        'Toplu Alım Kampanyası\n'
        'Başlık: $title\n'
        'Katılım: $_participantCount/$target\n'
        'Bitiş: $endsAt\n'
        'Mahalle: $neighborhood\n'
        '$deliveryInfo';

    final encoded = Uri.encodeComponent(message);
    final uri = Uri.parse('https://wa.me/?text=$encoded');

    final canOpen = await canLaunchUrl(uri);
    if (!canOpen) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).shareWhatsApp+' açılamadı.')),
      );
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context).shareWhatsApp+' açılamadı.')),
      );
    }
  }

  Future<void> _openReportDialog() async {
    String selectedReason = _reportReasons.first;

    final reason = await showDialog<String>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(AppLocalizations.of(context).reportCampaign),
              content: DropdownButtonFormField<String>(
                value: selectedReason,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).reason),
                items: _reportReasons
                    .map(
                      (reason) => DropdownMenuItem<String>(
                        value: reason,
                        child: Text(reason),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  setDialogState(() {
                    selectedReason = value;
                  });
                },
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(AppLocalizations.of(context).cancel),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(selectedReason),
                  child: Text(AppLocalizations.of(context).send),
                ),
              ],
            );
          },
        );
      },
    );

    if (reason == null || reason.isEmpty) {
      return;
    }

    await _runAction(
      () => _repository.submitReport(
        campaignId: widget.campaignId,
        reason: reason,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.client.auth.currentUser?.id;
    final isOwner = _campaign != null && _campaign!['created_by'] == currentUserId;

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context).campaignDetail)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center),
                  ),
                )
              : _campaign == null
                  ? Center(child: Text(AppLocalizations.of(context).campaignNotFound))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _campaign!['title'] as String? ?? '-',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 12),
                          Text(AppLocalizations.of(context).homeNeighborhood(_campaign!['neighborhood']?.toString() ?? '-')),
                          Text(AppLocalizations.of(context).targetQty(_campaign!['target_count']?.toString() ?? '-')),
                          Text(AppLocalizations.of(context).endAt(_campaign!['ends_at']?.toString() ?? '-')),
                          Text('${AppLocalizations.of(context).status}: ${_campaign!['status'] ?? '-'}'),
                          Text(AppLocalizations.of(context).participantCount(_participantCount.toString())),
                          if ((_campaign!['delivery_mode'] as String?) == 'pickup_point') ...[
                            const SizedBox(height: 4),
                            Text(AppLocalizations.of(context).pickupPointLabel((_pickupPoint?['name'] ?? _campaign!['pickup_point_name'] ?? '-').toString())),
                            if (_pickupPoint?['address'] != null)
                              Text(AppLocalizations.of(context).address(_pickupPoint!['address'].toString())),
                            if (_pickupPoint?['phone'] != null)
                              Text(AppLocalizations.of(context).phone(_pickupPoint!['phone'].toString())),
                          ],
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.errorContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              AppLocalizations.of(context).safetyBanner,
                            ),
                          ),
                          if (_isJoinBlockedByCooldown) ...[
                            const SizedBox(height: 12),
                            Text(
                              _cooldownMessage,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          const AdaptiveBanner(adUnitId: AppConfig.detailBannerAdUnitId),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _qtyController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: AppLocalizations.of(context).qtyLabel,
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _actionLoading || _isJoinBlockedByCooldown
                                  ? null
                                  : () {
                                      final qty =
                                          int.tryParse(_qtyController.text.trim()) ?? 1;
                                      _runAction(
                                        () => _repository.joinCampaign(
                                          campaignId: widget.campaignId,
                                          qty: qty,
                                        ),
                                      );
                                    },
                              child: _actionLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : Text(AppLocalizations.of(context).join),
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.tonal(
                              onPressed: _actionLoading ? null : _shareToWhatsApp,
                              child: Text(AppLocalizations.of(context).shareWhatsApp),
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _actionLoading ? null : _openReportDialog,
                              child: Text(AppLocalizations.of(context).report),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton.tonal(
                                  onPressed: _actionLoading
                                      ? null
                                      : () => _runAction(
                                            () => _repository.setWillCome(
                                              campaignId: widget.campaignId,
                                              willCome: true,
                                            ),
                                          ),
                                  child: Text(AppLocalizations.of(context).willCome),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: FilledButton.tonal(
                                  onPressed: _actionLoading
                                      ? null
                                      : () => _runAction(
                                            () => _repository.setWillCome(
                                              campaignId: widget.campaignId,
                                              willCome: false,
                                            ),
                                          ),
                                  child: Text(AppLocalizations.of(context).wontCome),
                                ),
                              ),
                            ],
                          ),
                          if (isOwner) ...[
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _actionLoading
                                    ? null
                                    : () => _runAction(
                                          () => _repository.markCampaignCompleted(
                                            widget.campaignId,
                                          ),
                                        ),
                                child: Text(AppLocalizations.of(context).delivered),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
    );
  }
}
