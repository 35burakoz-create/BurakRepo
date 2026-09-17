import 'package:flutter/material.dart';

import '../../../app/app_state.dart';
import '../../../core/config/supabase_guard.dart';
import '../../../core/monetization/entitlement_service.dart';
import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/personal_wallet_controller.dart';
import '../data/supabase_wallet_repository.dart';
import '../data/local_wallet_cache.dart';
import '../models/wallet_models.dart';
import '../../settings/settings_screen.dart';
import 'transaction_form_screen.dart';

class PersonalWalletShell extends StatefulWidget {
  const PersonalWalletShell({required this.appState, super.key});

  final AppState appState;

  @override
  State<PersonalWalletShell> createState() => _PersonalWalletShellState();
}

class _PersonalWalletShellState extends State<PersonalWalletShell> {
  late final PersonalWalletController controller;
  int tab = 0;
  bool online = false;

  @override
  void initState() {
    super.initState();
    controller = PersonalWalletController(
      repository: SupabaseWalletRepository(
        cache: LocalWalletCache(),
        workspaceId: 'demo_workspace',
        isOnline: () => online,
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
    final supabaseReady = isSupabaseReady();
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return AppScaffold(
          title: l10n.personalWorkspace,
          actions: [
            if (supabaseReady)
              IconButton(
              tooltip: online ? l10n.online : l10n.offline,
              onPressed: () async {
                if (!widget.appState.entitlements.canUseCloudSync) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.cloudSyncLocked)));
                  return;
                }
                setState(() => online = !online);
                await controller.sync();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(online ? l10n.online : l10n.offline)));
                }
              },
              icon: Icon(online ? Icons.cloud_done_outlined : Icons.cloud_off_outlined),
            ),
          ],
          body: Column(
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _buildTourCard(l10n),
              ),
              Expanded(child: _screenByTab(l10n)),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: tab,
            onDestinationSelected: (value) => setState(() => tab = value),
            destinations: [
              NavigationDestination(icon: const Icon(Icons.home_outlined), label: l10n.home),
              NavigationDestination(icon: const Icon(Icons.receipt_long_outlined), label: l10n.transactions),
              NavigationDestination(icon: const Icon(Icons.pie_chart_outline), label: l10n.budgets),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTourCard(AppLocalizations l10n) {
    if (widget.appState.guidedTourCompleted) {
      return const SizedBox.shrink();
    }

    final step = widget.appState.guidedTourStep;
    if (step > 2) {
      return const SizedBox.shrink();
    }

    final title = step == 0
        ? l10n.tourStepOneTitle
        : step == 1
            ? l10n.tourStepTwoTitle
            : l10n.tourStepThreeTitle;
    final subtitle = step == 0
        ? l10n.tourStepOneBody
        : step == 1
            ? l10n.tourStepTwoBody
            : l10n.tourStepThreeBody;

    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.x2, AppSpacing.x2, AppSpacing.x2, 0),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: l10n.guidedTour),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.x1),
            Text(subtitle),
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
                      if (step == 0) {
                        setState(() => tab = 1);
                        await Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => TransactionFormScreen(controller: controller, appState: widget.appState)),
                        );
                        await widget.appState.completeTourStep(step);
                        return;
                      }

                      if (step == 1) {
                        setState(() => tab = 0);
                        await widget.appState.completeTourStep(step);
                        return;
                      }

                      await widget.appState.setWorkspace(WorkspaceType.business);
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

  Widget _screenByTab(AppLocalizations l10n) {
    if (controller.isLoading) {
      return ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: const [LoadingSkeleton(), SizedBox(height: AppSpacing.x2), LoadingSkeleton(), SizedBox(height: AppSpacing.x2), LoadingSkeleton()],
      );
    }

    switch (tab) {
      case 0:
        return _buildHome(l10n);
      case 1:
        return _buildTransactions(l10n);
      case 2:
        return _buildBudgets(l10n);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildHome(AppLocalizations l10n) {
    final supabaseReady = isSupabaseReady();
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.x2),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.totalBalance),
              Text(controller.totalBalance.toStringAsFixed(2), style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.thisWeekSpending),
              AmountPill(amount: controller.thisWeekSpending, currency: 'TRY', isIncome: false),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.upcomingBills),
              Text('${controller.upcomingBillsCount} ${l10n.items}'),
            ],
          ),
        ),
        if (supabaseReady) ...[
          const SizedBox(height: AppSpacing.x2),
          InsightCard(
            title: l10n.aiInsightOfWeek,
            subtitle: controller.weeklyAiSummary == null
                ? l10n.aiFallbackSummary
                : (widget.appState.locale.languageCode == 'tr'
                      ? controller.weeklyAiSummary!.summaryTr
                      : controller.weeklyAiSummary!.summaryEn),
          ),
          const SizedBox(height: AppSpacing.x1),
          PrimaryButton(
            label: controller.weeklyAiLoading ? l10n.loading : l10n.aiSuggestCategory,
            onPressed: controller.weeklyAiLoading
                ? () {}
                : () async {
                    final summary = await controller.requestWeeklyAiSummary();
                    if (!context.mounted) return;
                    if (summary?.errorCode == 'quota_exceeded') {
                      await _showAiQuotaSheet(context, l10n);
                    }
                  },
          ),
        ],
      ],
    );
  }


  Future<void> _showAiQuotaSheet(BuildContext context, AppLocalizations l10n) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(AppSpacing.x2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.aiQuotaModalTitle, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.x1),
            Text(l10n.aiQuotaModalBody),
            const SizedBox(height: AppSpacing.x2),
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    label: l10n.ok,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                const SizedBox(width: AppSpacing.x1),
                Expanded(
                  child: PrimaryButton(
                    label: l10n.reviewProPlan,
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.of(this.context).push(
                        MaterialPageRoute(builder: (_) => PlanBillingScreen(state: widget.appState)),
                      );
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

  Widget _buildTransactions(AppLocalizations l10n) {
    final txs = controller.visibleTransactions;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: TextField(
            onChanged: controller.setQuery,
            decoration: InputDecoration(
              hintText: l10n.searchTransactions,
              prefixIcon: const Icon(Icons.search),
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
                selected: controller.filterType == null,
                label: Text(l10n.all),
                onSelected: (_) => controller.setFilter(null),
              ),
              FilterChip(
                selected: controller.filterType == TransactionType.income,
                label: Text(l10n.income),
                onSelected: (_) => controller.setFilter(TransactionType.income),
              ),
              FilterChip(
                selected: controller.filterType == TransactionType.expense,
                label: Text(l10n.expense),
                onSelected: (_) => controller.setFilter(TransactionType.expense),
              ),
              FilterChip(
                selected: controller.filterType == TransactionType.transfer,
                label: Text(l10n.transfer),
                onSelected: (_) => controller.setFilter(TransactionType.transfer),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        Expanded(
          child: txs.isEmpty
              ? EmptyState(title: l10n.emptyTransactions, subtitle: l10n.emptyTransactionsSubtitle)
              : ListView.separated(
                  itemCount: txs.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final tx = txs[index];
                    return TransactionRow(
                      id: tx.id,
                      title: tx.category,
                      amount: tx.amount,
                      currency: tx.currency.name == 'tryCurrency' ? 'TRY' : tx.currency.name.toUpperCase(),
                      isIncome: tx.type == TransactionType.income,
                      onSwipeAction: (action) async {
                        if (action == SwipeAction.edit) {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => TransactionFormScreen(controller: controller, appState: widget.appState, current: tx),
                            ),
                          );
                        } else {
                          await controller.saveTransaction(
                            accountId: tx.accountId,
                            type: tx.type,
                            category: tx.category,
                            currency: tx.currency,
                            amount: tx.amount,
                            date: DateTime.now(),
                            note: tx.note,
                          );
                        }
                      },
                    );
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: PrimaryButton(
            label: l10n.addTransaction,
            onPressed: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TransactionFormScreen(controller: controller, appState: widget.appState)));
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBudgets(AppLocalizations l10n) {
    final isFreePlan = widget.appState.entitlements.planType == PlanType.free;
    final visibleBudgets = isFreePlan ? controller.budgets.take(1).toList() : controller.budgets;
    return visibleBudgets.isEmpty
        ? Padding(
            padding: const EdgeInsets.all(AppSpacing.x2),
            child: EmptyState(title: l10n.noBudgets, subtitle: l10n.addBudgetHint),
          )
        : ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.x2),
            itemBuilder: (context, index) {
              final budget = visibleBudgets[index];
              final progress = (budget.spent / budget.limit).clamp(0, 1).toDouble();
              return AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SectionHeader(title: budget.category),
                    Text('${budget.spent.toStringAsFixed(0)} / ${budget.limit.toStringAsFixed(0)} TRY'),
                    const SizedBox(height: AppSpacing.x1),
                    LinearProgressIndicator(value: progress),
                    if (budget.isOverLimit)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpacing.x1),
                        child: Text(l10n.budgetAlert, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ),
                  ],
                ),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.x2),
            itemCount: visibleBudgets.length,
          );
  }
}
