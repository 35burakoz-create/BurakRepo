import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/business_models.dart';
import '../models/cost_allocation_models.dart';
import 'business_repository.dart';
import 'local_business_cache.dart';

class SupabaseBusinessRepository implements BusinessRepository {
  SupabaseBusinessRepository({required this.cache, required this.workspaceId});

  final LocalBusinessCache cache;
  final String workspaceId;
  final _uuid = const Uuid();

  bool get _canRemote => Supabase.initialized;
  SupabaseClient get _client => Supabase.instance.client;

  @override
  Future<List<ContactModel>> fetchContacts() async {
    final local = await cache.loadContacts();
    if (!_canRemote) return local;

    final rows = await _client
        .from('contacts')
        .select('id,name,kind,email')
        .eq('workspace_id', workspaceId)
        .order('name');

    final contacts = (rows as List)
        .map((e) => ContactModel.fromMap({
              'id': e['id'],
              'name': e['name'],
              'kind': e['kind'],
              'email': e['email'] ?? '',
            }))
        .toList();
    await cache.saveContacts(contacts);
    return contacts;
  }

  @override
  Future<List<DealModel>> fetchDeals() async {
    final local = await cache.loadDeals();
    if (!_canRemote) return local;

    final rows = await _client
        .from('deals')
        .select('id,currency,code,status,contacts(name),amount')
        .eq('workspace_id', workspaceId)
        .order('created_at', ascending: false);

    final deals = (rows as List)
        .map((e) => DealModel(
              id: e['id'] as String,
              customerName: (e['contacts']?['name'] ?? 'Müşteri') as String,
              currency: (e['currency'] as String),
              incoterm: (e['code'] ?? 'FOB') as String,
              expectedMargin: ((e['amount'] as num?)?.toDouble() ?? 0) * 0.12,
            ))
        .toList();
    await cache.saveDeals(deals);
    return deals;
  }

  @override
  Future<List<CollectionModel>> fetchCollections() async {
    final local = await cache.loadCollections();
    if (!_canRemote) return local;

    final rows = await _client
        .from('payment_schedules')
        .select('id,due_date,amount,status,invoices(invoice_number,currency,deals(contacts(name)))')
        .eq('workspace_id', workspaceId)
        .order('due_date');

    final collections = (rows as List)
        .map((e) {
          final invoice = e['invoices'] as Map<String, dynamic>?;
          final deal = invoice?['deals'] as Map<String, dynamic>?;
          final contact = deal?['contacts'] as Map<String, dynamic>?;
          final statusText = (e['status'] as String?) ?? 'pending';
          final status = statusText == 'paid'
              ? CollectionStatus.collected
              : statusText == 'overdue'
                  ? CollectionStatus.overdue
                  : CollectionStatus.pending;
          return CollectionModel(
            id: e['id'] as String,
            invoiceNumber: (invoice?['invoice_number'] ?? 'INV') as String,
            customerName: (contact?['name'] ?? 'Müşteri') as String,
            dueDate: DateTime.parse(e['due_date'] as String),
            amount: (e['amount'] as num).toDouble(),
            currency: (invoice?['currency'] ?? 'USD') as String,
            status: status,
          );
        })
        .toList();
    await cache.saveCollections(collections);
    return collections;
  }


  @override
  Future<List<CostAllocationModel>> fetchCostAllocations() async {
    final local = await cache.loadAllocations();
    if (!_canRemote) return local;

    final rows = await _client
        .from('cost_allocations')
        .select('id,deal_id,cost_type,amount,currency')
        .eq('workspace_id', workspaceId)
        .order('id');

    final allocations = (rows as List)
        .map((e) => CostAllocationModel.fromMap({
              'id': e['id'],
              'deal_id': e['deal_id'],
              'type': (e['cost_type'] as String?) == 'other' ? 'other' : (e['cost_type'] ?? 'freight'),
              'amount': e['amount'],
              'currency': e['currency'],
              'date': DateTime.now().toIso8601String(),
            }))
        .toList();
    await cache.saveAllocations(allocations);
    return allocations;
  }

