import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rosterpro_app/features/auth/data/auth_repository.dart';
import 'package:rosterpro_app/core/supabase/supabase_client.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(supabase: getSupabaseClient());
});

class AuthState {
  final bool isLoading;
  final String? errorMessage;
  final bool isAuthenticated;

  AuthState({
    this.isLoading = false,
    this.errorMessage,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool? isAuthenticated,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref ref;

  AuthNotifier(this.ref) : super(AuthState());

  Future<void> signIn(String email, String password) async {
    final authRepo = ref.read(authRepositoryProvider);

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final response = await authRepo.signIn(email, password);
      if (response.session != null) {
        state = state.copyWith(isLoading: false, isAuthenticated: true);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Authentication failed: No session found.');
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceAll('AuthException: ', ''),
      );
    }
  }

  Future<void> signOut() async {
    final authRepo = ref.read(authRepositoryProvider);
    await authRepo.signOut();
    state = state.copyWith(isAuthenticated: false);
  }
}
