import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:rosterpro_app/core/supabase/supabase_client.dart';

class DashboardRepository {
  final SupabaseClient _client = getSupabaseClient();

  Future<Map<String, dynamic>> getUserProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    final data = await _client
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single();

    return data;
  }

  Future<List<Map<String, dynamic>>> getUpcomingShifts() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // Query rosters joined with shifts
    // We filter by user_id and roster_date >= today
    final now = DateTime.now().toIso8601String().split('T')[0];

    final response = await _client
        .from('rosters')
        .select('*, shifts(*)')
        .eq('user_id', user.id)
        .gte('roster_date', now)
        .order('roster_date', ascending: true);

    return List<Map<String, dynamic>>.from(response);
  }
}
