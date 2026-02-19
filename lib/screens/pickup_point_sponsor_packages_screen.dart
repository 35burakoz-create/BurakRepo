import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:tire_toplu_alim/l10n/app_localizations.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:tire_toplu_alim/repositories/campaign_repository.dart';
import 'package:tire_toplu_alim/services/billing_service.dart';

class PickupPointSponsorPackagesScreen extends StatefulWidget {
  const PickupPointSponsorPackagesScreen({super.key});

  @override
  State<PickupPointSponsorPackagesScreen> createState() =>
      _PickupPointSponsorPackagesScreenState();
}

class _PickupPointSponsorPackagesScreenState
    extends State<PickupPointSponsorPackagesScreen> {
  final _billing = BillingService();
  final _repository = CampaignRepository();

  List<Map<String, dynamic>> _pickupPoints = const [];
  List<ProductDetails> _products = const [];
  String? _selectedPickupPointId;
  String? _error;
  bool _loading = true;

  StreamSubscription<List<PurchaseDetails>>? _purchaseSub;

  bool get _enabled => kDebugMode;

  @override
  void initState() {
    super.initState();
    _purchaseSub = InAppPurchase.instance.purchaseStream.listen(
      _onPurchaseUpdate,
      onError: (e) {
        if (!mounted) return;
        setState(() => _error = 'Satın alma akışı hatası: $e');
      },
    );
    _load();
  }

  @override
  void dispose() {
    _purchaseSub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final points = await _repository.fetchActivePickupPointsForCurrentCity();
      final products = await _billing.querySponsorProducts();
      if (!mounted) return;
      setState(() {
        _pickupPoints = points;
        _selectedPickupPointId =
            points.isEmpty ? null : points.first['id'] as String;
        _products = products.productDetails;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Paketler yüklenemedi: $e');
    } finally {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _onPurchaseUpdate(List<PurchaseDetails> details) async {
    for (final purchase in details) {
      if (purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.restored) {
        final pickupPointId = _selectedPickupPointId;
        if (pickupPointId == null) continue;
        final result = await _billing.verifyPurchase(
          purchase: purchase,
          pickupPointId: pickupPointId,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.success
                ? 'Sponsor paketi etkinleştirildi.'
                : (result.message ?? 'Doğrulama başarısız.')),
          ),
        );
        if (result.success) {
          await _load();
        }
      } else if (purchase.status == PurchaseStatus.error) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${AppLocalizations.of(context).purchaseError} ${purchase.error}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_enabled) {
      return Scaffold(
        appBar: AppBar(title: Text(AppLocalizations.of(context).pickupPointSponsorPackages)),
        body: const Center(
          child: Text(AppLocalizations.of(context).debugOnlyScreen),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context).pickupPointSponsorPackages)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedPickupPointId,
                    decoration: InputDecoration(labelText: AppLocalizations.of(context).pickupPoint),
                    items: _pickupPoints
                        .map(
                          (e) => DropdownMenuItem(
                            value: e['id'] as String,
                            child: Text(e['name'] as String? ?? '-'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => _selectedPickupPointId = value),
                  ),
                  const SizedBox(height: 12),
                  if (_error != null)
                    Text(
                      _error!,
                      style:
                          TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: _products.length,
                      itemBuilder: (_, index) {
                        final product = _products[index];
                        return Card(
                          child: ListTile(
                            title: Text(product.title),
                            subtitle: Text(product.description),
                            trailing: FilledButton(
                              onPressed: _selectedPickupPointId == null
                                  ? null
                                  : () async {
                                      final result = await _billing.buy(product);
                                      if (!mounted) return;
                                      if (!result.success) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              result.message ??
                                                  'Satın alma başlatılamadı.',
                                            ),
                                          ),
                                        );
                                      }
                                    },
                              child: Text(product.price),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
