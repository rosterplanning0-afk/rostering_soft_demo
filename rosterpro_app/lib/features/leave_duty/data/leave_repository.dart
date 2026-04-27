import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:rosterpro_app/core/supabase/supabase_client.dart';

class LeaveRepository {
  final SupabaseClient _client = getSupabaseClient();

  Future<void> requestLeave({
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    await _client.from('leave_requests').insert({
      'user_id': user.id,
      'start_date': startDate.toIso8601String().split('T')[0],
      'end_date': endDate.toIso8601String().split('T')[0],
      'reason': reason,
      'status': 'pending',
    });
  }

  Future<List<Map<String, dynamic>>> getMyRoster() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    final response = await _client
        .from('rosters')
        .select('*, shifts(*)')
        .eq('user_id', user.id)
        .order('roster_date', ascending: true);

    return List<Map<String, dynamic>>.from(response);
  }

  Future<List<Map<String, dynamic>>> getMyLeaveRequests() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    final response = await _client
        .from('leave_requests')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false);

    return List<Map<String, dynamic>>.from(response);
  }
}
