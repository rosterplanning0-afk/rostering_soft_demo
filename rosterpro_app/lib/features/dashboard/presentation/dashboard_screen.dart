import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/features/dashboard/presentation/providers/dashboard_provider.dart';
import 'package:rosterpro_app/features/dashboard/presentation/widgets/shift_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardNotifierProvider);

    return Scaffold(
      body: dashboardAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error loading dashboard: $err'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(dashboardNotifierProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final profile = data.profile;
          final shifts = data.upcomingShifts;
          final fullName = profile['full_name'] ?? 'Employee';

          return CustomScrollView(
            slivers: [
              SliverAppBar.large(
                title: Text('Hello, $fullName!'),
                backgroundColor: Theme.of(context).colorScheme.surface,
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Text(
                    'Your Upcoming Shifts',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ),
              shifts.isEmpty
                  ? SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.event_busy, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            const Text(
                              'No shifts assigned currently.',
                              style: TextStyle(color: Colors.grey, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final roster = shifts[index];
                          final shift = roster['shifts'] as Map<String, dynamic>;
                          return ShiftCard(
                            rosterData: roster,
                            shiftData: shift,
                          );
                        },
                        childCount: shifts.length,
                      ),
                    ),
            ],
          );
        },
      ),
    );
  }
}
