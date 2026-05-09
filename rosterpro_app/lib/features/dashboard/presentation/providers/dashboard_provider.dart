import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/features/dashboard/data/dashboard_repository.dart';

class DashboardData {
  final Map<String, dynamic> profile;
  final List<Map<String, dynamic>> upcomingShifts;

  DashboardData({required this.profile, required this.upcomingShifts});
}

class DashboardNotifier extends AsyncNotifier<DashboardData> {
  @override
  Future<DashboardData> build() async {
    return _fetchDashboardData();
  }

  Future<DashboardData> _fetchDashboardData() async {
    final repo = DashboardRepository();
    final results = await Future.wait([
      repo.getUserProfile(),
      repo.getUpcomingShifts(),
    ]);
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

final dashboardNotifierProvider =
    AsyncNotifierProvider<DashboardNotifier, DashboardData>(
  DashboardNotifier.new,
);
