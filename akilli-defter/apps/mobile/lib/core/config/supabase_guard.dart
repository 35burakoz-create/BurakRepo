import 'package:supabase_flutter/supabase_flutter.dart';

bool isSupabaseReady() {
  try {
    final _ = Supabase.instance.client;
    return Supabase.initialized;
  } catch (_) {
    return false;
  }
}
