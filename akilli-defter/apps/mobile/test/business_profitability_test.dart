import 'package:duo_ledger_mobile/features/business_ledger/data/profitability_calculator.dart';
import 'package:duo_ledger_mobile/features/business_ledger/models/business_models.dart';
import 'package:duo_ledger_mobile/features/business_ledger/models/cost_allocation_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const calculator = ProfitabilityCalculator();

  test('FX conversion uses fx_rates for reporting currency', () {
    final converted = calculator.convertAmount(
      amount: 100,
      fromCurrency: 'USD',
      toCurrency: 'TRY',
      rates: const [FxRateModel(baseCurrency: 'USD', quoteCurrency: 'TRY', rate: 32.0)],
    );
    expect(converted, 3200);
  });

  test('realized margin is revenue minus allocations', () {
    final result = calculator.buildDealProfitability(
      deals: const [
        DealModel(id: 'deal_1', customerName: 'Anadolu Trade', currency: 'USD', incoterm: 'FOB', expectedMargin: 20),
      ],
      collections: [
        CollectionModel(
          id: 'c1',
          invoiceNumber: 'deal_1-INV',
          customerName: 'Anadolu Trade',
          dueDate: DateTime.now(),
          amount: 1000,
          currency: 'USD',
          status: CollectionStatus.pending,
        ),
      ],
      allocations: [
        CostAllocationModel(
          id: 'a1',
          dealId: 'deal_1',
          type: CostAllocationType.freight,
          amount: 200,
          currency: 'USD',
          date: DateTime.now(),
        ),
      ],
      fxRates: const [],
      reportingCurrency: 'USD',
    );

    expect(result.single.revenue, 1000);
    expect(result.single.allocatedCost, 200);
    expect(result.single.realizedMargin, 800);
    expect(result.single.expectedMargin, 200);
    expect(result.single.dealCurrency, 'USD');
  });

  test('currency exposure groups receivables and payables by currency', () {
    final exposure = calculator.buildCurrencyExposure(
      collections: [
        CollectionModel(
          id: 'c1',
          invoiceNumber: 'INV-1',
          customerName: 'A',
          dueDate: DateTime.now(),
          amount: 500,
          currency: 'USD',
          status: CollectionStatus.pending,
        ),
      ],
      allocations: [
        CostAllocationModel(
          id: 'a1',
          dealId: 'd1',
          type: CostAllocationType.freight,
          amount: 120,
          currency: 'USD',
          date: DateTime.now(),
        ),
      ],
    );

    final usd = exposure.firstWhere((e) => e.currency == 'USD');
    expect(usd.receivables, 500);
    expect(usd.payables, 120);
    expect(usd.net, 380);
  });

  test('scenario impact applies proportional change and conversion', () {
    final result = calculator.buildScenarioResult(
      exposures: const [
        CurrencyExposure(currency: 'USD', receivables: 1000, payables: 300),
        CurrencyExposure(currency: 'EUR', receivables: 0, payables: 0),
      ],
      selectedCurrency: 'USD',
      percentChange: 10,
      reportingCurrency: 'TRY',
      profitability: const [
        DealProfitability(
          dealId: 'd1',
          customerName: 'A',
          dealCurrency: 'USD',
          revenue: 0,
          allocatedCost: 0,
          expectedMargin: 200,
          realizedMargin: 400,
          reportingCurrency: 'TRY',
        )
      ],
      rates: const [FxRateModel(baseCurrency: 'USD', quoteCurrency: 'TRY', rate: 32)],
    );

    expect(result.cashflowImpact, 2240); // (1000-300)*10%=70 USD => 2240 TRY
    expect(result.marginImpact, 60);
    expect(result.hasMarginData, isTrue);
  });
}
