-- Add force_password_change column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;

-- For existing users, set force_password_change to false
UPDATE public.profiles SET force_password_change = false WHERE force_password_change IS TRUE;
