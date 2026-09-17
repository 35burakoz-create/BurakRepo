import 'package:flutter/material.dart';

import '../../../app/app_state.dart';
import '../../../core/config/supabase_guard.dart';
import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/personal_wallet_controller.dart';
import '../models/wallet_models.dart';
import '../data/ai_service.dart';
import '../../settings/settings_screen.dart';

class TransactionFormScreen extends StatefulWidget {
  const TransactionFormScreen({required this.controller, required this.appState, super.key, this.current});

  final PersonalWalletController controller;
  final AppState appState;
  final TransactionModel? current;

  @override
  State<TransactionFormScreen> createState() => _TransactionFormScreenState();
}

class _TransactionFormScreenState extends State<TransactionFormScreen> {
  late TransactionType _type;
  late String _accountId;
  late CurrencyCode _currency;
  late DateTime _date;
  late final TextEditingController _category;
  late final TextEditingController _amount;
  late final TextEditingController _note;
  CategorySuggestion? _suggestion;
  bool _loadingSuggestion = false;

  @override
  void initState() {
    super.initState();
    final current = widget.current;
    _type = current?.type ?? TransactionType.expense;
    _accountId = current?.accountId ?? widget.controller.accounts.first.id;
    _currency = current?.currency ?? CurrencyCode.tryCurrency;
    _date = current?.date ?? DateTime.now();
    _category = TextEditingController(text: current?.category ?? '');
    _amount = TextEditingController(text: current?.amount.toString() ?? '');
    _note = TextEditingController(text: current?.note ?? '');
  }

  @override
  void dispose() {
    _category.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }


  Future<void> _showAiQuotaSheet(AppLocalizations l10n) async {
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

  Future<void> _fetchSuggestion(AppLocalizations l10n) async {
    setState(() => _loadingSuggestion = true);
    final suggestion = await widget.controller.suggestCategory(
      text: '${_category.text} ${_note.text}',
      merchant: _category.text,
      amount: double.tryParse(_amount.text) ?? 0,
      currency: _currency.name == 'tryCurrency' ? 'TRY' : _currency.name.toUpperCase(),
    );
    if (!mounted) return;
    setState(() {
      _suggestion = suggestion;
      _loadingSuggestion = false;
    });
    if (suggestion?.errorCode == 'quota_exceeded') {
      await _showAiQuotaSheet(l10n);
      return;
    }
    if (suggestion == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.aiFallbackSuggestion)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final supabaseReady = isSupabaseReady();
    return AppScaffold(
      title: widget.current == null ? l10n.addTransaction : l10n.editTransaction,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              children: [
                DropdownButtonFormField<TransactionType>(
                  value: _type,
                  items: [
                    DropdownMenuItem(value: TransactionType.income, child: Text(l10n.income)),
                    DropdownMenuItem(value: TransactionType.expense, child: Text(l10n.expense)),
                    DropdownMenuItem(value: TransactionType.transfer, child: Text(l10n.transfer)),
                  ],
                  onChanged: (value) => setState(() => _type = value ?? _type),
                  decoration: InputDecoration(labelText: l10n.type),
                ),
                const SizedBox(height: AppSpacing.x2),
                DropdownButtonFormField<String>(
                  value: _accountId,
                  items: widget.controller.accounts
                      .map((a) => DropdownMenuItem(value: a.id, child: Text('${a.name} (${a.currency.name == 'tryCurrency' ? 'TRY' : a.currency.name.toUpperCase()})')))
                      .toList(),
                  onChanged: (value) => setState(() => _accountId = value ?? _accountId),
                  decoration: InputDecoration(labelText: l10n.account),
                ),
                const SizedBox(height: AppSpacing.x2),
                DropdownButtonFormField<CurrencyCode>(
                  value: _currency,
                  items: CurrencyCode.values
                      .map((c) => DropdownMenuItem(value: c, child: Text(c.name == 'tryCurrency' ? 'TRY' : c.name.toUpperCase())))
                      .toList(),
                  onChanged: (value) => setState(() => _currency = value ?? _currency),
                  decoration: InputDecoration(labelText: l10n.currency),
                ),
                const SizedBox(height: AppSpacing.x2),
                TextField(controller: _category, decoration: InputDecoration(labelText: l10n.category)),
                const SizedBox(height: AppSpacing.x2),
                TextField(controller: _amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: l10n.amount)),
                const SizedBox(height: AppSpacing.x2),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.date),
                  subtitle: Text('${_date.year}-${_date.month}-${_date.day}'),
                  trailing: IconButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _date,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        setState(() => _date = picked);
                      }
                    },
                    icon: const Icon(Icons.calendar_today_outlined),
                  ),
                ),
                TextField(controller: _note, decoration: InputDecoration(labelText: l10n.note)),
                const SizedBox(height: AppSpacing.x2),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.attach_file_outlined),
                  title: Text(l10n.attachments),
                  subtitle: Text('${l10n.attachmentsPlaceholder}\n${l10n.imageCompressionInfo}'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          AppCard(child: Text(l10n.notFinancialAdvice)),
          if (supabaseReady) ...[
            const SizedBox(height: AppSpacing.x1),
            PrimaryButton(
              label: _loadingSuggestion ? l10n.loading : l10n.aiSuggestCategory,
              onPressed: _loadingSuggestion ? () {} : () => _fetchSuggestion(l10n),
            ),
          ],
          if (_suggestion != null) ...[
            const SizedBox(height: AppSpacing.x1),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(title: l10n.aiCategorySuggestion),
                  Text('${l10n.confidence}: ${(_suggestion!.confidence * 100).toStringAsFixed(0)}%'),
                  const SizedBox(height: AppSpacing.x1),
                  Text(_suggestion!.explanation),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.x2),
          PrimaryButton(
            label: l10n.save,
            onPressed: () async {
              await widget.controller.saveTransaction(
                id: widget.current?.id,
                accountId: _accountId,
                type: _type,
                category: _category.text,
                currency: _currency,
                amount: double.tryParse(_amount.text) ?? 0,
                date: _date,
                note: _note.text,
              );
              if (mounted) Navigator.of(context).pop();
            },
          ),
          if (widget.current != null) ...[
            const SizedBox(height: AppSpacing.x1),
            SecondaryButton(
              label: l10n.delete,
              onPressed: () async {
                await widget.controller.deleteTransaction(widget.current!.id);
                if (mounted) Navigator.of(context).pop();
              },
            ),
          ],
        ],
      ),
    );
  }
}
