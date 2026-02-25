import 'package:flutter/foundation.dart';

class AppConfig {
  // Replace these placeholders with your real Supabase project values.
  static const String supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

  // Tire-first default. Multi-city support can switch this later.
  static const String defaultCityId = 'tire';

  // Admin/backend API base URL for billing verification (PHASE-2).
  static const String adminApiBaseUrl = String.fromEnvironment(
    'ADMIN_API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String androidPackageName = String.fromEnvironment(
    'ANDROID_PACKAGE_NAME',
    defaultValue: '',
  );

  // AdMob release IDs should be provided via --dart-define.
  static const String releaseHomeBannerAdUnitId = String.fromEnvironment(
    'ADMOB_HOME_BANNER_ID',
    defaultValue: '',
  );
  static const String releaseDetailBannerAdUnitId = String.fromEnvironment(
    'ADMOB_DETAIL_BANNER_ID',
    defaultValue: '',
  );

  static String get homeBannerAdUnitId => kDebugMode
      ? 'ca-app-pub-3940256099942544/6300978111'
      : releaseHomeBannerAdUnitId;

  static String get detailBannerAdUnitId => kDebugMode
      ? 'ca-app-pub-3940256099942544/6300978111'
      : releaseDetailBannerAdUnitId;
}
