import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app/app_state.dart';
import '../../core/ai/ai_gateway.dart';
import '../../core/config/supabase_guard.dart';
import '../../core/monetization/entitlement_service.dart';
import '../../core/design_system/components.dart';
import '../../core/design_system/tokens.dart';
import '../../l10n/app_localizations.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({required this.state, super.key});

  final AppState state;


  Widget _buildAiQuotaInfo(AppLocalizations l10n) {
    final quotas = state.entitlements.aiQuotas;
    final firstQuota = quotas.values.isNotEmpty ? quotas.values.first : null;
    final used = firstQuota == null ? 0 : (firstQuota.limit - firstQuota.remaining).clamp(0, firstQuota.limit);
    final limit = firstQuota?.limit ?? 2;

    return AppCard(
      child: Row(
        children: [
          Expanded(child: Text('${l10n.dailyAiAllowance}: $used / $limit')),
          Tooltip(
            message: l10n.aiFreeLimitTooltip,
            child: const Icon(Icons.info_outline, size: 20),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final supabaseReady = isSupabaseReady();
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.x2),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(title: l10n.language),
              SegmentedButton<Locale>(
                segments: const [
                  ButtonSegment(value: Locale('tr'), label: Text('TR')),
                  ButtonSegment(value: Locale('en'), label: Text('EN')),
                ],
                selected: {state.locale},
                onSelectionChanged: (selection) => state.setLocale(selection.first),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: SwitchListTile(
            value: state.themeMode == ThemeMode.dark,
            onChanged: state.setDarkMode,
            title: Text(l10n.darkMode),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        AppCard(
          child: SwitchListTile(
            value: state.aiEnabled,
            onChanged: supabaseReady ? state.setAiEnabled : null,
            title: Text(l10n.enableAiFeatures),
            subtitle: Text(supabaseReady ? l10n.aiConsentDataSummary : AiGatewayResponse.disabledMessage),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        _buildAiQuotaInfo(l10n),
        const SizedBox(height: AppSpacing.x2),
        _item(context, l10n.privacySecurity, () => _openDoc(context, l10n.privacySecurity, l10n.privacySecurityBody)),
        _item(context, l10n.planAndBilling, () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PlanBillingScreen(state: state)))),
        _item(context, l10n.couponPromoCode, () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PromoCodeScreen(state: state)))),
        _item(context, l10n.termsOfUse, () => _openDoc(context, l10n.termsOfUse, l10n.termsBody)),
        _item(context, l10n.privacyPolicy, () => _openDoc(context, l10n.privacyPolicy, l10n.privacyPolicyBody)),
        _item(context, l10n.aiDisclaimerTitle, () => _openDoc(context, l10n.aiDisclaimerTitle, l10n.aiDisclaimerBody)),
        _item(context, l10n.account, () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AccountScreen(state: state)))),
        _item(context, l10n.dataManagement, () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DataManagementScreen(state: state)))),
        if (kDebugMode)
          _item(context, l10n.sendTestCrash, () async {
            await FirebaseCrashlytics.instance.recordError(
              StateError('Manual debug crash test from Settings'),
              StackTrace.current,
              reason: 'debug_test_action',
              fatal: false,
            );
            throw StateError('Crashlytics debug test crash');
          }),
      ],
    );
  }

  Widget _item(BuildContext context, String label, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x1),
      child: AppCard(
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(label),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      ),
    );
  }

  Future<void> _openDoc(BuildContext context, String title, String body) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => _DocScreen(title: title, body: body)));
  }
}

class PlanBillingScreen extends StatefulWidget {
  const PlanBillingScreen({required this.state, super.key});

  final AppState state;

  @override
  State<PlanBillingScreen> createState() => _PlanBillingScreenState();
}

class _PlanBillingScreenState extends State<PlanBillingScreen> {
  bool busy = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final plan = widget.state.entitlements.planType;
    final quotas = widget.state.entitlements.aiQuotas;

    Widget quotaRow(String key, String label) {
      final q = quotas[key];
      if (q == null) return const SizedBox.shrink();
      return Text('$label: ${q.remaining}/${q.limit}');
    }

    String localizedPlanName(PlanType planType) {
      switch (planType) {
        case PlanType.free:
          return l10n.planNameFree;
        case PlanType.personalPremium:
          return l10n.planNamePersonalPremium;
        case PlanType.business:
          return l10n.planNameBusiness;
      }
    }

