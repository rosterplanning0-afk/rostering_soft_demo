✅ Railway Operations Rostering Software — Demo Version
Implementation Plan (For Gemma 4 Code Generation)
Architecture: Next.js 14 (App Router) + Supabase + Vercel

✅ 1. Project Goals
This demo version aims to:

Build a simplified, fully functional rostering SaaS demo
Use Supabase (Postgres + Auth) as backend
Use Next.js 14 (App Router) for frontend + API routes
Host the entire project on Vercel
Provide clean code structure so stakeholders can test core features

Production features like Docker, Redis, Nginx, Worker Queues, HOER full engine, etc. are not required — only demo versions.

✅ 2. Tech Stack Requirements
Frontend + Backend

Next.js 14 (App Router)
TypeScript
TailwindCSS
Shadcn UI (optional but recommended)
Supabase JS Client

Backend / Database

Supabase Postgres
Supabase Auth (email/password)
Row Level Security (RLS)
Supabase Storage (optional for uploads)

Hosting

Vercel (Next.js)
Supabase Cloud (DB/Auth/Storage)


✅ 3. Application Modules (Required for Demo)
Gemma 4 must generate code for the following modules:
✅ 1. Authentication

Login
Signup
Auth middleware using Supabase
Role assignment during signup
“AuthGuard” for server components

✅ 2. User Profiles

/profiles table synced with Supabase auth.users
Basic CRUD for admin users
Role selection (system_admin, roster_planner, employee)

✅ 3. Shift Management

List default shifts
CRUD interface
Table + Modal for editing

✅ 4. Rostering (minimal demo)

Create roster entries
Assign user → shift → date
Calendar or table-based view
API validation

✅ 5. Dashboard

Logged‑in user info
Upcoming shift
Quick actions


✅ 4. Database Schema (Supabase SQL)
Gemma must generate SQL migrations or seed files based on this schema:
Table: profiles
SQLcreate table profiles (  id uuid primary key references auth.users (id),  full_name text,  role text check (role in ('system_admin', 'roster_planner', 'manager', 'employee')),  created_at timestamp default now());``Show more lines

Table: shifts
SQLcreate table shifts (  id uuid primary key default gen_random_uuid(),  code text unique not null,  name text not null,  start_time time,  end_time time,  duration int,  created_at timestamp default now());Show more lines
Default values:

MORNING – 06:00–14:00
AFTERNOON – 14:00–22:00
NIGHT – 22:00–06:00


Table: rosters
SQLcreate table rosters (  id uuid primary key default gen_random_uuid(),  user_id uuid references profiles(id),  shift_id uuid references shifts(id),  roster_date date not null,  status text default 'draft',  created_at timestamp default now());Show more lines

✅ 5. Required Folder Structure
Gemma 4 must generate this structure:
/app
  /auth
    /login
    /signup
  /dashboard
  /shifts
  /rosters
  /api
    /auth
      signup
      login
    /profiles
    /shifts
    /rosters
/lib
  supabase.ts
  auth.ts
/components
  Navbar.tsx
  Sidebar.tsx
  DataTable.tsx
  Modal.tsx
  Form.tsx
/styles
  globals.css


✅ 6. Environment Variables
Gemma must expect these variables:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=


✅ 7. Required API Endpoints (Next.js Route Handlers)
Gemma must implement:
✅ Auth
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me

✅ Profiles
GET    /api/profiles
PUT    /api/profiles/:id
DELETE /api/profiles/:id

✅ Shifts
GET    /api/shifts
POST   /api/shifts
PATCH  /api/shifts/:id
DELETE /api/shifts/:id

✅ Rosters
GET    /api/rosters
POST   /api/rosters
PATCH  /api/rosters/:id
DELETE /api/rosters/:id


✅ 8. Required UI Screens
Gemma must generate the following UI screens using Next.js Server Components + TailwindCSS.
✅ /login

email + password
redirect to /dashboard

✅ /signup

email, password, role, full name
creates entry in profiles

✅ /dashboard

Welcome header
Next shift summary
Quick links

✅ /shifts

Table of shifts
Add/Edit/Delete shift modals

✅ /rosters

Table of roster entries
Form: select user → shift → date

✅ /users (Optional)

List of profiles
Role management


✅ 9. Authentication Flow Requirements
Gemma must implement:
✅ Supabase Auth login
✅ Server-side session validation
✅ Middleware to protect all private routes
✅ Redirect unauthenticated users → /auth/login

✅ 10. UI Technology Requirements
Gemma must use:

TailwindCSS
Reusable components
Form validation using Zod (optional)
Loading states
Error boundaries


✅ 11. Deployment Requirements
Gemma must ensure:
✅ All API routes are compatible with Vercel serverless
✅ Use Supabase client with NEXT_PUBLIC keys on frontend
✅ Use service role key only inside API routes
✅ No database connection outside Supabase
✅ No Docker, no Express, no Redis — not needed in demo

✅ 12. What the Model Must Deliver
Gemma 4 should generate:
✅ All pages & components
✅ All API handlers
✅ Supabase database schema
✅ Role-based access control
✅ Demo data seed
✅ TypeScript types
✅ Clean UI with Tailwind
✅ Complete working codebase

✅ 13. Optional Additional Features (Only if asked)
Gemma should leave hooks for:

Trip chart module
Timetable CSV import
HoER validations
Attendance tracking
Notifications module


✅ 14. Final Instructions to Gemma 4
“You must generate a complete Next.js 14 + Supabase codebase exactly following this implementation plan. Use TypeScript, App Router, TailwindCSS, and Supabase Client. Include all routes, folders, UI screens, and API handlers described. Implement RBAC, authentication, shifts, rosters, and profiles modules fully. Ensure code is deployable to Vercel without modification.”

✅ END OF DOCUMENT