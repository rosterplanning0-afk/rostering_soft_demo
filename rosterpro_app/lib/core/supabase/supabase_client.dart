import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:rosterpro_app/core/constants/app_constants.dart';

Future<void> initializeSupabase() async {
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    anonKey: AppConstants.supabaseAnonKey,
  );
}

SupabaseClient getSupabaseClient() {
  return Supabase.instance.client;
}
