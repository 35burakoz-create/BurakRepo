import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/supabase_guard.dart';
import 'package:uuid/uuid.dart';

import '../models/wallet_models.dart';
import 'local_wallet_cache.dart';
import 'wallet_repository.dart';
import 'ai_service.dart';

typedef IsOnline = bool Function();

class SupabaseWalletRepository implements WalletRepository {
  SupabaseWalletRepository({
    required this.cache,
    required this.workspaceId,
    required this.isOnline,
  });

  final LocalWalletCache cache;
  final String workspaceId;
  final IsOnline isOnline;
  final _uuid = const Uuid();
  late final AiService _aiService = AiService();

  bool get _canRemote => isOnline() && isSupabaseReady();

  SupabaseClient get _client => Supabase.instance.client;

  @override
  Future<List<AccountModel>> fetchAccounts() async {
    final local = await cache.loadAccounts();
    if (!_canRemote) return local;

    final result = await _client
        .from('accounts')
        .select('id,name,currency,balance')
        .eq('workspace_id', workspaceId)
        .order('name');

    final accounts = (result as List)
        .map((row) => AccountModel.fromMap({
              'id': row['id'],
              'name': row['name'],
              'currency': (row['currency'] as String).toLowerCase() == 'try' ? 'tryCurrency' : (row['currency'] as String).toLowerCase(),
              'balance': row['balance'],
            }))
        .toList();

    await cache.saveAccounts(accounts);
    return accounts;
  }

  @override
  Future<List<TransactionModel>> fetchTransactions() async {
    final local = await cache.loadTransactions();
    if (!_canRemote) return local;

    final result = await _client
        .from('transactions')
        .select('id,account_id,type,amount,currency,occurred_at,note,merchant')
        .eq('workspace_id', workspaceId)
        .order('occurred_at', ascending: false)
        .limit(100);

    final data = (result as List)
        .map(
          (row) => TransactionModel.fromMap({
            'id': row['id'],
            'account_id': row['account_id'],
            'type': row['type'],
            'category': row['merchant'] ?? 'Genel',
            'currency': (row['currency'] as String).toLowerCase() == 'try' ? 'tryCurrency' : (row['currency'] as String).toLowerCase(),
            'amount': row['amount'],
            'date': row['occurred_at'],
            'note': row['note'] ?? '',
          }),
        )
        .toList();

    await cache.saveTransactions(data);
    return data;
  }

  @override
  Future<List<BudgetModel>> fetchBudgets() async {
    final local = await cache.loadBudgets();
    if (!_canRemote) return local;

    final result = await _client
        .from('budgets')
        .select('id,limit_amount,categories(name),workspace_id')
        .eq('workspace_id', workspaceId);

    final budgets = (result as List)
        .map(
          (row) => BudgetModel(
            id: row['id'] as String,
            category: (row['categories']?['name'] ?? 'Genel') as String,
            limit: (row['limit_amount'] as num).toDouble(),
            spent: 0,
          ),
        )
        .toList();

    await cache.saveBudgets(budgets);
    return budgets;
  }

  @override
  Future<void> upsertTransaction(TransactionModel transaction) async {
    final local = await cache.loadTransactions();
    final index = local.indexWhere((e) => e.id == transaction.id);
    final updated = [...local];
    if (index >= 0) {
      updated[index] = transaction;
    } else {
      updated.insert(0, transaction);
    }
    await cache.saveTransactions(updated);

    if (!_canRemote) {
      await _enqueue({'action': 'upsert', 'payload': transaction.toMap()});
      return;
    }

    await _remoteUpsert(transaction);
  }

  @override
  Future<void> deleteTransaction(String id) async {
    final local = await cache.loadTransactions();
    await cache.saveTransactions(local.where((e) => e.id != id).toList());

    if (!_canRemote) {
      await _enqueue({'action': 'delete', 'payload': {'id': id}});
      return;
    }
    await _client.from('transactions').delete().eq('id', id);
  }

  @override
  Future<void> syncPendingQueue() async {
    if (!_canRemote) return;
    final queue = await cache.loadQueue();
    if (queue.isEmpty) return;

    for (final item in queue) {
      if (item['action'] == 'upsert') {
        await _remoteUpsert(TransactionModel.fromMap(item['payload'] as Map<String, dynamic>));
      } else if (item['action'] == 'delete') {
        await _client.from('transactions').delete().eq('id', item['payload']['id']);
      }
    }

    await cache.saveQueue([]);
  }

  @override
  Future<void> seedLocalData() async {
    final accounts = await cache.loadAccounts();
    if (accounts.isNotEmpty) return;

    await cache.saveAccounts(const [
      AccountModel(id: 'acc_try', name: 'Nakit', currency: CurrencyCode.tryCurrency, balance: 14500),
      AccountModel(id: 'acc_usd', name: 'USD Hesabı', currency: CurrencyCode.usd, balance: 2300),
      AccountModel(id: 'acc_eur', name: 'EUR Hesabı', currency: CurrencyCode.eur, balance: 780),
    ]);

    await cache.saveTransactions([
      TransactionModel(
        id: _uuid.v4(),
        accountId: 'acc_try',
        type: TransactionType.expense,
        category: 'Market',
        currency: CurrencyCode.tryCurrency,
        amount: 550,
        date: DateTime.now().subtract(const Duration(days: 1)),
        note: 'Haftalık alışveriş',
      ),
      TransactionModel(
        id: _uuid.v4(),
        accountId: 'acc_usd',
        type: TransactionType.income,
        category: 'Freelance',
        currency: CurrencyCode.usd,
        amount: 320,
        date: DateTime.now().subtract(const Duration(days: 2)),
        note: 'Client payment',
      ),
    ]);

    await cache.saveBudgets(const [
      BudgetModel(id: 'b1', category: 'Market', limit: 4000, spent: 2550),
      BudgetModel(id: 'b2', category: 'Ulaşım', limit: 1800, spent: 1950),
      BudgetModel(id: 'b3', category: 'Yeme-İçme', limit: 2200, spent: 980),
    ]);
  }


  @override
  Future<CategorySuggestion?> categorizeTransaction({
    required String text,
    required String merchant,
    required double amount,
    required String currency,
  }) async {
    final ai = await _aiService.suggestCategory(
      workspaceId: workspaceId,
      text: text,
      merchant: merchant,
      amount: amount,
      currency: currency,
    );
    return ai;
  }

  @override
  Future<WeeklySummary?> weeklySummary({
    required DateTime start,
    required DateTime end,
  }) async {
    return _aiService.weeklySummary(
      workspaceId: workspaceId,
      start: start,
      end: end,
    );
  }

  Future<void> _remoteUpsert(TransactionModel transaction) async {
    await _client.from('transactions').upsert({
      'id': transaction.id,
      'workspace_id': workspaceId,
      'account_id': transaction.accountId,
      'type': transaction.type.name,
      'amount': transaction.amount,
      'currency': transaction.currency.name == 'tryCurrency' ? 'TRY' : transaction.currency.name.toUpperCase(),
      'occurred_at': transaction.date.toIso8601String(),
      'note': transaction.note,
      'merchant': transaction.category,
    });
  }

  Future<void> _enqueue(Map<String, dynamic> task) async {
    final queue = await cache.loadQueue();
    await cache.saveQueue([...queue, task]);
  }
}
