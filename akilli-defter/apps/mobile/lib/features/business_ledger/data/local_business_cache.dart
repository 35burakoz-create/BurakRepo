import 'package:shared_preferences/shared_preferences.dart';

import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';

class LocalBusinessCache {
  static const _contacts = 'biz_contacts';
  static const _deals = 'biz_deals';
  static const _collections = 'biz_collections';
  static const _allocations = 'biz_allocations';

  Future<List<ContactModel>> loadContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_contacts);
    if (raw == null || raw.isEmpty) return [];
    return decodeMaps(raw).map(ContactModel.fromMap).toList();
  }

  Future<void> saveContacts(List<ContactModel> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_contacts, encodeMaps(data.map((e) => e.toMap()).toList()));
  }

  Future<List<DealModel>> loadDeals() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_deals);
    if (raw == null || raw.isEmpty) return [];
    return decodeMaps(raw).map(DealModel.fromMap).toList();
  }

  Future<void> saveDeals(List<DealModel> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_deals, encodeMaps(data.map((e) => e.toMap()).toList()));
  }

  Future<List<CollectionModel>> loadCollections() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_collections);
    if (raw == null || raw.isEmpty) return [];
    return decodeMaps(raw).map(CollectionModel.fromMap).toList();
  }

  Future<void> saveCollections(List<CollectionModel> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_collections, encodeMaps(data.map((e) => e.toMap()).toList()));
  }

  Future<List<CostAllocationModel>> loadAllocations() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_allocations);
    if (raw == null || raw.isEmpty) return [];
    return decodeMaps(raw).map(CostAllocationModel.fromMap).toList();
  }

  Future<void> saveAllocations(List<CostAllocationModel> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_allocations, encodeMaps(data.map((e) => e.toMap()).toList()));
  }
}
