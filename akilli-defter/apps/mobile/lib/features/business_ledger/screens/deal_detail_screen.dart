import 'package:flutter/material.dart';

import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/business_controller.dart';
import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';

class DealDetailScreen extends StatefulWidget {
  const DealDetailScreen({required this.deal, required this.controller, super.key});

  final DealModel deal;
  final BusinessController controller;

  @override
  State<DealDetailScreen> createState() => _DealDetailScreenState();
}

class _DealDetailScreenState extends State<DealDetailScreen> {
  CostAllocationType _type = CostAllocationType.freight;
  String _currency = 'USD';
  final _amount = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final allocations = widget.controller.allocations.where((a) => a.dealId == widget.deal.id).toList();
    return AppScaffold(
      title: l10n.dealDetail,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.customer),
                Text(widget.deal.customerName),
                const SizedBox(height: AppSpacing.x2),
                SectionHeader(title: l10n.currency),
                Text(widget.deal.currency),
                const SizedBox(height: AppSpacing.x2),
                SectionHeader(title: l10n.incoterm),
                Text(widget.deal.incoterm),
                const SizedBox(height: AppSpacing.x2),
                SectionHeader(title: l10n.expectedMargin),
                Text('%${widget.deal.expectedMargin.toStringAsFixed(1)}'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.costAllocations),
                DropdownButtonFormField<CostAllocationType>(
                  value: _type,
                  items: CostAllocationType.values
                      .map((t) => DropdownMenuItem(value: t, child: Text(t.name)))
                      .toList(),
                  onChanged: (v) => setState(() => _type = v ?? _type),
                ),
                const SizedBox(height: AppSpacing.x1),
                DropdownButtonFormField<String>(
                  value: _currency,
                  items: const [
                    DropdownMenuItem(value: 'TRY', child: Text('TRY')),
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                    DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                  ],
                  onChanged: (v) => setState(() => _currency = v ?? _currency),
                ),
                const SizedBox(height: AppSpacing.x1),
                TextField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l10n.amount),
                ),
                const SizedBox(height: AppSpacing.x1),
                PrimaryButton(
                  label: l10n.addAllocation,
                  onPressed: () async {
                    await widget.controller.saveAllocation(
                      dealId: widget.deal.id,
                      type: _type,
                      amount: double.tryParse(_amount.text) ?? 0,
                      currency: _currency,
                      date: DateTime.now(),
                    );
                    _amount.clear();
                    if (mounted) setState(() {});
                  },
                ),
                const SizedBox(height: AppSpacing.x2),
                if (allocations.isEmpty)
                  Text(l10n.noAllocations)
                else
                  ...allocations.map(
                    (a) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${a.type.name} • ${a.amount.toStringAsFixed(2)} ${a.currency}'),
                      subtitle: Text('${a.date.year}-${a.date.month}-${a.date.day}'),
                      trailing: IconButton(
                        onPressed: () => widget.controller.deleteAllocation(a.id),
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ),
                  )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