  @override
  Future<void> upsertCostAllocation(CostAllocationModel allocation) async {
    final local = await cache.loadAllocations();
    final idx = local.indexWhere((e) => e.id == allocation.id);
    final next = [...local];
    if (idx >= 0) {
      next[idx] = allocation;
    } else {
      next.add(allocation);
    }
    await cache.saveAllocations(next);

    if (!_canRemote) return;
    await _client.from('cost_allocations').upsert({
      'id': allocation.id,
      'workspace_id': workspaceId,
      'deal_id': allocation.dealId,
      'cost_type': allocation.type.name,
      'amount': allocation.amount,
      'currency': allocation.currency,
    });
  }

  @override
  Future<void> deleteCostAllocation(String id) async {
    final local = await cache.loadAllocations();
    await cache.saveAllocations(local.where((e) => e.id != id).toList());

    if (!_canRemote) return;
    await _client.from('cost_allocations').delete().eq('id', id);
  }

  @override
  Future<List<FxRateModel>> fetchFxRates(String reportingCurrency) async {
    if (!_canRemote) {
      return const [
        FxRateModel(baseCurrency: 'USD', quoteCurrency: 'TRY', rate: 32),
        FxRateModel(baseCurrency: 'EUR', quoteCurrency: 'TRY', rate: 35),
        FxRateModel(baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.92),
      ];
    }

    final rows = await _client
        .from('fx_rates')
        .select('base_currency,quote_currency,rate')
        .eq('quote_currency', reportingCurrency);

    return (rows as List)
        .map((e) => FxRateModel(
              baseCurrency: e['base_currency'] as String,
              quoteCurrency: e['quote_currency'] as String,
              rate: (e['rate'] as num).toDouble(),
            ))
        .toList();
  }

  @override
  Future<void> upsertContact(ContactModel contact) async {
    final local = await cache.loadContacts();
    final idx = local.indexWhere((e) => e.id == contact.id);
    final next = [...local];
    if (idx >= 0) {
      next[idx] = contact;
    } else {
      next.add(contact);
    }
    await cache.saveContacts(next);

    if (!_canRemote) return;
    await _client.from('contacts').upsert({
      'id': contact.id,
      'workspace_id': workspaceId,
      'name': contact.name,
      'kind': contact.kind.name,
      'email': contact.email,
    });
  }

  @override
  Future<void> deleteContact(String id) async {
    final local = await cache.loadContacts();
    await cache.saveContacts(local.where((e) => e.id != id).toList());
    if (!_canRemote) return;
    await _client.from('contacts').delete().eq('id', id);
  }

  @override
  Future<void> updateCollectionStatus(String id, CollectionStatus status) async {
    final local = await cache.loadCollections();
    final updated = local
        .map((e) => e.id == id
            ? CollectionModel(
                id: e.id,
                invoiceNumber: e.invoiceNumber,
                customerName: e.customerName,
                dueDate: e.dueDate,
                amount: e.amount,
                currency: e.currency,
                status: status,
              )
            : e)
        .toList();
    await cache.saveCollections(updated);

    if (!_canRemote) return;
    await _client.from('payment_schedules').update({
      'status': status == CollectionStatus.collected
          ? 'paid'
          : status == CollectionStatus.overdue
              ? 'overdue'
              : 'pending',
    }).eq('id', id);
  }