    return AppScaffold(
      title: l10n.planAndBilling,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.currentPlan),
                Text(localizedPlanName(plan)),
                const SizedBox(height: AppSpacing.x1),
                quotaRow('categorize_transaction', l10n.aiQuotaCategorize),
                quotaRow('weekly_summary', l10n.aiQuotaWeeklySummary),
                quotaRow('nl_query', l10n.aiQuotaNlQuery),
                quotaRow('collection_message', l10n.aiQuotaCollectionMessage),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.planComparison),
                Text(l10n.planComparisonBody),
                const SizedBox(height: AppSpacing.x1),
                Text(l10n.planLineFree),
                Text(l10n.planLinePersonalPremium),
                Text(l10n.planLineBusiness),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          PrimaryButton(
            label: busy ? l10n.loading : l10n.upgradeToPersonalPremium,
            onPressed: () async {
              setState(() => busy = true);
              await widget.state.purchasePlan(PlanType.personalPremium);
              if (mounted) setState(() => busy = false);
            },
          ),
          const SizedBox(height: AppSpacing.x1),
          PrimaryButton(
            label: busy ? l10n.loading : l10n.upgradeToBusinessPlan,
            onPressed: () async {
              setState(() => busy = true);
              await widget.state.purchasePlan(PlanType.business);
              if (mounted) setState(() => busy = false);
            },
          ),
          const SizedBox(height: AppSpacing.x1),
          SecondaryButton(
            label: busy ? l10n.loading : l10n.restorePurchases,
            onPressed: () async {
              setState(() => busy = true);
              await widget.state.restorePurchases();
              if (mounted) setState(() => busy = false);
            },
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(child: Text('${l10n.notFinancialAdvice}\n${l10n.aiDisclaimerBody}')),
        ],
      ),
    );
  }
}


class PromoCodeScreen extends StatefulWidget {
  const PromoCodeScreen({required this.state, super.key});

  final AppState state;

  @override
  State<PromoCodeScreen> createState() => _PromoCodeScreenState();
}

class _PromoCodeScreenState extends State<PromoCodeScreen> {
  bool isBusy = false;
  bool codeRedeemedInStore = false;

  Future<void> _restoreAndRefresh(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    setState(() => isBusy = true);
    try {
      await widget.state.restorePurchases();
      await widget.state.refreshEntitlements();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.couponRestoreSuccess)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.couponRestoreFailed)));
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  Future<void> _refreshStatus(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    setState(() => isBusy = true);
    try {
      await widget.state.refreshEntitlements();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.couponRefreshSuccess)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.couponRefreshFailed)));
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final instructionText = '${l10n.couponStep1}\n${l10n.couponStep2}';

    return AppScaffold(
      title: l10n.couponPromoCode,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.couponPromoCode),
                Text(l10n.couponIntro),
                const SizedBox(height: AppSpacing.x1),
                Text('1) ${l10n.couponStep1}'),
                const SizedBox(height: AppSpacing.x1),
                Text('2) ${l10n.couponStep2}'),
                const SizedBox(height: AppSpacing.x1),
                SecondaryButton(
                  label: l10n.couponCopyInstructions,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: instructionText));
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.couponInstructionsCopied)));
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
                CheckboxListTile(
                  value: codeRedeemedInStore,
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.couponCodeEnteredLabel),
                  onChanged: (value) => setState(() => codeRedeemedInStore = value ?? false),
                ),
                Text(l10n.couponNoDirectValidation),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          PrimaryButton(
            label: isBusy ? l10n.loading : l10n.restorePurchases,
            onPressed: isBusy ? () {} : () => _restoreAndRefresh(context),
          ),
          const SizedBox(height: AppSpacing.x1),
          SecondaryButton(
            label: isBusy ? l10n.loading : l10n.couponRefreshStatus,
            onPressed: isBusy ? () {} : () => _refreshStatus(context),
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(
            child: Text('${l10n.notFinancialAdvice}\n${l10n.aiDisclaimerBody}'),
          ),
        ],
      ),
    );
  }
}

class _DocScreen extends StatelessWidget {
  const _DocScreen({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: title,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(child: Text(body)),
        ],
      ),
    );
  }
}

class AccountScreen extends StatefulWidget {
  const AccountScreen({required this.state, super.key});

  final AppState state;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool loading = false;

