import 'package:supabase_flutter/supabase_flutter.dart';

class CategorySuggestion {
  const CategorySuggestion({
    required this.categoryId,
    required this.confidence,
    required this.explanation,
  });

  final String? categoryId;
  final double confidence;
  final String explanation;
}

class WeeklySummary {
  const WeeklySummary({
    required this.summaryTr,
    required this.summaryEn,
    required this.actionItems,
  });

  final String summaryTr;
  final String summaryEn;
  final List<String> actionItems;
}

class AiService {
  AiService({required this.isAiEnabled});

  final bool Function() isAiEnabled;

  Future<CategorySuggestion?> suggestCategory({
    required String workspaceId,
    required String text,
    required String merchant,
    required double amount,
    required String currency,
  }) async {
    if (!isAiEnabled() || !Supabase.initialized) return null;

    try {
      final result = await Supabase.instance.client.functions.invoke(
        'categorize_transaction',
        body: {
          'workspace_id': workspaceId,
          'text': text,
          'merchant': merchant,
          'amount': amount,
          'currency': currency,
        },
      );
      final data = result.data as Map<String, dynamic>?;
      if (data == null) return null;
      return CategorySuggestion(
        categoryId: data['category_id'] as String?,
        confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
        explanation: (data['explanation'] ?? '') as String,
      );
    } catch (_) {
      return null;
    }
  }

  Future<WeeklySummary?> weeklySummary({
    required String workspaceId,
    required DateTime start,
    required DateTime end,
  }) async {
    if (!isAiEnabled() || !Supabase.initialized) return null;

    try {
      final result = await Supabase.instance.client.functions.invoke(
        'weekly_summary',
        body: {
          'workspace_id': workspaceId,
          'date_range': {
            'start': start.toIso8601String().split('T').first,
            'end': end.toIso8601String().split('T').first,
          },
        },
      );
      final data = result.data as Map<String, dynamic>?;
      if (data == null) return null;
      return WeeklySummary(
        summaryTr: (data['summary_text_tr'] ?? '') as String,
        summaryEn: (data['summary_text_en'] ?? '') as String,
        actionItems: ((data['action_items'] ?? []) as List).map((e) => '$e').toList(),
      );
    } catch (_) {
      return null;
    }
  }
}