  @override
  Future<CollectionMessageDraft> collectionMessageDraft({
    required String contact,
    required int overdueDays,
    required double amount,
    required String currency,
    required MessageTone tone,
  }) async {
    if (_canRemote) {
      try {
        final res = await _client.functions.invoke(
          'collection_message',
          body: {
            'workspace_id': workspaceId,
            'contact': contact,
            'overdue_days': overdueDays,
            'amount': amount,
            'currency': currency,
            'tone': tone.name,
          },
        );
        final data = res.data as Map<String, dynamic>?;
        if (data != null) {
          return CollectionMessageDraft.fromMap(data);
        }
      } catch (_) {
        // fallback below
      }
    }

    final trTone = tone == MessageTone.nazik
        ? 'Nazik bir hatırlatma'
        : tone == MessageTone.net
            ? 'Net bir hatırlatma'
            : 'Profesyonel ve kararlı hatırlatma';
    final enTone = tone == MessageTone.nazik
        ? 'Polite reminder'
        : tone == MessageTone.net
            ? 'Direct reminder'
            : 'Firm but professional reminder';

    return CollectionMessageDraft(
      whatsappTr:
          '$trTone: Merhaba $contact, $amount $currency tutarlı ödemeniz $overdueDays gündür gecikmede. Uygun olduğunuz tarihi paylaşabilir misiniz?',
      emailTr:
          'Konu: Geciken ödeme hatırlatması\n\nSayın $contact,\n$amount $currency tutarlı ödemeniz $overdueDays gündür gecikmede. Güncel ödeme planınızı paylaşmanızı rica ederiz.\n\nTeşekkürler.',
      whatsappEn:
          '$enTone: Hello $contact, your payment of $amount $currency is overdue by $overdueDays days. Could you share your transfer date?',
      emailEn:
          'Subject: Overdue payment reminder\n\nDear $contact,\nYour payment of $amount $currency is overdue by $overdueDays days. Please share your expected transfer date.\n\nThank you.',
    );
  }

  @override
  Future<void> seedLocalData() async {
    final contacts = await cache.loadContacts();
    if (contacts.isNotEmpty) return;

    await cache.saveContacts([
      ContactModel(id: _uuid.v4(), name: 'Anadolu Trade', kind: ContactKind.customer, email: 'ops@anadolutrade.com'),
      ContactModel(id: _uuid.v4(), name: 'Ege Supplies', kind: ContactKind.supplier, email: 'sales@egesupplies.com'),
    ]);

    await cache.saveDeals(const [
      DealModel(id: 'deal_1', customerName: 'Anadolu Trade', currency: 'USD', incoterm: 'FOB', expectedMargin: 18.5),
      DealModel(id: 'deal_2', customerName: 'Balkan Foods', currency: 'EUR', incoterm: 'CIF', expectedMargin: 14.2),
    ]);

    await cache.saveCollections([
      CollectionModel(
        id: _uuid.v4(),
        invoiceNumber: 'INV-2026-001',
        customerName: 'Anadolu Trade',
        dueDate: DateTime.now().subtract(const Duration(days: 2)),
        amount: 8500,
        currency: 'USD',
        status: CollectionStatus.overdue,
      ),
      CollectionModel(
        id: _uuid.v4(),
        invoiceNumber: 'INV-2026-002',
        customerName: 'Balkan Foods',
        dueDate: DateTime.now().add(const Duration(days: 4)),
        amount: 6200,
        currency: 'EUR',
        status: CollectionStatus.pending,
      ),
    ]);


    await cache.saveAllocations([
      CostAllocationModel(
        id: _uuid.v4(),
        dealId: 'deal_1',
        type: CostAllocationType.freight,
        amount: 1200,
        currency: 'USD',
        date: DateTime.now().subtract(const Duration(days: 5)),
      ),
      CostAllocationModel(
        id: _uuid.v4(),
        dealId: 'deal_1',
        type: CostAllocationType.customs,
        amount: 450,
        currency: 'USD',
        date: DateTime.now().subtract(const Duration(days: 3)),
      ),
      CostAllocationModel(
        id: _uuid.v4(),
        dealId: 'deal_2',
        type: CostAllocationType.other,
        amount: 300,
        currency: 'EUR',
        date: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ]);
  }
}
