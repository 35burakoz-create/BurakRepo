enum CostAllocationType { freight, customs, packing, commission, other }

class CostAllocationModel {
  const CostAllocationModel({
    required this.id,
    required this.dealId,
    required this.type,
    required this.amount,
    required this.currency,
    required this.date,
  });

  final String id;
  final String dealId;
  final CostAllocationType type;
  final double amount;
  final String currency;
  final DateTime date;

  Map<String, dynamic> toMap() => {
        'id': id,
        'deal_id': dealId,
        'type': type.name,
        'amount': amount,
        'currency': currency,
        'date': date.toIso8601String(),
      };

  factory CostAllocationModel.fromMap(Map<String, dynamic> map) => CostAllocationModel(
        id: map['id'] as String,
        dealId: map['deal_id'] as String,
        type: CostAllocationType.values.firstWhere((e) => e.name == map['type']),
        amount: (map['amount'] as num).toDouble(),
        currency: map['currency'] as String,
        date: DateTime.parse(map['date'] as String),
      );
}

class FxRateModel {
  const FxRateModel({
    required this.baseCurrency,
    required this.quoteCurrency,
    required this.rate,
  });

  final String baseCurrency;
  final String quoteCurrency;
  final double rate;
}

class DealProfitability {
  const DealProfitability({
    required this.dealId,
    required this.customerName,
    required this.dealCurrency,
    required this.revenue,
    required this.allocatedCost,
    required this.expectedMargin,
    required this.realizedMargin,
    required this.reportingCurrency,
  });

  final String dealId;
  final String customerName;
  final String dealCurrency;
  final double revenue;
  final double allocatedCost;
  final double expectedMargin;
  final double realizedMargin;
  final String reportingCurrency;
}

class CurrencyExposure {
  const CurrencyExposure({
    required this.currency,
    required this.receivables,
    required this.payables,
  });

  final String currency;
  final double receivables;
  final double payables;

  double get net => receivables - payables;
}

class FxScenarioResult {
  const FxScenarioResult({
    required this.currency,
    required this.percentChange,
    required this.cashflowImpact,
    required this.marginImpact,
    required this.hasMarginData,
    required this.receivables,
    required this.payables,
    required this.reportingCurrency,
  });

  final String currency;
  final double percentChange;
  final double cashflowImpact;
  final double marginImpact;
  final bool hasMarginData;
  final double receivables;
  final double payables;
  final String reportingCurrency;
}
