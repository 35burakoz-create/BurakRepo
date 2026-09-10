import 'package:flutter/material.dart';

import '../../app/app_state.dart';
import '../../core/design_system/components.dart';
import '../../core/design_system/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../settings/settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({required this.state, super.key});

  final AppState state;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AnimatedBuilder(
      animation: widget.state,
      builder: (context, _) {
        return AppScaffold(
          title: l10n.dashboard,
          actions: [
            IconButton(
              onPressed: widget.state.signOut,
              icon: const Icon(Icons.logout),
              tooltip: l10n.signOut,
            ),
          ],
          body: KeyedSubtree(
            key: ValueKey(_tabIndex),
            child: _tabIndex == 0 ? _dashboardBody(context) : SettingsScreen(state: widget.state),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tabIndex,
            onDestinationSelected: (value) => setState(() => _tabIndex = value),
            destinations: [
              NavigationDestination(icon: const Icon(Icons.home_outlined), label: l10n.dashboard),
              NavigationDestination(icon: const Icon(Icons.settings_outlined), label: l10n.settings),
            ],
          ),
        );
      },
    );
  }

  Widget _dashboardBody(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.x2),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.workspace),
              DropdownButtonFormField<WorkspaceType>(
                value: widget.state.workspace,
                items: [
                  if (widget.state.entitlements.canUsePersonal)
                    DropdownMenuItem(value: WorkspaceType.personal, child: Text(l10n.personalWorkspace)),
                  if (widget.state.entitlements.canUseBusiness)
                    DropdownMenuItem(value: WorkspaceType.business, child: Text(l10n.businessWorkspace)),
                ],
                onChanged: (value) {
                  if (value != null) {
                    widget.state.setWorkspace(value);
                  }
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.quickActions),
              Wrap(
                spacing: AppSpacing.x1,
                runSpacing: AppSpacing.x1,
                children: [
                  ActionChip(label: Text(l10n.addIncome), onPressed: () {}),
                  ActionChip(label: Text(l10n.addExpense), onPressed: () {}),
                  ActionChip(label: Text(l10n.viewReports), onPressed: () {}),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.recentTransactions),
              TransactionRow(
                id: 'tx_1',
                title: 'Coffee Shop',
                amount: 135,
                currency: 'TRY',
                isIncome: false,
                onSwipeAction: (action) => _onTransactionAction(context, l10n, action),
              ),
              TransactionRow(
                id: 'tx_2',
                title: 'Export Deposit',
                amount: 1200,
                currency: 'USD',
                isIncome: true,
                onSwipeAction: (action) => _onTransactionAction(context, l10n, action),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        InsightCard(title: l10n.weeklyInsight, subtitle: l10n.followUpDraft),
        const SizedBox(height: AppSpacing.x2),
        const LoadingSkeleton(height: 56),
      ],
    );
  }

  void _onTransactionAction(BuildContext context, AppLocalizations l10n, SwipeAction action) {
    final label = action == SwipeAction.edit ? l10n.edit : l10n.duplicate;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(label)));
  }
}
