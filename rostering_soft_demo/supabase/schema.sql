-- RosterPro Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles table (synced with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('system_admin', 'roster_planner', 'manager', 'employee')) default 'employee',
  created_at timestamptz default now()
);

-- 2. Shifts table
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  duration int not null,
  created_at timestamptz default now()
);

-- 3. Rosters table
create table if not exists rosters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  roster_date date not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_rosters_user_id on rosters(user_id);
create index if not exists idx_rosters_shift_id on rosters(shift_id);
create index if not exists idx_rosters_date on rosters(roster_date);

-- Row Level Security
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table rosters enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Allow service role full access (for admin API routes)
create policy "Service role has full access to profiles"
  on profiles for all
  using (auth.role() = 'service_role');

-- Shifts: all authenticated can read, admin/planner can modify
create policy "Shifts are viewable by authenticated users"
  on shifts for select
  to authenticated
  using (true);

create policy "Service role has full access to shifts"
  on shifts for all
  using (auth.role() = 'service_role');

-- Rosters: authenticated can read, service role can modify
create policy "Rosters are viewable by authenticated users"
  on rosters for select
  to authenticated
  using (true);

create policy "Service role has full access to rosters"
  on rosters for all
  using (auth.role() = 'service_role');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

-- Trigger for auto-creating profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