  Future<void> _deleteAccount(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(l10n.confirmDeletion),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(l10n.typeDeletePrompt),
              const SizedBox(height: 12),
              TextField(controller: controller),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l10n.cancel)),
            TextButton(onPressed: () => Navigator.pop(context, controller.text.trim() == 'DELETE'), child: Text(l10n.confirm)),
          ],
        );
      },
    );
    if (confirmed != true) return;
    setState(() => loading = true);
    try {
      if (isSupabaseReady()) {
        await Supabase.instance.client.functions.invoke('account_data_rights', body: {'action': 'delete'});
      }
      await widget.state.signOut();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.operationFailed)));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppScaffold(
      title: l10n.account,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.deleteAccountAllData),
                Text(l10n.deleteAccountWarning),
                const SizedBox(height: AppSpacing.x1),
                Text(l10n.accountDeletionWebInfo),
                const SizedBox(height: AppSpacing.x1),
                SelectableText(l10n.accountDeletionUrl),
                const SizedBox(height: AppSpacing.x1),
                SecondaryButton(
                  label: l10n.copyDeletionLink,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: l10n.accountDeletionUrl));
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.deletionLinkCopied)));
                  },
                ),
                const SizedBox(height: AppSpacing.x1),
                PrimaryButton(
                  label: loading ? l10n.loading : l10n.deleteAccountAllData,
                  onPressed: loading ? () {} : () => _deleteAccount(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class DataManagementScreen extends StatefulWidget {
  const DataManagementScreen({required this.state, super.key});

  final AppState state;

  @override
  State<DataManagementScreen> createState() => _DataManagementScreenState();
}

class _DataManagementScreenState extends State<DataManagementScreen> {
  bool loading = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppScaffold(
      title: l10n.dataManagement,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.attachmentStorage),
                SegmentedButton<AttachmentStorageMode>(
                  segments: [
                    ButtonSegment(value: AttachmentStorageMode.cloudOnly, label: Text(l10n.cloudOnlyRecommended)),
                    ButtonSegment(value: AttachmentStorageMode.deviceOnly, label: Text(l10n.deviceOnlyMode)),
                  ],
                  selected: {widget.state.attachmentStorageMode},
                  onSelectionChanged: (v) => widget.state.setAttachmentStorageMode(v.first),
                ),
                const SizedBox(height: AppSpacing.x1),
                Text('${l10n.imageCompressionInfo}\n${l10n.cacheLimitInfo}'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          PrimaryButton(
            label: loading ? l10n.loading : l10n.exportMyData,
            onPressed: loading
                ? () {}
                : () async {
                    if (!widget.state.entitlements.canExport) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.featureLockedUpgrade)));
                      return;
                    }
                    setState(() => loading = true);
                    try {
                      if (isSupabaseReady()) {
                        final res = await Supabase.instance.client.functions.invoke('account_data_rights', body: {'action': 'export'});
                        final pretty = const JsonEncoder.withIndent('  ').convert(res.data);
                        if (!mounted) return;
                        await Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => _DocScreen(title: l10n.exportMyData, body: pretty),
                        ));
                      }
                    } catch (_) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.operationFailed)));
                    } finally {
                      if (mounted) setState(() => loading = false);
                    }
                  },
          ),
          const SizedBox(height: AppSpacing.x1),
          SecondaryButton(
            label: l10n.clearLocalCache,
            onPressed: () async {
              await widget.state.clearLocalCache();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.cacheCleared)));
            },
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.deviceLock),
                Text(widget.state.entitlements.canUseDeviceLock ? l10n.enabled : l10n.featureLockedUpgrade),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x3),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: l10n.deleteAccountAllData),
                Text(l10n.deleteAccountWarning),
                const SizedBox(height: AppSpacing.x1),
                SecondaryButton(
                  label: l10n.deleteAccountAllData,
                  onPressed: () async {
                    final controller = TextEditingController();
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) {
                        return AlertDialog(
                          title: Text(l10n.confirmDeletion),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(l10n.typeDeletePrompt),
                              const SizedBox(height: 12),
                              TextField(controller: controller),
                            ],
                          ),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l10n.cancel)),
                            TextButton(onPressed: () => Navigator.pop(context, controller.text.trim() == 'DELETE'), child: Text(l10n.confirm)),
                          ],
                        );
                      },
                    );
                    if (confirmed != true) return;
                    setState(() => loading = true);
                    try {
                      if (isSupabaseReady()) {
                        await Supabase.instance.client.functions.invoke('account_data_rights', body: {'action': 'delete'});
                      }
                      await widget.state.signOut();
                    } catch (_) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.operationFailed)));
                    } finally {
                      if (mounted) setState(() => loading = false);
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
