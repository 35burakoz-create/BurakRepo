import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';

class ProfitabilityCalculator {
  const ProfitabilityCalculator();

  static const supportedCurrencies = ['USD', 'EUR', 'TRY'];

  double convertAmount({
    required double amount,
    required String fromCurrency,
    required String toCurrency,
    required List<FxRateModel> rates,
  }) {
    if (fromCurrency == toCurrency) return amount;
    final direct = rates.where((r) => r.baseCurrency == fromCurrency && r.quoteCurrency == toCurrency);
    if (direct.isNotEmpty) return amount * direct.first.rate;

    final inverse = rates.where((r) => r.baseCurrency == toCurrency && r.quoteCurrency == fromCurrency);
    if (inverse.isNotEmpty && inverse.first.rate != 0) return amount / inverse.first.rate;

    return amount;
  }

  List<DealProfitability> buildDealProfitability({
    required List<DealModel> deals,
    required List<CollectionModel> collections,
    required List<CostAllocationModel> allocations,
    required List<FxRateModel> fxRates,
    required String reportingCurrency,
  }) {
    return deals.map((deal) {
      final dealCollections = collections.where((c) => c.invoiceNumber.contains(deal.id) || c.customerName == deal.customerName);
      final revenue = dealCollections.fold<double>(0, (sum, c) {
        return sum + convertAmount(
          amount: c.amount,
          fromCurrency: c.currency,
          toCurrency: reportingCurrency,
          rates: fxRates,
        );
      });

      final dealCosts = allocations.where((a) => a.dealId == deal.id);
      final allocatedCost = dealCosts.fold<double>(0, (sum, a) {
        return sum + convertAmount(
          amount: a.amount,
          fromCurrency: a.currency,
          toCurrency: reportingCurrency,
          rates: fxRates,
        );
      });

      final expectedMargin = revenue == 0 ? 0 : (deal.expectedMargin / 100) * revenue;
      final realizedMargin = revenue - allocatedCost;

      return DealProfitability(
        dealId: deal.id,
        customerName: deal.customerName,
        dealCurrency: deal.currency,
        revenue: revenue,
        allocatedCost: allocatedCost,
        expectedMargin: expectedMargin,
        realizedMargin: realizedMargin,
        reportingCurrency: reportingCurrency,
      );
    }).toList();
  }

  List<CurrencyExposure> buildCurrencyExposure({
    required List<CollectionModel> collections,
    required List<CostAllocationModel> allocations,
  }) {
    return supportedCurrencies.map((currency) {
      final receivables = collections
          .where((item) => item.currency == currency && item.status != CollectionStatus.collected)
          .fold<double>(0, (sum, item) => sum + item.amount);
      final payables = allocations
          .where((item) => item.currency == currency)
          .fold<double>(0, (sum, item) => sum + item.amount);
      return CurrencyExposure(
        currency: currency,
        receivables: receivables,
        payables: payables,
      );
    }).toList();
  }

  FxScenarioResult buildScenarioResult({
    required List<CurrencyExposure> exposures,
    required String selectedCurrency,
    required double percentChange,
    required String reportingCurrency,
    required List<DealProfitability> profitability,
    required List<FxRateModel> rates,
  }) {
    final exposure = exposures.firstWhere(
      (e) => e.currency == selectedCurrency,
      orElse: () => const CurrencyExposure(currency: 'USD', receivables: 0, payables: 0),
    );
    final factor = percentChange / 100;

    final receivableImpactNative = exposure.receivables * factor;
    final payableImpactNative = exposure.payables * factor;
    final cashflowImpactNative = receivableImpactNative - payableImpactNative;
    final cashflowImpact = convertAmount(
      amount: cashflowImpactNative,
      fromCurrency: selectedCurrency,
      toCurrency: reportingCurrency,
      rates: rates,
    );

    final marginBase = profitability
        .where((row) => row.dealCurrency == selectedCurrency)
        .fold<double>(0, (sum, row) => sum + row.realizedMargin + row.expectedMargin);
    final hasMarginData = marginBase != 0;
    final marginImpact = hasMarginData ? marginBase * factor : 0;

    return FxScenarioResult(
      currency: selectedCurrency,
      percentChange: percentChange,
      cashflowImpact: cashflowImpact,
      marginImpact: marginImpact,
      hasMarginData: hasMarginData,
      receivables: exposure.receivables,
      payables: exposure.payables,
      reportingCurrency: reportingCurrency,
    );
  }
}
