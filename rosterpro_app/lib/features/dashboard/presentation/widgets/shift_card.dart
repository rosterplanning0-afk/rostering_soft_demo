import 'package:flutter/material.dart';

class ShiftCard extends StatelessWidget {
  final Map<String, dynamic> shiftData;
  final Map<String, dynamic> rosterData;

  const ShiftCard({
    super.key,
    required this.shiftData,
    required this.rosterData,
  });

  Color _getShiftColor() {
    final code = shiftData['code']?.toString().toUpperCase() ?? '';
    if (code.contains('MORNING')) return Colors.orange.shade300;
    if (code.contains('AFTERNOON')) return Colors.blue.shade300;
    if (code.contains('NIGHT')) return Colors.indigo.shade400;
    return Colors.grey.shade300;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceVariant,
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 8,
          height: 40,
          decoration: BoxDecoration(
            color: _getShiftColor(),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        title: Text(
          shiftData['name'] ?? 'Unknown Shift',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  rosterData['roster_date'] ?? 'No Date',
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  '${shiftData['start_time']} - ${shiftData['end_time']}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
