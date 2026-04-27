import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/features/leave_duty/presentation/providers/leave_provider.dart';
import 'package:rosterpro_app/features/dashboard/presentation/widgets/shift_card.dart';
import 'package:rosterpro_app/features/leave_duty/presentation/widgets/leave_request_form.dart';

class LeaveDutyScreen extends ConsumerStatefulWidget {
  const LeaveDutyScreen({super.key});

  @override
  ConsumerState<LeaveDutyScreen> createState() => _LeaveDutyScreenState();
}

class _LeaveDutyScreenState extends ConsumerState<LeaveDutyScreen> with TickerProviderStateMixin {
  int _selectedTabIndex = 0;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _selectedTabIndex = _tabController.index;
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _onTabSelected(int index) {
    setState(() {
      _selectedTabIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave & Duty'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'My Roster'),
            Tab(text: 'Leave Requests'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRosterView(),
          _buildLeaveRequestsView(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showLeaveRequestForm(context),
        label: const Text('Request Leave'),
        icon: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildRosterView() {
    final rosterAsync = ref.watch(rosterProvider);

    return rosterAsync.when(
      data: (rosters) => rosters.isEmpty
          ? const Center(child: Text('No assigned duties found.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: rosters.length,
              itemBuilder: (context, index) {
                final roster = rosters[index];
                final shift = roster['shifts'];
                return ShiftCard(
                  rosterData: roster,
                  shiftData: shift ?? {},
                );
              },
            ),
      error: (err, stack) => Center(child: Text('Error loading roster: $err')),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildLeaveRequestsView() {
    final leaveAsync = ref.watch(leaveRequestsProvider);

    return leaveAsync.when(
      data: (requests) => requests.isEmpty
          ? const Center(child: Text('No leave requests found.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              itemBuilder: (context, index) {
                final req = requests[index];
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListTile(
                    title: Text('${req['start_date']} to ${req['end_date']}'),
                    subtitle: Text('Reason: ${req['reason']}\nStatus: ${req['status']?.toString().toUpperCase() ?? 'UNKNOWN'}'),
                    trailing: _buildStatusIcon(req['status']),
                  ),
                );
              },
            ),
      error: (err, stack) => Center(child: Text('Error loading leave requests: $err')),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildStatusIcon(String? status) {
    switch (status?.toLowerCase()) {
      case 'approved':
        return const Icon(Icons.check_circle, color: Colors.green);
      case 'rejected':
        return const Icon(Icons.cancel, color: Colors.red);
      default:
        return const Icon(Icons.hourglass_empty, color: Colors.orange);
    }
  }

  void _showLeaveRequestForm(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const LeaveRequestForm(),
    );
  }
}
