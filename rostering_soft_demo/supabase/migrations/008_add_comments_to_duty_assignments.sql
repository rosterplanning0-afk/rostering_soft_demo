-- Migration 008: Add comments to duty assignments
-- Run this manually in Supabase SQL Editor if needed

ALTER TABLE duty_assignments ADD COLUMN IF NOT EXISTS comments TEXT;
