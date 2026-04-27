import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:rosterpro_app/features/leave_duty/data/leave_repository.dart';

part 'leave_provider.g.dart';

@riverpod
class Leave extends _$Leave {
  final LeaveRepository _repository = LeaveRepository();

  @override
  FutureOr<void> build() async {
    // Initial build doesn't necessarily need to load data
    // as we might have separate providers for roster and leave requests,
    // but for simplicity in this demo, we'll handle state transitions here.
    return;
  }

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
    return await _repository.getMyRoster();
  }

  Future<List<Map<String, dynamic>>> fetchLeaveRequests() async {
    return await _repository.getMyLeaveRequests();
  }
}

@riverpod
Future<List<Map<String, dynamic>>> rosterProvider(RosterProviderRef ref) async {
  return LeaveRepository().getMyRoster();
}

@riverpod
Future<List<Map<String, dynamic>>> leaveRequestsProvider(LeaveRequestsProviderRef ref) async {
  return LeaveRepository().getMyLeaveRequests();
}
