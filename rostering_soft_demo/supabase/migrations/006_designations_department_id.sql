-- Migration 006: Add department_id to Designations
-- Run this in your Supabase SQL Editor

ALTER TABLE designations 
ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- Update RLS if needed, though they inherit basic policies, it might be good to index it
CREATE INDEX IF NOT EXISTS idx_designations_department_id ON designations(department_id);
