import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/core/supabase/supabase_client.dart';
import 'package:rosterpro_app/core/theme/app_theme.dart';
import 'package:rosterpro_app/core/routing/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await initializeSupabase();

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'RosterPro',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
