import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:rosterpro_app/features/dashboard/data/dashboard_repository.dart';

part 'dashboard_provider.g.dart';

@riverpod
class DashboardNotifier extends _$DashboardNotifier {
  @override
  FutureOr<DashboardData> build() async {
    return _fetchDashboardData();
  }

  Future<DashboardData> _fetchDashboardData() async {
    final repo = DashboardRepository();

    final profileFuture = repo.getUserProfile();
    final shiftsFuture = repo.getUpcomingShifts();

    final results = await Future.wait([profileFuture, shiftsFuture]);

    return DashboardData(
      profile: results[0] as Map<String, dynamic>,
      upcomingShifts: results[1] as List<Map<String, dynamic>>,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

class DashboardData {
  final Map<String, dynamic> profile;
  final List<Map<String, dynamic>> upcomingShifts;

  DashboardData({required this.profile, required this.upcomingShifts});
}
