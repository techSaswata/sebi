-- Debug Profile API - Quick database fix
-- Run this in Supabase SQL Editor

-- 1. Check if user_profiles table exists and has data
SELECT 'user_profiles table check:' as info;
SELECT COUNT(*) as profile_count FROM public.user_profiles;

-- 2. Check if your user has a profile
SELECT 'Your user profile:' as info;
SELECT up.*, u.email 
FROM public.user_profiles up 
RIGHT JOIN auth.users u ON up.user_id = u.id 
WHERE u.email = 'saswata1945@gmail.com';

-- 3. Create profile for your user if missing
INSERT INTO public.user_profiles (user_id, display_name, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', email),
  created_at,
  NOW()
FROM auth.users 
WHERE email = 'saswata1945@gmail.com'
  AND id NOT IN (SELECT user_id FROM public.user_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verify the profile was created
SELECT 'Profile after insert:' as info;
SELECT up.*, u.email 
FROM public.user_profiles up 
RIGHT JOIN auth.users u ON up.user_id = u.id 
WHERE u.email = 'saswata1945@gmail.com';
