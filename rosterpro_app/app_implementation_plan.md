# Employee Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Flutter mobile application for employees to manage their login, view their dashboard, and handle leave and duty requests using the existing Supabase backend.

**Architecture:** Feature-first layered architecture. Each feature (auth, dashboard, leave_duty) contains its own UI, business logic (providers), and data layers. State management is handled by **Riverpod** for reactive updates and dependency injection.

**Tech Stack:** 
- **Framework:** Flutter (Stable channel)
- **State Management:** flutter_riverpod, riverpod_annotation
- **Backend:** supabase_flutter (Auth, Postgres, RLS)
- **Routing:** go_router
- **UI:** Material 3, flutter_spinkit (for loading)

---

## File Mapping

### Core / Shared
- `lib/core/constants/app_constants.dart`: API keys, theme colors, and strings.
- `lib/core/routing/app_router.dart`: GoRouter configuration.
- `lib/core/supabase/supabase_client.dart`: Singleton Supabase initialization.
- `lib/core/theme/app_theme.dart`: Custom Material 3 theme data.

### Feature: Auth
- `lib/features/auth/data/auth_repository.dart`: Supabase auth logic (login, session).
- `lib/features/auth/presentation/login_screen.dart`: Login UI.
- `lib/features/auth/presentation/providers/auth_provider.dart`: Auth state management.

### Feature: Splash
- `lib/features/splash/presentation/splash_screen.dart`: Animated logo and session check logic.

### Feature: Dashboard
- `lib/features/dashboard/data/dashboard_repository.dart`: Fetching upcoming shifts/user profile.
- `lib/features/dashboard/presentation/dashboard_screen.dart`: Employee overview UI.
- `lib/features/dashboard/presentation/widgets/shift_card.dart`: Individual shift UI component.
- `lib/features/dashboard/presentation/providers/dashboard_provider.dart`: Dashboard state.

### Feature: Leave & Duty
- `lib/features/leave_duty/data/leave_repository.dart`: CRUD for leave requests and roster viewing.
- `lib/features/leave_duty/presentation/leave_duty_screen.dart`: Management interface.
- `lib/features/leave_duty/presentation/widgets/leave_request_form.dart`: Modal/Form for requests.
- `lib/features/leave_duty/presentation/providers/leave_provider.dart`: State for leave/roster data.

---

## Implementation Tasks

### Task 1: Project Setup & Core Configuration

**Files:**
- Create: `lib/core/constants/app_constants.dart`
- Create: `lib/core/supabase/supabase_client.dart`
- Create: `lib/core/theme/app_theme.dart`
- Modify: `pubspec.yaml`

- [ ] **Step 1: Add dependencies to pubspec.yaml**
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  go_router: ^13.0.0
  flutter_spinkit: ^5.2.0
```
- [ ] **Step 2: Define AppConstants with Supabase URL and Anon Key**
- [ ] **Step 3: Implement SupabaseClient initialization**
- [ ] **Step 4: Set up Material 3 Theme in app_theme.dart**
- [ ] **Step 5: Commit**

### Task 2: Routing & Navigation Shell

**Files:**
- Create: `lib/core/routing/app_router.dart`
- Modify: `lib/main.dart`

- [ ] **Step 1: Implement GoRouter with routes for `/splash`, `/login`, `/dashboard`, and `/leave-duty`**
- [ ] **Step 2: Add a redirect guard to check if user is authenticated**
- [ ] **Step 3: Wrap the app in `ProviderScope` in main.dart**
- [ ] **Step 4: Verify navigation by manually triggering routes**
- [ ] **Step 5: Commit**

### Task 3: Splash Screen & Session Logic

**Files:**
- Create: `lib/features/splash/presentation/splash_screen.dart`

- [ ] **Step 1: Create UI with Center-aligned Logo and `flutter_spinkit` loader**
- [ ] **Step 2: Implement `initState` logic to check `supabase.auth.currentSession`**
- [ ] **Step 3: Navigate to `/dashboard` if session exists, otherwise `/login` after 2 seconds**
- [ ] **Step 4: Test with existing session and fresh start**
- [ ] **Step 5: Commit**

### Task 4: Authentication Flow (Login)

**Files:**
- Create: `lib/features/auth/data/auth_repository.dart`
- Create: `lib/features/auth/presentation/providers/auth_provider.dart`
- Create: `lib/features/auth/presentation/login_screen.dart`

- [ ] **Step 1: Implement `AuthRepository.signIn(email, password)` using `supabase.auth.signInWithPassword`**
- [ ] **Step 2: Create `authProvider` to track login status and error messages**
- [ ] **Step 3: Build Login UI with Email/Password fields and validation**
- [ ] **Step 4: Connect UI to `authProvider` and handle navigation on success**
- [ ] **Step 5: Test with valid/invalid credentials**
- [ ] **Step 6: Commit**

### Task 5: Employee Dashboard

**Files:**
- Create: `lib/features/dashboard/data/dashboard_repository.dart`
- Create: `lib/features/dashboard/presentation/providers/dashboard_provider.dart`
- Create: `lib/features/dashboard/presentation/dashboard_screen.dart`
- Create: `lib/features/dashboard/presentation/widgets/shift_card.dart`

- [ ] **Step 1: Implement `DashboardRepository.getUpcomingShifts()` querying the `rosters` table joined with `shifts`**
- [ ] **Step 2: Create `dashboardProvider` (AsyncNotifier) to fetch and cache shift data**
- [ ] **Step 3: Build `DashboardScreen` with a greeting and a `ListView` of `ShiftCard` widgets**
- [ ] **Step 4: Implement loading and empty states using `ref.watch(dashboardProvider).when(...)`**
- [ ] **Step 5: Verify data flows from Supabase to the UI**
- [ ] **Step 6: Commit**

### Task 6: Leave & Duty Management

**Files:**
- Create: `lib/features/leave_duty/data/leave_repository.dart`
- Create: `lib/features/leave_duty/presentation/providers/leave_provider.dart`
- Create: `lib/features/leave_duty/presentation/leave_duty_screen.dart`
- Create: `lib/features/leave_duty/presentation/widgets/leave_request_form.dart`

- [ ] **Step 1: Implement `LeaveRepository.requestLeave(startDate, endDate, reason)` inserting into a `leave_requests` table**
- [ ] **Step 2: Implement `LeaveRepository.getMyRoster()` to fetch full employee roster**
- [ ] **Step 3: Build `LeaveDutyScreen` with two tabs: "My Roster" and "Leave Requests"**
- [ ] **Step 4: Create `LeaveRequestForm` modal with date pickers and text field**
- [ ] **Step 5: Connect form submission to `leaveProvider` and refresh roster data**
- [ ] **Step 6: Verify RLS policies allow employees to only see/create their own requests**
- [ ] **Step 7: Commit**

---

## Testing Strategy

1. **Unit Tests**: Test `AuthRepository` and `DashboardRepository` using `mocktail` to mock Supabase responses.
2. **Widget Tests**: Verify that `LoginScreen` displays error messages on failed auth.
3. **Integration Tests**: Run a full flow: `Splash` -> `Login` -> `Dashboard` -> `Request Leave`.
4. **RLS Verification**: Use a test account with the `employee` role to ensure they cannot modify other employees' rosters.
