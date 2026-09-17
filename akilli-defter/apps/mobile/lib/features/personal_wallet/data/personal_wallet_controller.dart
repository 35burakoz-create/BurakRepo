import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../models/wallet_models.dart';
import 'wallet_repository.dart';
import 'ai_service.dart';

class PersonalWalletController extends ChangeNotifier {
  PersonalWalletController({required this.repository});

  final WalletRepository repository;
  final _uuid = const Uuid();

  bool isLoading = true;
  String query = '';
  TransactionType? filterType;
  List<AccountModel> accounts = [];
  List<TransactionModel> transactions = [];
  List<BudgetModel> budgets = [];
  WeeklySummary? weeklyAiSummary;
  bool weeklyAiLoading = false;

  Future<void> initialize() async {
    isLoading = true;
    notifyListeners();
    await repository.seedLocalData();
    accounts = await repository.fetchAccounts();
    transactions = await repository.fetchTransactions();
    budgets = await repository.fetchBudgets();
    isLoading = false;
    notifyListeners();
  }

  Future<void> sync() async {
    await repository.syncPendingQueue();
  }

  List<TransactionModel> get visibleTransactions {
    return transactions.where((tx) {
      final matchedText = query.isEmpty ||
          tx.note.toLowerCase().contains(query.toLowerCase()) ||
          tx.category.toLowerCase().contains(query.toLowerCase());
      final matchedType = filterType == null || tx.type == filterType;
      return matchedText && matchedType;
    }).toList();
  }

  double get totalBalance => accounts.fold(0, (sum, e) => sum + e.balance);

  double get thisWeekSpending {
    final weekStart = DateTime.now().subtract(const Duration(days: 7));
    return transactions
        .where((t) => t.type == TransactionType.expense && t.date.isAfter(weekStart))
        .fold(0, (sum, t) => sum + t.amount);
  }

  int get upcomingBillsCount => 3;

  Future<WeeklySummary?> requestWeeklyAiSummary() async {
    if (weeklyAiLoading) return;
    weeklyAiLoading = true;
    notifyListeners();
    weeklyAiSummary = await repository.weeklySummary(
      start: DateTime.now().subtract(const Duration(days: 7)),
      end: DateTime.now(),
    );
    weeklyAiLoading = false;
    notifyListeners();
    return weeklyAiSummary;
  }

  Future<CategorySuggestion?> suggestCategory({
    required String text,
    required String merchant,
    required double amount,
    required String currency,
  }) {
    return repository.categorizeTransaction(
      text: text,
      merchant: merchant,
      amount: amount,
      currency: currency,
    );
  }

  Future<void> saveTransaction({
    String? id,
    required String accountId,
    required TransactionType type,
    required String category,
    required CurrencyCode currency,
    required double amount,
    required DateTime date,
    required String note,
  }) async {
    final model = TransactionModel(
      id: id ?? _uuid.v4(),
      accountId: accountId,
      type: type,
      category: category,
      currency: currency,
      amount: amount,
      date: date,
      note: note,
    );

    await repository.upsertTransaction(model);
    transactions = await repository.fetchTransactions();
    notifyListeners();
  }

  Future<void> deleteTransaction(String id) async {
    await repository.deleteTransaction(id);
    transactions = await repository.fetchTransactions();
    notifyListeners();
  }

  void setQuery(String value) {
    query = value;
    notifyListeners();
  }

  void setFilter(TransactionType? type) {
    filterType = type;
    notifyListeners();
  }
}
