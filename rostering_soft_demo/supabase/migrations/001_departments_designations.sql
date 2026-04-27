-- Migration 001: Departments & Designations
-- Run this in your Supabase SQL Editor after schema.sql

-- 1. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shortcode TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Designations table
CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shortcode TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_shortcode ON departments(shortcode);
CREATE INDEX IF NOT EXISTS idx_designations_shortcode ON designations(shortcode);

-- Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

-- Departments RLS
CREATE POLICY "Departments are viewable by authenticated users"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to departments"
  ON departments FOR ALL
  USING (auth.role() = 'service_role');

-- Designations RLS
CREATE POLICY "Designations are viewable by authenticated users"
  ON designations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to designations"
  ON designations FOR ALL
  USING (auth.role() = 'service_role');
