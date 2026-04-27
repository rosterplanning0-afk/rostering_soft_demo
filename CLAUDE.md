# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Railway Operations Rostering SaaS demo built with Next.js 14 (App Router) + Supabase. The demo is a simplified, fully functional rostering system for assigning employees to shifts. Production infrastructure (Docker, Redis, Nginx, worker queues, HOER engine) is out of scope.

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Hosting**: Vercel (Next.js), Supabase Cloud

## Core Modules

1. **Authentication** — Supabase email/password auth. Server-side session validation via middleware. Unauthenticated users redirected to `/auth/login`.
2. **Profiles** — Synced with `auth.users`. Roles: `system_admin`, `roster_planner`, `manager`, `employee`.
3. **Shifts** — Default shifts: MORNING (06:00–14:00), AFTERNOON (14:00–22:00), NIGHT (22:00–06:00).
4. **Rosters** — Assignment entries linking user → shift → date. Status: draft/confirmed.
5. **Dashboard** — User's next shift, quick actions.

## Database Schema (Supabase Postgres)

- `profiles`: `id` (FK auth.users), `full_name`, `role`, `created_at`
- `shifts`: `id`, `code` (unique), `name`, `start_time`, `end_time`, `duration`, `created_at`
- `rosters`: `id`, `user_id` (FK profiles), `shift_id` (FK shifts), `roster_date`, `status`, `created_at`

## Required API Endpoints (Next.js Route Handlers)

```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
GET    /api/profiles
PUT    /api/profiles/:id
DELETE /api/profiles/:id
GET    /api/shifts
POST   /api/shifts
PATCH  /api/shifts/:id
DELETE /api/shifts/:id
GET    /api/rosters
POST   /api/rosters
PATCH  /api/rosters/:id
DELETE /api/rosters/:id
```

## Folder Structure

```
/app
  /auth/login, /auth/signup
  /dashboard, /shifts, /rosters, /users
  /api/auth/{signup,login}, /api/profiles, /api/shifts, /api/rosters
/lib
  supabase.ts, auth.ts
/components
  Navbar.tsx, Sidebar.tsx, DataTable.tsx, Modal.tsx, Form.tsx
/styles
  globals.css
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

On frontend use `NEXT_PUBLIC` keys via `@supabase/supabase-js`. On API routes use `SUPABASE_SERVICE_ROLE_KEY`.

## Commands (when code exists)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests
```

## UI Requirements

- TailwindCSS throughout
- Form validation (Zod recommended)
- Loading states and error boundaries on all pages
- Table + Modal pattern for CRUD operations
- Role-based access control (RBAC) via Supabase RLS + middleware guards

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
