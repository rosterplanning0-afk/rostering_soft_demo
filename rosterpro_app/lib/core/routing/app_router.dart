import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:rosterpro_app/core/supabase/supabase_client.dart';
import 'package:rosterpro_app/features/auth/presentation/login_screen.dart';
import 'package:rosterpro_app/features/splash/presentation/splash_screen.dart';
import 'package:rosterpro_app/features/dashboard/presentation/dashboard_screen.dart';
import 'package:rosterpro_app/features/leave_duty/presentation/leave_duty_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final supabase = Supabase.instance.client;

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final session = supabase.auth.currentSession;
      final bool isAuthenticated = session != null;

      final bool isLoggingIn = state.matchedLocation == '/login';
      final bool isSplash = state.matchedLocation == '/splash';

      // If not authenticated and not on splash/login, redirect to login
      if (!isAuthenticated && !isLoggingIn && !isSplash) {
        return '/login';
      }

      // If authenticated and trying to go to login, redirect to dashboard
      if (isAuthenticated && isLoggingIn) {
        return '/dashboard';
      }

      // Allow splash screen to handle its own redirection logic based on session
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreenWrapper(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/leave-duty',
        builder: (context, state) => const LeaveDutyScreen(),
      ),
    ],
  );
});
