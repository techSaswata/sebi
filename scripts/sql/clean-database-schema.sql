-- Clean Database Schema - Drop conflicting tables and create proper setup
-- Run this in Supabase SQL Editor

-- 1. DROP conflicting tables
DROP TABLE IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.user_profiles_with_wallets CASCADE;

-- 2. Ensure user_profiles table has correct structure
-- (It should already exist, this just ensures it's correct)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(500),
  investment_experience VARCHAR(50) CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced', 'professional')),
  risk_tolerance VARCHAR(50) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  preferred_investment_amount DECIMAL(15, 2),
  kyc_status VARCHAR(50) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),
  kyc_documents JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure user_wallets table has correct structure
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(100) NOT NULL,
  wallet_type VARCHAR(50) NOT NULL CHECK (wallet_type IN ('phantom', 'solflare', 'glow', 'slope', 'ledger', 'other')),
  nickname VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

-- 4. Row Level Security (RLS) Policies for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Row Level Security (RLS) Policies for user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.user_wallets;
CREATE POLICY "Users can view own wallets" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON public.user_wallets;
CREATE POLICY "Users can update own wallets" ON public.user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.user_wallets;
CREATE POLICY "Users can insert own wallets" ON public.user_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallets" ON public.user_wallets;
CREATE POLICY "Users can delete own wallets" ON public.user_wallets
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create profiles for existing authenticated users (if they don't exist)
INSERT INTO public.user_profiles (user_id, display_name, created_at, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', email),
  created_at,
  NOW()
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON public.user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_primary ON public.user_wallets(user_id, is_primary);
