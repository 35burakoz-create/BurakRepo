import 'package:shared_preferences/shared_preferences.dart';

class LocalAiConfig {
  static const String aiEnabledStorageKey = 'ai_enabled';
  static const String flagName = 'AI_ENABLED';

  static Future<bool> readAiEnabledFlag() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(aiEnabledStorageKey) ?? false;
  }
}
