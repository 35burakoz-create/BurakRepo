import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_state.dart';
import '../../../core/config/supabase_guard.dart';
import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/business_controller.dart';
import '../data/local_business_cache.dart';
import '../data/supabase_business_repository.dart';
import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';
import 'contact_form_screen.dart';
import 'deal_detail_screen.dart';
import 'profitability_reports_screen.dart';

class BusinessLedgerShell extends StatefulWidget {
  const BusinessLedgerShell({
    required this.appState,
    required this.readOnly,
    required this.canUseFxScenario,
    required this.canUseProfitability,
    required this.canUseCollectionsMessaging,
    super.key,
  });

  final AppState appState;
  final bool readOnly;
  final bool canUseFxScenario;
  final bool canUseProfitability;
  final bool canUseCollectionsMessaging;

  @override
  State<BusinessLedgerShell> createState() => _BusinessLedgerShellState();
}

class _BusinessLedgerShellState extends State<BusinessLedgerShell> {
  late final BusinessController controller;
  int tab = 0;

  @override
  void initState() {
    super.initState();
    controller = BusinessController(
      repository: SupabaseBusinessRepository(
        cache: LocalBusinessCache(),
        workspaceId: 'demo_workspace',
      ),
    )..initialize();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return AppScaffold(
          title: l10n.businessWorkspace,
          body: Column(
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _buildTourCard(l10n),
              ),
              Expanded(child: _body(l10n)),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: tab,
            onDestinationSelected: (value) => setState(() => tab = value),
            destinations: [
              NavigationDestination(icon: const Icon(Icons.home_outlined), label: l10n.home),
              NavigationDestination(icon: const Icon(Icons.people_outline), label: l10n.contacts),
              NavigationDestination(icon: const Icon(Icons.payments_outlined), label: l10n.collections),
              NavigationDestination(icon: const Icon(Icons.table_chart_outlined), label: l10n.reports),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTourCard(AppLocalizations l10n) {
    if (widget.appState.guidedTourCompleted || widget.appState.guidedTourStep != 2) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.x2, AppSpacing.x2, AppSpacing.x2, 0),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: l10n.guidedTour),
            Text(l10n.tourStepThreeTitle, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.x1),
            Text(l10n.tourStepThreeBody),
            const SizedBox(height: AppSpacing.x1),
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    label: l10n.skipTour,
                    onPressed: widget.appState.skipTour,
                  ),
                ),
                const SizedBox(width: AppSpacing.x1),
                Expanded(
                  child: PrimaryButton(
                    label: l10n.tourCompleteStep,
                    onPressed: () async {
                      setState(() => tab = 2);
                      final overdue = controller.collections.where((e) => e.isOverdue || e.status == CollectionStatus.overdue);
                      if (overdue.isNotEmpty && isSupabaseReady()) {
                        await _openMessageDraft(l10n, overdue.first);
                      }
                      await widget.appState.completeTourStep(2);
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(AppLocalizations l10n) {
    if (controller.isLoading) {
      return ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: const [LoadingSkeleton(), SizedBox(height: AppSpacing.x2), LoadingSkeleton()],
      );
    }

    switch (tab) {
      case 0:
        return _home(l10n);
      case 1:
        return _contacts(l10n);
      case 2:
        return _collections(l10n);
      case 3:
        return ProfitabilityReportsScreen(controller: controller, enabled: widget.canUseProfitability);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _home(AppLocalizations l10n) {
    final firstDeal = controller.deals.isNotEmpty ? controller.deals.first : null;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.x2),
      children: [
        _metricCard(l10n.totalReceivables, controller.totalReceivables.toStringAsFixed(0)),
        const SizedBox(height: AppSpacing.x2),
        _metricCard(l10n.overdueCount, '${controller.overdueCount}'),
        const SizedBox(height: AppSpacing.x2),
        _metricCard(l10n.upcomingCollections, '${controller.upcomingCount}'),
        const SizedBox(height: AppSpacing.x2),
        _fxExposureCard(l10n),
        if (firstDeal != null) ...[
          const SizedBox(height: AppSpacing.x2),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.dealDetail),
                Text(firstDeal.customerName),
                const SizedBox(height: AppSpacing.x1),
                SecondaryButton(
                  label: l10n.openDeal,
                  onPressed: widget.readOnly
                      ? () => _showUpgradeHint(l10n)
                      : () {
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(deal: firstDeal, controller: controller)));
                        },
                ),
              ],
            ),
          ),
        ]
      ],
    );
  }

  Widget _metricCard(String title, String value) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: title),
          Text(value, style: Theme.of(context).textTheme.headlineSmall),
        ],
      ),
    );
  }

  Widget _fxExposureCard(AppLocalizations l10n) {
    final exposures = controller.currencyExposure;
    final hasRows = exposures.any((item) => item.receivables != 0 || item.payables != 0);
    final scenario = controller.scenarioResult;
    final cashflowSign = scenario.cashflowImpact >= 0 ? '+' : '';
    final marginSign = scenario.marginImpact >= 0 ? '+' : '';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: l10n.fxExposureSnapshot),
          if (!hasRows)
            EmptyState(title: l10n.fxExposureEmpty, subtitle: l10n.collectionsHint)
          else
            ...exposures.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.x1),
                  child: _exposureRow(l10n, item),
                )),
          const SizedBox(height: AppSpacing.x1),
          Text(
            '${l10n.netExposure}: ${controller.fxExposureSnapshot}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.x2),
          if (!widget.canUseFxScenario)
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(title: l10n.fxScenarioTitle),
                  Text(l10n.featureLockedUpgrade),
                  const SizedBox(height: AppSpacing.x1),
                  PrimaryButton(label: l10n.upgradePlan, onPressed: () => _showUpgradeHint(l10n)),
                ],
              ),
            )
          else ...[
          SectionHeader(
            title: l10n.fxScenarioTitle,
            action: Tooltip(
              message: l10n.fxScenarioTooltip,
              child: const Icon(Icons.info_outline, size: 18),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: controller.scenarioCurrency,
                  items: const [
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                    DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                    DropdownMenuItem(value: 'TRY', child: Text('TRY')),
                  ],
                  decoration: InputDecoration(labelText: l10n.fxScenarioCurrency),
                  onChanged: (value) {
                    if (value != null) {
                      controller.setScenarioCurrency(value);
                    }
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.x1),
              Expanded(
                child: TextFormField(
                  initialValue: controller.scenarioPercent.toStringAsFixed(1),
                  keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
                  onFieldSubmitted: controller.setScenarioPercent,
                  decoration: InputDecoration(
                    labelText: l10n.fxScenarioChangePercent,
                    suffixText: '%',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            '${l10n.fxScenarioCashflowImpact}: $cashflowSign${scenario.cashflowImpact.toStringAsFixed(2)} ${scenario.reportingCurrency}',
          ),
          if (scenario.hasMarginData)
            Text(
              '${l10n.fxScenarioMarginImpact}: $marginSign${scenario.marginImpact.toStringAsFixed(2)} ${scenario.reportingCurrency}',
            )
          else
            Text(l10n.fxScenarioMarginNoData),
          const SizedBox(height: AppSpacing.x1),
          Text(
            l10n.fxScenarioAssumption,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            l10n.fxScenarioDisclaimer,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          ],
        ],
      ),
    );
  }

  Widget _exposureRow(AppLocalizations l10n, CurrencyExposure item) {
    return Row(
      children: [
        SizedBox(width: 42, child: Text(item.currency, style: Theme.of(context).textTheme.labelLarge)),
        Expanded(child: Text('${l10n.receivables}: ${item.receivables.toStringAsFixed(0)}')),
        Expanded(child: Text('${l10n.payables}: ${item.payables.toStringAsFixed(0)}')),
        Expanded(child: Text('${l10n.netExposure}: ${item.net.toStringAsFixed(0)}')),
      ],
    );
  }

  Widget _contacts(AppLocalizations l10n) {
    return Column(
      children: [
        Expanded(
          child: controller.contacts.isEmpty
              ? EmptyState(title: l10n.noContacts, subtitle: l10n.addContactHint)
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.x2),
                  itemCount: controller.contacts.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.x1),
                  itemBuilder: (context, index) {
                    final c = controller.contacts[index];
                    return AppCard(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(c.name),
                        subtitle: Text(c.kind == ContactKind.customer ? l10n.customer : l10n.supplier),
                        trailing: IconButton(
                          icon: const Icon(Icons.edit_outlined),
                          onPressed: widget.readOnly
                              ? () => _showUpgradeHint(l10n)
                              : () {
                                  Navigator.of(context).push(MaterialPageRoute(
                                    builder: (_) => ContactFormScreen(controller: controller, current: c),
                                  ));
                                },
                        ),
                      ),
                    );
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: PrimaryButton(
            label: l10n.addContact,
            onPressed: widget.readOnly
                ? () => _showUpgradeHint(l10n)
                : () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ContactFormScreen(controller: controller)));
                  },
          ),
        ),
      ],
    );
  }

  void _showUpgradeHint(AppLocalizations l10n) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.featureLockedUpgrade)));
  }


  Future<void> _openMessageDraft(AppLocalizations l10n, CollectionModel item) async {
    MessageTone tone = MessageTone.nazik;
    bool loading = false;
    CollectionMessageDraft? draft;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(AppSpacing.x2),
              child: SafeArea(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SectionHeader(title: l10n.collectionMessageDraft),
                      SegmentedButton<MessageTone>(
                        segments: [
                          ButtonSegment(value: MessageTone.nazik, label: Text(l10n.toneNazik)),
                          ButtonSegment(value: MessageTone.net, label: Text(l10n.toneNet)),
                          ButtonSegment(value: MessageTone.sert, label: Text(l10n.toneSert)),
                        ],
                        selected: {tone},
                        onSelectionChanged: (value) => setSheetState(() => tone = value.first),
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      PrimaryButton(
                        label: loading ? l10n.loading : l10n.suggestFollowUpMessage,
                        onPressed: () async {
                          setSheetState(() => loading = true);
                          final result = await controller.generateCollectionMessage(item: item, tone: tone);
                          setSheetState(() {
                            draft = result;
                            loading = false;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.x1),
                      Text(l10n.notFinancialAdvice, style: Theme.of(context).textTheme.bodySmall),
                      if (draft != null) ...[
                        const SizedBox(height: AppSpacing.x2),
                        _draftBlock(l10n.whatsappTr, draft!.whatsappTr),
                        const SizedBox(height: AppSpacing.x1),
                        _draftBlock(l10n.emailTr, draft!.emailTr),
                        const SizedBox(height: AppSpacing.x1),
                        _draftBlock(l10n.whatsappEn, draft!.whatsappEn),
                        const SizedBox(height: AppSpacing.x1),
                        _draftBlock(l10n.emailEn, draft!.emailEn),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _draftBlock(String title, String body) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: title,
            action: IconButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: body));
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(AppLocalizations.of(context).copiedToClipboard)),
                  );
                }
              },
              icon: const Icon(Icons.copy_outlined),
            ),
          ),
          Text(body),
        ],
      ),
    );
  }

  Widget _collections(AppLocalizations l10n) {
    final list = controller.visibleCollections;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: TextField(
            onChanged: controller.setSearch,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search),
              hintText: l10n.searchCollections,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x2),
          child: Wrap(
            spacing: AppSpacing.x1,
            runSpacing: AppSpacing.x1,
            children: [
              FilterChip(
                selected: controller.statusFilter == null,
                label: Text(l10n.all),
                onSelected: (_) => controller.setStatusFilter(null),
              ),
              FilterChip(
                selected: controller.statusFilter == CollectionStatus.overdue,
                label: Text(l10n.overdue),
                onSelected: (_) => controller.setStatusFilter(CollectionStatus.overdue),
              ),
              FilterChip(
                selected: controller.statusFilter == CollectionStatus.pending,
                label: Text(l10n.upcoming),
                onSelected: (_) => controller.setStatusFilter(CollectionStatus.pending),
              ),
              FilterChip(
                selected: controller.statusFilter == CollectionStatus.collected,
                label: Text(l10n.collected),
                onSelected: (_) => controller.setStatusFilter(CollectionStatus.collected),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        Expanded(
          child: list.isEmpty
              ? EmptyState(title: l10n.noCollections, subtitle: l10n.collectionsHint)
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.x2),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.x1),
                  itemBuilder: (context, index) {
                    final item = list[index];
                    final status = item.isOverdue ? CollectionStatus.overdue : item.status;
                    return AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${item.invoiceNumber} • ${item.customerName}'),
                          const SizedBox(height: AppSpacing.x1),
                          Text('${item.amount.toStringAsFixed(0)} ${item.currency}'),
                          const SizedBox(height: AppSpacing.x1),
                          SegmentedButton<CollectionStatus>(
                            segments: [
                              ButtonSegment(value: CollectionStatus.pending, label: Text(l10n.upcoming)),
                              ButtonSegment(value: CollectionStatus.overdue, label: Text(l10n.overdue)),
                              ButtonSegment(value: CollectionStatus.collected, label: Text(l10n.collected)),
                            ],
                            selected: {status},
                            onSelectionChanged: widget.readOnly
                                ? (_) => _showUpgradeHint(l10n)
                                : (value) {
                                    controller.setCollectionStatus(item.id, value.first);
                                  },
                          ),
                          if (status == CollectionStatus.overdue && widget.canUseCollectionsMessaging && isSupabaseReady()) ...[
                            const SizedBox(height: AppSpacing.x1),
                            SecondaryButton(
                              label: l10n.suggestFollowUpMessage,
                              onPressed: () => _openMessageDraft(l10n, item),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
