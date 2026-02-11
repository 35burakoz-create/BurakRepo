import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'local_ai_config.dart';

class AiGatewayResponse {
  const AiGatewayResponse({
    required this.success,
    this.data,
    this.message,
  });

  final bool success;
  final Map<String, dynamic>? data;
  final String? message;

  static const disabledMessage = 'AI koç şu an devre dışı. Ayarlar > AI bölümünden etkinleştirebilirsin.';
}

class AiGateway {
  static const int maxInputChars = 4000;
  static const int maxOutputTokens = 350;
  static const Duration timeout = Duration(seconds: 12);

  Future<AiGatewayResponse> request({
    required String endpoint,
    required Map<String, dynamic> payload,
    int outputTokens = maxOutputTokens,
  }) async {
    final aiEnabled = await LocalAiConfig.readAiEnabledFlag();
    if (!aiEnabled || !Supabase.initialized) {
      return const AiGatewayResponse(success: false, message: AiGatewayResponse.disabledMessage);
    }

    final limitedPayload = _limitPayloadStrings(payload);
    limitedPayload['max_output_tokens'] = outputTokens > maxOutputTokens ? maxOutputTokens : outputTokens;

    try {
      final result = await Supabase.instance.client.functions.invoke(
        endpoint,
        body: limitedPayload,
      ).timeout(timeout);

      final data = (result.data as Map?)?.cast<String, dynamic>();
      if (data == null) {
        return const AiGatewayResponse(success: false, message: 'AI servisinden geçerli yanıt alınamadı.');
      }
      return AiGatewayResponse(success: true, data: data);
    } on TimeoutException {
      return const AiGatewayResponse(success: false, message: 'AI servisi zaman aşımına uğradı. Lütfen tekrar deneyin.');
    } catch (_) {
      return const AiGatewayResponse(success: false, message: 'AI servisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  Map<String, dynamic> _limitPayloadStrings(Map<String, dynamic> input) {
    final output = <String, dynamic>{};

    for (final entry in input.entries) {
      final value = entry.value;
      if (value is String) {
        output[entry.key] = value.length > maxInputChars ? value.substring(0, maxInputChars) : value;
      } else if (value is Map<String, dynamic>) {
        output[entry.key] = _limitPayloadStrings(value);
      } else {
        output[entry.key] = value;
      }
    }

    return output;
  }
}
