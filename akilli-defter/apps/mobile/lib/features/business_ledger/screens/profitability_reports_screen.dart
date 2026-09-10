import 'package:flutter/material.dart';

import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/business_controller.dart';
import '../models/cost_allocation_models.dart';

class ProfitabilityReportsScreen extends StatelessWidget {
  const ProfitabilityReportsScreen({required this.controller, required this.enabled, super.key});

  final BusinessController controller;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (!enabled) {
      return ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.reports),
                Text(l10n.featureLockedUpgrade),
              ],
            ),
          ),
        ],
      );
    }
    final rows = controller.profitability;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.x2),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.reportingCurrency),
              DropdownButtonFormField<String>(
                value: controller.reportingCurrency,
                items: const [
                  DropdownMenuItem(value: 'TRY', child: Text('TRY')),
                  DropdownMenuItem(value: 'USD', child: Text('USD')),
                  DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                ],
                onChanged: (v) {
                  if (v != null) {
                    controller.setReportingCurrency(v);
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        if (rows.isEmpty)
          EmptyState(title: l10n.noReportRows, subtitle: l10n.noReportRowsHint)
        else
          ...rows.map(
            (r) => AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(title: r.customerName),
                  Text('${l10n.revenue}: ${r.revenue.toStringAsFixed(2)} ${r.reportingCurrency}'),
                  Text('${l10n.allocatedCost}: ${r.allocatedCost.toStringAsFixed(2)} ${r.reportingCurrency}'),
                  Text('${l10n.expectedMargin}: ${r.expectedMargin.toStringAsFixed(2)} ${r.reportingCurrency}'),
                  Text('${l10n.realizedMargin}: ${r.realizedMargin.toStringAsFixed(2)} ${r.reportingCurrency}'),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
