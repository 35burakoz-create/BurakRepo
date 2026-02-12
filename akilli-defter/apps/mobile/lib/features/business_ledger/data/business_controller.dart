import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';
import 'business_repository.dart';
import 'profitability_calculator.dart';

class BusinessController extends ChangeNotifier {
  BusinessController({required this.repository});

  final BusinessRepository repository;
  final _uuid = const Uuid();
  final _calculator = const ProfitabilityCalculator();

  bool isLoading = true;
  List<ContactModel> contacts = [];
  List<DealModel> deals = [];
  List<CollectionModel> collections = [];
  List<CostAllocationModel> allocations = [];
  List<DealProfitability> profitability = [];
  List<FxRateModel> _fxRates = const [];
  String reportingCurrency = 'TRY';

  String search = '';
  CollectionStatus? statusFilter;

  String scenarioCurrency = 'USD';
  double scenarioPercent = 5;

  Future<void> initialize() async {
    isLoading = true;
    notifyListeners();
    await repository.seedLocalData();
    await _reload();
    isLoading = false;
    notifyListeners();
  }

  Future<void> _reload() async {
    contacts = await repository.fetchContacts();
    deals = await repository.fetchDeals();
    collections = await repository.fetchCollections();
    allocations = await repository.fetchCostAllocations();
    _fxRates = await repository.fetchFxRates(reportingCurrency);
    profitability = _calculator.buildDealProfitability(
      deals: deals,
      collections: collections,
      allocations: allocations,
      fxRates: _fxRates,
      reportingCurrency: reportingCurrency,
    );
  }

  List<CurrencyExposure> get currencyExposure => _calculator.buildCurrencyExposure(
        collections: collections,
        allocations: allocations,
      );

  FxScenarioResult get scenarioResult => _calculator.buildScenarioResult(
        exposures: currencyExposure,
        selectedCurrency: scenarioCurrency,
        percentChange: scenarioPercent,
        reportingCurrency: reportingCurrency,
        profitability: profitability,
        rates: _fxRates,
      );

  double get totalReceivables => collections
      .where((e) => e.status != CollectionStatus.collected)
      .fold(0, (sum, e) => sum + e.amount);

  int get overdueCount => collections.where((e) => e.isOverdue || e.status == CollectionStatus.overdue).length;

  int get upcomingCount => collections.where((e) => !e.isOverdue && e.status == CollectionStatus.pending).length;

  String get fxExposureSnapshot {
    final netTry = currencyExposure.fold<double>(0, (sum, item) {
      return sum + _calculator.convertAmount(
        amount: item.net,
        fromCurrency: item.currency,
        toCurrency: reportingCurrency,
        rates: _fxRates,
      );
    });
    return '${netTry.toStringAsFixed(0)} $reportingCurrency';
  }

  List<CollectionModel> get visibleCollections {
    return collections.where((c) {
      final textOk = search.isEmpty ||
          c.customerName.toLowerCase().contains(search.toLowerCase()) ||
          c.invoiceNumber.toLowerCase().contains(search.toLowerCase());
      final filterOk = statusFilter == null || c.status == statusFilter;
      return textOk && filterOk;
    }).toList();
  }

  Future<CollectionMessageDraft> generateCollectionMessage({
    required CollectionModel item,
    required MessageTone tone,
  }) {
    final overdueDays = item.dueDate.isBefore(DateTime.now())
        ? DateTime.now().difference(item.dueDate).inDays
        : 0;
    return repository.collectionMessageDraft(
      contact: item.customerName,
      overdueDays: overdueDays,
      amount: item.amount,
      currency: item.currency,
      tone: tone,
    );
  }

  Future<void> saveContact({
    String? id,
    required String name,
    required ContactKind kind,
    required String email,
  }) async {
    await repository.upsertContact(ContactModel(
      id: id ?? _uuid.v4(),
      name: name,
      kind: kind,
      email: email,
    ));
    contacts = await repository.fetchContacts();
    notifyListeners();
  }

  Future<void> deleteContact(String id) async {
    await repository.deleteContact(id);
    contacts = await repository.fetchContacts();
    notifyListeners();
  }

  Future<void> setCollectionStatus(String id, CollectionStatus status) async {
    await repository.updateCollectionStatus(id, status);
    collections = await repository.fetchCollections();
    profitability = _calculator.buildDealProfitability(
      deals: deals,
      collections: collections,
      allocations: allocations,
      fxRates: _fxRates,
      reportingCurrency: reportingCurrency,
    );
    notifyListeners();
  }

  Future<void> saveAllocation({
    String? id,
    required String dealId,
    required CostAllocationType type,
    required double amount,
    required String currency,
    required DateTime date,
  }) async {
    await repository.upsertCostAllocation(
      CostAllocationModel(
        id: id ?? _uuid.v4(),
        dealId: dealId,
        type: type,
        amount: amount,
        currency: currency,
        date: date,
      ),
    );
    await _reload();
    notifyListeners();
  }

  Future<void> deleteAllocation(String id) async {
    await repository.deleteCostAllocation(id);
    await _reload();
    notifyListeners();
  }

  Future<void> setReportingCurrency(String value) async {
    reportingCurrency = value;
    _fxRates = await repository.fetchFxRates(reportingCurrency);
    profitability = _calculator.buildDealProfitability(
      deals: deals,
      collections: collections,
      allocations: allocations,
      fxRates: _fxRates,
      reportingCurrency: reportingCurrency,
    );
    notifyListeners();
  }

  void setScenarioCurrency(String value) {
    scenarioCurrency = value;
    notifyListeners();
  }

  void setScenarioPercent(String value) {
    scenarioPercent = double.tryParse(value.replaceAll(',', '.')) ?? scenarioPercent;
    notifyListeners();
  }

  void setSearch(String value) {
    search = value;
    notifyListeners();
  }

  void setStatusFilter(CollectionStatus? value) {
    statusFilter = value;
    notifyListeners();
  }
}
