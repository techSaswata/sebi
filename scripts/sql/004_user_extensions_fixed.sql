-- User Extensions for NyayChain Platform
-- Extends Supabase's built-in auth.users table
-- Fixed version - doesn't modify auth schema tables

-- Extended user profile information
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

-- Solana wallet addresses linked to user accounts
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

-- User notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity audit log
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address VARCHAR(100),
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON public.user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_primary ON public.user_wallets(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_wallet ON public.user_activity_log(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity_log(activity_type);

-- Function for updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON public.user_wallets;
CREATE TRIGGER update_user_wallets_updated_at 
  BEFORE UPDATE ON public.user_wallets 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Users can only see and modify their own profile
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

-- Users can only see and modify their own wallets
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

-- Users can only see their own notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity_log;
CREATE POLICY "Users can view own activity" ON public.user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- View for easy access to user profile with wallets
CREATE OR REPLACE VIEW public.user_profiles_with_wallets AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  up.display_name,
  up.bio,
  up.location,
  up.website,
  up.investment_experience,
  up.risk_tolerance,
  up.preferred_investment_amount,
  up.kyc_status,
  up.settings,
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', uw.id,
        'wallet_address', uw.wallet_address,
        'wallet_type', uw.wallet_type,
        'nickname', uw.nickname,
        'is_primary', uw.is_primary,
        'verified', uw.verified,
        'last_used_at', uw.last_used_at
      ) ORDER BY uw.is_primary DESC, uw.last_used_at DESC
    ) FILTER (WHERE uw.id IS NOT NULL),
    '[]'::json
  ) as wallets
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.user_wallets uw ON u.id = uw.user_id
GROUP BY u.id, u.email, u.created_at, 
         up.display_name, up.bio, up.location, up.website, 
         up.investment_experience, up.risk_tolerance, 
         up.preferred_investment_amount, up.kyc_status, up.settings;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on auth.users needs to be created via Supabase Dashboard
-- Go to Database > Webhooks or use the Dashboard's SQL editor with elevated permissions

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information for NyayChain platform';
COMMENT ON TABLE public.user_wallets IS 'Solana wallet addresses linked to user accounts';
COMMENT ON TABLE public.user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE public.user_activity_log IS 'Audit log of user activities for compliance and analytics';
