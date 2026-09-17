import 'dart:convert';

enum CurrencyCode { tryCurrency, usd, eur }

enum TransactionType { income, expense, transfer }

class AccountModel {
  const AccountModel({
    required this.id,
    required this.name,
    required this.currency,
    required this.balance,
  });

  final String id;
  final String name;
  final CurrencyCode currency;
  final double balance;

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'currency': currency.name,
        'balance': balance,
      };

  factory AccountModel.fromMap(Map<String, dynamic> map) => AccountModel(
        id: map['id'] as String,
        name: map['name'] as String,
        currency: CurrencyCode.values.firstWhere((e) => e.name == map['currency']),
        balance: (map['balance'] as num).toDouble(),
      );
}

class TransactionModel {
  const TransactionModel({
    required this.id,
    required this.accountId,
    required this.type,
    required this.category,
    required this.currency,
    required this.amount,
    required this.date,
    required this.note,
  });

  final String id;
  final String accountId;
  final TransactionType type;
  final String category;
  final CurrencyCode currency;
  final double amount;
  final DateTime date;
  final String note;

  Map<String, dynamic> toMap() => {
        'id': id,
        'account_id': accountId,
        'type': type.name,
        'category': category,
        'currency': currency.name,
        'amount': amount,
        'date': date.toIso8601String(),
        'note': note,
      };

  factory TransactionModel.fromMap(Map<String, dynamic> map) => TransactionModel(
        id: map['id'] as String,
        accountId: map['account_id'] as String,
        type: TransactionType.values.firstWhere((e) => e.name == map['type']),
        category: (map['category'] ?? '') as String,
        currency: CurrencyCode.values.firstWhere((e) => e.name == map['currency']),
        amount: (map['amount'] as num).toDouble(),
        date: DateTime.parse(map['date'] as String),
        note: (map['note'] ?? '') as String,
      );
}

class BudgetModel {
  const BudgetModel({
    required this.id,
    required this.category,
    required this.limit,
    required this.spent,
  });

  final String id;
  final String category;
  final double limit;
  final double spent;

  bool get isOverLimit => spent > limit;

  Map<String, dynamic> toMap() => {
        'id': id,
        'category': category,
        'limit': limit,
        'spent': spent,
      };

  factory BudgetModel.fromMap(Map<String, dynamic> map) => BudgetModel(
        id: map['id'] as String,
        category: map['category'] as String,
        limit: (map['limit'] as num).toDouble(),
        spent: (map['spent'] as num).toDouble(),
      );
}

String encodeList(List<Map<String, dynamic>> data) => jsonEncode(data);
List<Map<String, dynamic>> decodeList(String raw) => (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
