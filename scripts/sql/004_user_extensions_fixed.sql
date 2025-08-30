-- DEPRECATED: Use clean-database-schema.sql instead
-- This file contains old/conflicting schema
-- Run clean-database-schema.sql in Supabase SQL Editor

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
