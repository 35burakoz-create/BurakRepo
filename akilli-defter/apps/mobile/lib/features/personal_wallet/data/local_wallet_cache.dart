import 'package:shared_preferences/shared_preferences.dart';

import '../models/wallet_models.dart';

class LocalWalletCache {
  static const _accountsKey = 'wallet_accounts';
  static const _transactionsKey = 'wallet_transactions';
  static const _budgetsKey = 'wallet_budgets';
  static const _queueKey = 'wallet_offline_queue';

  Future<void> saveAccounts(List<AccountModel> accounts) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accountsKey, encodeList(accounts.map((e) => e.toMap()).toList()));
  }

  Future<List<AccountModel>> loadAccounts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_accountsKey);
    if (raw == null || raw.isEmpty) return [];
    return decodeList(raw).map(AccountModel.fromMap).toList();
  }

  Future<void> saveTransactions(List<TransactionModel> transactions) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_transactionsKey, encodeList(transactions.map((e) => e.toMap()).toList()));
  }

  Future<List<TransactionModel>> loadTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_transactionsKey);
    if (raw == null || raw.isEmpty) return [];
    return decodeList(raw).map(TransactionModel.fromMap).toList();
  }

  Future<void> saveBudgets(List<BudgetModel> budgets) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_budgetsKey, encodeList(budgets.map((e) => e.toMap()).toList()));
  }

  Future<List<BudgetModel>> loadBudgets() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_budgetsKey);
    if (raw == null || raw.isEmpty) return [];
    return decodeList(raw).map(BudgetModel.fromMap).toList();
  }

  Future<List<Map<String, dynamic>>> loadQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];
    return decodeList(raw);
  }

  Future<void> saveQueue(List<Map<String, dynamic>> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_queueKey, encodeList(queue));
  }
}
