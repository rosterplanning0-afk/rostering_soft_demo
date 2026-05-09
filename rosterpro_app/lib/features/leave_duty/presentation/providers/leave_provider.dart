import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/features/leave_duty/data/leave_repository.dart';

class Leave extends AsyncNotifier<void> {
  final LeaveRepository _repository = LeaveRepository();

  @override
  FutureOr<void> build() async {}

  Future<void> submitLeaveRequest({
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _repository.requestLeave(
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );
    });
  }

  Future<List<Map<String, dynamic>>> fetchRoster() async {
    return _repository.getMyRoster();
  }

  Future<List<Map<String, dynamic>>> fetchLeaveRequests() async {
    return _repository.getMyLeaveRequests();
  }
}

final leaveProvider = AsyncNotifierProvider<Leave, void>(Leave.new);

final rosterProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return LeaveRepository().getMyRoster();
});

final leaveRequestsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return LeaveRepository().getMyLeaveRequests();
});
