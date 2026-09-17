import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';

abstract class BusinessRepository {
  Future<List<ContactModel>> fetchContacts();
  Future<List<DealModel>> fetchDeals();
  Future<List<CollectionModel>> fetchCollections();

  Future<List<CostAllocationModel>> fetchCostAllocations();
  Future<void> upsertCostAllocation(CostAllocationModel allocation);
  Future<void> deleteCostAllocation(String id);
  Future<List<FxRateModel>> fetchFxRates(String reportingCurrency);

  Future<void> upsertContact(ContactModel contact);
  Future<void> deleteContact(String id);

  Future<void> updateCollectionStatus(String id, CollectionStatus status);

  Future<CollectionMessageDraft> collectionMessageDraft({
    required String contact,
    required int overdueDays,
    required double amount,
    required String currency,
    required MessageTone tone,
  });
  Future<void> seedLocalData();
}
