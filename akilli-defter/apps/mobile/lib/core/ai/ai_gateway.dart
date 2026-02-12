import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'local_ai_config.dart';

class AiGatewayResponse {
  const AiGatewayResponse({
    required this.success,
    this.data,
    this.message,
    this.errorCode,
  });

  final bool success;
  final Map<String, dynamic>? data;
  final String? message;
  final String? errorCode;

  static const disabledMessage = 'AI koç şu an devre dışı. Ayarlar > AI bölümünden etkinleştirebilirsin.';
}

class AiGateway {
  static const int maxInputChars = 4000;
  static const int maxOutputTokens = 600;
  static const Duration timeout = Duration(seconds: 12);

  Future<AiGatewayResponse> request({
    required String endpoint,
    required Map<String, dynamic> payload,
    int outputTokens = maxOutputTokens,
  }) async {
    final aiEnabled = await LocalAiConfig.readAiEnabledFlag();
    if (!aiEnabled || !Supabase.initialized) {
      return const AiGatewayResponse(success: false, message: AiGatewayResponse.disabledMessage, errorCode: 'ai_disabled');
    }

    final limitedPayload = _limitPayloadStrings(payload);
    final clampedTokens = outputTokens > maxOutputTokens ? maxOutputTokens : outputTokens;

    try {
      final result = await Supabase.instance.client.functions.invoke(
        'ai_proxy',
        body: {
          'feature': endpoint,
          'payload': limitedPayload,
          'max_output_tokens': clampedTokens,
        },
      ).timeout(timeout);

      final root = (result.data as Map?)?.cast<String, dynamic>();
      if (root == null) {
        return const AiGatewayResponse(success: false, message: 'AI servisinden geçerli yanıt alınamadı.', errorCode: 'invalid_response');
      }

      final ok = root['ok'] == true;
      if (!ok) {
        return AiGatewayResponse(
          success: false,
          errorCode: root['error'] as String?,
          message: (root['message_tr'] as String?) ?? 'AI isteği tamamlanamadı.',
        );
      }

      final data = (root['data'] as Map?)?.cast<String, dynamic>();
      if (data == null) {
        return const AiGatewayResponse(success: false, message: 'AI servisinden geçerli yanıt alınamadı.', errorCode: 'invalid_response');
      }
      return AiGatewayResponse(success: true, data: data);
    } on TimeoutException {
      return const AiGatewayResponse(success: false, message: 'AI servisi zaman aşımına uğradı. Lütfen tekrar deneyin.', errorCode: 'timeout');
    } on FunctionException catch (e) {
      final details = e.details;
      if (details is Map) {
        final map = details.cast<String, dynamic>();
        return AiGatewayResponse(
          success: false,
          errorCode: (map['code'] ?? map['error']) as String?,
          message: (map['message_tr'] ?? map['message']) as String? ?? 'AI isteği tamamlanamadı.',
        );
      }
      return const AiGatewayResponse(success: false, message: 'AI isteği tamamlanamadı.', errorCode: 'function_error');
    } catch (_) {
      return const AiGatewayResponse(success: false, message: 'AI servisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.', errorCode: 'network_error');
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
