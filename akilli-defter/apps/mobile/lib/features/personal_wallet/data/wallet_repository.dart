import '../models/wallet_models.dart';
import 'ai_service.dart';

abstract class WalletRepository {
  Future<List<AccountModel>> fetchAccounts();
  Future<List<TransactionModel>> fetchTransactions();
  Future<List<BudgetModel>> fetchBudgets();

  Future<void> upsertTransaction(TransactionModel transaction);
  Future<void> deleteTransaction(String id);

  Future<void> syncPendingQueue();
  Future<void> seedLocalData();

  Future<CategorySuggestion?> categorizeTransaction({
    required String text,
    required String merchant,
    required double amount,
    required String currency,
  });

  Future<WeeklySummary?> weeklySummary({
    required DateTime start,
    required DateTime end,
  });
}
