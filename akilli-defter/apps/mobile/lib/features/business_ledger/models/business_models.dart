import 'dart:convert';

enum ContactKind { customer, supplier }

enum CollectionStatus { pending, overdue, collected }


enum MessageTone { nazik, net, sert }

class CollectionMessageDraft {
  const CollectionMessageDraft({
    required this.whatsappTr,
    required this.emailTr,
    required this.whatsappEn,
    required this.emailEn,
  });

  final String whatsappTr;
  final String emailTr;
  final String whatsappEn;
  final String emailEn;

  factory CollectionMessageDraft.fromMap(Map<String, dynamic> map) => CollectionMessageDraft(
        whatsappTr: (map['whatsapp_tr'] ?? '') as String,
        emailTr: (map['email_tr'] ?? '') as String,
        whatsappEn: (map['whatsapp_en'] ?? '') as String,
        emailEn: (map['email_en'] ?? '') as String,
      );
}

class ContactModel {
  const ContactModel({
    required this.id,
    required this.name,
    required this.kind,
    this.email = '',
  });

  final String id;
  final String name;
  final ContactKind kind;
  final String email;

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'kind': kind.name,
        'email': email,
      };

  factory ContactModel.fromMap(Map<String, dynamic> map) => ContactModel(
        id: map['id'] as String,
        name: map['name'] as String,
        kind: ContactKind.values.firstWhere((e) => e.name == map['kind']),
        email: (map['email'] ?? '') as String,
      );
}

class DealModel {
  const DealModel({
    required this.id,
    required this.customerName,
    required this.currency,
    required this.incoterm,
    required this.expectedMargin,
  });

  final String id;
  final String customerName;
  final String currency;
  final String incoterm;
  final double expectedMargin;

  Map<String, dynamic> toMap() => {
        'id': id,
        'customer_name': customerName,
        'currency': currency,
        'incoterm': incoterm,
        'expected_margin': expectedMargin,
      };

  factory DealModel.fromMap(Map<String, dynamic> map) => DealModel(
        id: map['id'] as String,
        customerName: map['customer_name'] as String,
        currency: map['currency'] as String,
        incoterm: map['incoterm'] as String,
        expectedMargin: (map['expected_margin'] as num).toDouble(),
      );
}

class CollectionModel {
  const CollectionModel({
    required this.id,
    required this.invoiceNumber,
    required this.customerName,
    required this.dueDate,
    required this.amount,
    required this.currency,
    required this.status,
  });

  final String id;
  final String invoiceNumber;
  final String customerName;
  final DateTime dueDate;
  final double amount;
  final String currency;
  final CollectionStatus status;

  bool get isOverdue => status != CollectionStatus.collected && dueDate.isBefore(DateTime.now());

  Map<String, dynamic> toMap() => {
        'id': id,
        'invoice_number': invoiceNumber,
        'customer_name': customerName,
        'due_date': dueDate.toIso8601String(),
        'amount': amount,
        'currency': currency,
        'status': status.name,
      };

  factory CollectionModel.fromMap(Map<String, dynamic> map) => CollectionModel(
        id: map['id'] as String,
        invoiceNumber: map['invoice_number'] as String,
        customerName: map['customer_name'] as String,
        dueDate: DateTime.parse(map['due_date'] as String),
        amount: (map['amount'] as num).toDouble(),
        currency: map['currency'] as String,
        status: CollectionStatus.values.firstWhere((e) => e.name == map['status']),
      );
}

String encodeMaps(List<Map<String, dynamic>> value) => jsonEncode(value);
List<Map<String, dynamic>> decodeMaps(String value) => (jsonDecode(value) as List).cast<Map<String, dynamic>>();
