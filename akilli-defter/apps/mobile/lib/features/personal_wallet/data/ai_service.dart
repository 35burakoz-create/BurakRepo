import '../../../core/ai/ai_gateway.dart';

class CategorySuggestion {
  const CategorySuggestion({
    required this.categoryId,
    required this.confidence,
    required this.explanation,
    this.errorCode,
  });

  final String? categoryId;
  final double confidence;
  final String explanation;
  final String? errorCode;
}

class WeeklySummary {
  const WeeklySummary({
    required this.summaryTr,
    required this.summaryEn,
    required this.actionItems,
    this.errorCode,
  });

  final String summaryTr;
  final String summaryEn;
  final List<String> actionItems;
  final String? errorCode;
}

class AiService {
  String _friendlyAiMessage(AiGatewayResponse response) {
    if (response.errorCode == 'quota_exceeded') {
      return 'Günlük AI kotan doldu. Planını yükselterek devam edebilirsin.';
    }
    return response.message ?? '';
  }

  AiService({AiGateway? gateway}) : _gateway = gateway ?? AiGateway();

  final AiGateway _gateway;

  Future<CategorySuggestion?> suggestCategory({
    required String workspaceId,
    required String text,
    required String merchant,
    required double amount,
    required String currency,
  }) async {
    final response = await _gateway.request(
      endpoint: 'categorize_transaction',
      payload: {
        'workspace_id': workspaceId,
        'text': text,
        'merchant': merchant,
        'amount': amount,
        'currency': currency,
      },
    );

    if (!response.success || response.data == null) {
      if (response.message != null && response.message!.isNotEmpty) {
        return CategorySuggestion(
          categoryId: null,
          confidence: 0,
          explanation: _friendlyAiMessage(response),
          errorCode: response.errorCode,
        );
      }
      return null;
    }

    final data = response.data!;
    return CategorySuggestion(
      categoryId: data['category_id'] as String?,
      confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
      explanation: (data['explanation'] ?? '') as String,
      errorCode: null,
    );
  }

  Future<WeeklySummary?> weeklySummary({
    required String workspaceId,
    required DateTime start,
    required DateTime end,
  }) async {
    final response = await _gateway.request(
      endpoint: 'weekly_summary',
      payload: {
        'workspace_id': workspaceId,
        'date_range': {
          'start': start.toIso8601String().split('T').first,
          'end': end.toIso8601String().split('T').first,
        },
      },
    );

    if (!response.success || response.data == null) {
      if (response.message != null && response.message!.isNotEmpty) {
        return WeeklySummary(
          summaryTr: _friendlyAiMessage(response),
          summaryEn: 'AI coach is currently disabled. You can enable it from Settings > AI.',
          actionItems: const [],
          errorCode: response.errorCode,
        );
      }
      return null;
    }

    final data = response.data!;
    return WeeklySummary(
      summaryTr: (data['summary_text_tr'] ?? '') as String,
      summaryEn: (data['summary_text_en'] ?? '') as String,
      actionItems: ((data['action_items'] ?? []) as List).map((e) => '$e').toList(),
      errorCode: null,
    );
  }
}
