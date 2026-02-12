import 'package:supabase_flutter/supabase_flutter.dart';

bool isSupabaseReady() {
  try {
    return Supabase.initialized;
  } catch (_) {
    return false;
  }
}
