import 'package:flutter/material.dart';
import 'package:tire_toplu_alim/l10n/app_localizations.dart';
import 'package:tire_toplu_alim/repositories/campaign_repository.dart';

class CreateCampaignScreen extends StatefulWidget {
  const CreateCampaignScreen({super.key});

  @override
  State<CreateCampaignScreen> createState() => _CreateCampaignScreenState();
}

class _CreateCampaignScreenState extends State<CreateCampaignScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _targetCountController = TextEditingController(text: '10');
  final _sponsorBusinessController = TextEditingController();
  final _sponsorPhoneController = TextEditingController();
  final _sponsorNoteController = TextEditingController();
  final _repository = CampaignRepository();

  int _durationHours = 24;
  String _deliveryMode = 'seller';
  bool _saving = false;
  bool _loadingPickupPoints = false;
  bool _requestCampaignSponsorship = false;
  bool _requestPickupPointSponsorship = false;
  String? _error;
  String? _selectedPickupPointId;
  List<Map<String, dynamic>> _pickupPoints = const [];

  @override
  void initState() {
    super.initState();
    _loadPickupPoints();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _targetCountController.dispose();
    _sponsorBusinessController.dispose();
    _sponsorPhoneController.dispose();
    _sponsorNoteController.dispose();
    super.dispose();
  }

  Future<void> _loadPickupPoints() async {
    setState(() {
      _loadingPickupPoints = true;
    });
    try {
      final points = await _repository.fetchActivePickupPointsForCurrentCity();
      if (!mounted) return;
      setState(() {
        _pickupPoints = points;
        _selectedPickupPointId = points.isNotEmpty ? points.first['id'] as String : null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _pickupPoints = const [];
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _loadingPickupPoints = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      Map<String, dynamic>? selectedPickupPoint;
      for (final point in _pickupPoints) {
        if (point['id'] == _selectedPickupPointId) {
          selectedPickupPoint = point;
          break;
        }
      }
      await _repository.createCampaign(
        title: _titleController.text,
        targetCount: int.parse(_targetCountController.text),
        durationHours: _durationHours,
        deliveryMode: _deliveryMode,
        pickupPointId: _deliveryMode == 'pickup_point' ? _selectedPickupPointId : null,
        pickupPointName: (_deliveryMode == 'pickup_point')
            ? (selectedPickupPoint?['name']?.toString())
            : null,
        requestCampaignSponsorship: _requestCampaignSponsorship,
        requestPickupPointSponsorship: _requestPickupPointSponsorship,
        sponsorBusinessName: _sponsorBusinessController.text,
        sponsorContactPhone: _sponsorPhoneController.text,
        sponsorNote: _sponsorNoteController.text,
      );

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Kampanya oluşturulamadı: $e';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final sponsorshipVisible = _requestCampaignSponsorship || _requestPickupPointSponsorship;

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context).createCampaign)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(AppLocalizations.of(context).safetyBanner),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).campaignTitleLabel),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return AppLocalizations.of(context).requiredTitle;
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _targetCountController,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).targetCount),
                keyboardType: TextInputType.number,
                validator: (value) {
                  final parsed = int.tryParse((value ?? '').trim());
                  if (parsed == null || parsed <= 0) {
                    return AppLocalizations.of(context).validTarget;
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: _durationHours,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).duration),
                items: [
                  DropdownMenuItem(value: 24, child: Text(AppLocalizations.of(context).duration24)),
                  DropdownMenuItem(value: 48, child: Text(AppLocalizations.of(context).duration48)),
                  DropdownMenuItem(value: 168, child: Text(AppLocalizations.of(context).duration168)),
                ],
                onChanged: _saving
                    ? null
                    : (value) {
                        if (value == null) return;
                        setState(() {
                          _durationHours = value;
                        });
                      },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _deliveryMode,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).deliveryMode),
                items: [
                  DropdownMenuItem(value: 'seller', child: Text(AppLocalizations.of(context).deliverySeller)),
                  DropdownMenuItem(value: 'pickup_point', child: Text(AppLocalizations.of(context).deliveryPickupPoint)),
                ],
                onChanged: _saving
                    ? null
                    : (value) {
                        if (value == null) return;
                        setState(() {
                          _deliveryMode = value;
                        });
                      },
              ),
              if (_deliveryMode == 'pickup_point') ...[
                const SizedBox(height: 12),
                if (_loadingPickupPoints)
                  const LinearProgressIndicator()
                else if (_pickupPoints.isEmpty)
                  Text(AppLocalizations.of(context).activePickupPointNotFound)
                else
                  DropdownButtonFormField<String>(
                    value: _selectedPickupPointId,
                    decoration: InputDecoration(labelText: AppLocalizations.of(context).pickupPoint),
                    items: _pickupPoints.map((point) {
                      final name = point['name'] as String? ?? '-';
                      final raw = point['sponsored_until'] as String?;
                      final until = raw == null ? null : DateTime.tryParse(raw)?.toUtc();
                      final isSponsored = until != null && until.isAfter(DateTime.now().toUtc());
                      return DropdownMenuItem(
                        value: point['id'] as String,
                        child: Text(isSponsored ? '$name (${AppLocalizations.of(context).sponsored})' : name),
                      );
                    }).toList(),
                    onChanged: _saving
                        ? null
                        : (value) => setState(() => _selectedPickupPointId = value),
                    validator: (value) {
                      if (_deliveryMode == 'pickup_point' && (value == null || value.isEmpty)) {
                        return AppLocalizations.of(context).pickupPointRequired;
                      }
                      return null;
                    },
                  ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(AppLocalizations.of(context).sponsorThisPickupPoint),
                  value: _requestPickupPointSponsorship,
                  onChanged: _saving
                      ? null
                      : (value) {
                          setState(() {
                            _requestPickupPointSponsorship = value ?? false;
                          });
                        },
                ),
              ],
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(AppLocalizations.of(context).sponsorRequestToggle),
                value: _requestCampaignSponsorship,
                onChanged: _saving
                    ? null
                    : (value) {
                        setState(() {
                          _requestCampaignSponsorship = value ?? false;
                        });
                      },
              ),
              if (sponsorshipVisible) ...[
                TextFormField(
                  controller: _sponsorBusinessController,
                  decoration: InputDecoration(labelText: AppLocalizations.of(context).businessName),
                  validator: (value) {
                    if (sponsorshipVisible && (value == null || value.trim().isEmpty)) {
                      return AppLocalizations.of(context).requiredBusinessName;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _sponsorPhoneController,
                  decoration: InputDecoration(labelText: AppLocalizations.of(context).contactPhone),
                  validator: (value) {
                    if (sponsorshipVisible && (value == null || value.trim().isEmpty)) {
                      return AppLocalizations.of(context).requiredPhone;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _sponsorNoteController,
                  decoration: InputDecoration(labelText: AppLocalizations.of(context).optionalNote),
                  maxLines: 2,
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _submit,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(AppLocalizations.of(context).createCampaign),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
