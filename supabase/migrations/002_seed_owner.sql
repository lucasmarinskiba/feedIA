-- Migration: seed owner user
-- Run this AFTER 001_supabase_rls.sql and AFTER enabling Supabase Auth.
-- Creates the hardcoded owner/admin user (lucasdmaron@gmail.com) if it does not exist.

BEGIN;

-- Insert into auth.users using Supabase Auth Admin or directly if service role.
-- NOTE: This example uses the default Supabase Auth schema and UUID generation.
-- In production, prefer creating the user via Supabase Dashboard or Auth Admin API,
-- then only insert the profile row below.
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid(),
  'lucasdmarin@gmail.com',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Owner","role":"owner"}'::jsonb,
  now(),
  now(),
  'authenticated',
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'lucasdmarin@gmail.com'
)
RETURNING id;

-- Insert the owner profile row in public.users.
INSERT INTO public.users (id, email, role, plan, credits_balance, created_at, updated_at)
SELECT
  au.id,
  au.email,
  'owner',
  'enterprise',
  100000,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'lucasdmarin@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.email = 'lucasdmarin@gmail.com'
  );

-- Ensure owner has admin collaborator access on the owner account (self-collaborator).
INSERT INTO public.account_collaborators (account_id, user_id, role, invited_by, invited_at, accepted_at)
SELECT
  a.id,
  u.id,
  'owner',
  u.id,
  now(),
  now()
FROM public.accounts a
JOIN public.users u ON u.email = 'lucasdmarin@gmail.com'
WHERE a.user_id = u.id
  AND NOT EXISTS (
    SELECT 1 FROM public.account_collaborators ac
    WHERE ac.account_id = a.id AND ac.user_id = u.id
  );

COMMIT;
