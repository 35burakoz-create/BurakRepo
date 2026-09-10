import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';

class BillingPurchaseResult {
  const BillingPurchaseResult({required this.success, this.message});

  final bool success;
  final String? message;
}

class BillingService {
  BillingService({InAppPurchase? iap}) : _iap = iap ?? InAppPurchase.instance;

  final InAppPurchase _iap;

  static const sponsorProductIds = <String>{
    'pickup_sponsor_7d',
    'pickup_sponsor_30d',
    'pickup_sponsor_weekly',
    'pickup_sponsor_monthly',
  };

  Future<ProductDetailsResponse> querySponsorProducts() {
    return _iap.queryProductDetails(sponsorProductIds);
  }

  Future<BillingPurchaseResult> buy(ProductDetails product) async {
    final purchaseParam = PurchaseParam(productDetails: product);
    final started = await _iap.buyNonConsumable(purchaseParam: purchaseParam);
    if (!started) {
      return const BillingPurchaseResult(
        success: false,
        message: 'Satın alma başlatılamadı.',
      );
    }
    return const BillingPurchaseResult(success: true);
  }

  Future<BillingPurchaseResult> verifyPurchase({
    required PurchaseDetails purchase,
    required String pickupPointId,
  }) async {
    final session = SupabaseService.client.auth.currentSession;
    if (session == null) {
      return const BillingPurchaseResult(
        success: false,
        message: 'Oturum bulunamadı.',
      );
    }

    final token = purchase.verificationData.serverVerificationData;
    if (token.trim().isEmpty) {
      return const BillingPurchaseResult(
        success: false,
        message: 'Purchase token alınamadı.',
      );
    }

    final uri = Uri.parse('${AppConfig.adminApiBaseUrl}/api/billing/verify');
    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${session.accessToken}',
      },
      body: jsonEncode({
        'productId': purchase.productID,
        'purchaseToken': token,
        'pickup_point_id': pickupPointId,
        'packageName': AppConfig.androidPackageName,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      debugPrint('Billing verify failed: ${response.statusCode} ${response.body}');
      return BillingPurchaseResult(
        success: false,
        message: 'Doğrulama başarısız (${response.statusCode}).',
      );
    }

    if (purchase.pendingCompletePurchase) {
      try {
        await _iap.completePurchase(purchase);
      } catch (e) {
        debugPrint('completePurchase failed: $e');
        return BillingPurchaseResult(
          success: false,
          message: 'Satın alma doğrulandı fakat tamamlama (acknowledge) başarısız oldu. Lütfen tekrar deneyin.',
        );
      }
    }

    return const BillingPurchaseResult(success: true);
  }

  Future<void> restorePurchases() => _iap.restorePurchases();
}
