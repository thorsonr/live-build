-- =============================================
-- LiVE Pro — Full Staging Database Setup
-- Run this in a FRESH Supabase project SQL Editor
-- Consolidates schema.sql + migrations 001–011
-- Generated: 2026-02-08
-- =============================================


-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  storage_mode TEXT DEFAULT 'cloud' CHECK (storage_mode IN ('cloud', 'local')),
  api_key_encrypted TEXT,
  preferred_model TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'max', 'past_due', 'cancelled', 'suspended', 'deleted')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days'),
  is_admin BOOLEAN DEFAULT FALSE,
  analysis_limit_override INT DEFAULT NULL,
  chat_limit_override INT DEFAULT NULL,
  forced_model TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);


-- =============================================
-- 2. INVITE CODES TABLE
-- =============================================
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,
  bonus_analyses INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — accessed via service role only


-- =============================================
-- 3. CONNECTIONS TABLE
-- =============================================
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  company TEXT,
  linkedin_url TEXT,
  email_encrypted TEXT,
  connected_on DATE,
  message_count INT DEFAULT 0,
  last_contact DATE,
  rel_strength TEXT CHECK (rel_strength IN ('strong', 'warm', 'cold', 'new')),
  is_dormant BOOLEAN DEFAULT FALSE,
  endorsement_count INT DEFAULT 0,
  categories JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_company ON connections(user_id, company);
CREATE INDEX idx_connections_strength ON connections(user_id, rel_strength);
CREATE INDEX idx_connections_dormant ON connections(user_id, is_dormant) WHERE is_dormant = TRUE;

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own connections" ON connections
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 4. AI INSIGHTS TABLE
-- =============================================
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('outreach_draft', 'network_strategy', 'content_coach', 'full_analysis')),
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  prompt_used TEXT,
  metadata JSONB DEFAULT '{}',
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_connection ON ai_insights(connection_id);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 5. USAGE LOGS TABLE
-- =============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_date ON usage_logs(created_at);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own usage" ON usage_logs
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 6. USAGE QUOTAS TABLE
-- =============================================
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  ai_calls_used INT DEFAULT 0,
  ai_calls_limit INT DEFAULT 100,
  analysis_calls_used INT DEFAULT 0,
  analysis_calls_limit INT DEFAULT 1,
  chat_calls_used INT DEFAULT 0,
  chat_calls_limit INT DEFAULT 0,
  outreach_calls_used INT DEFAULT 0,
  outreach_calls_limit INT DEFAULT 0,
  exports_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own quotas" ON usage_quotas
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 7. CUSTOM CATEGORIES TABLE
-- =============================================
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user ON custom_categories(user_id);

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own categories" ON custom_categories
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 8. NETWORK ANALYSIS TABLE
-- =============================================
CREATE TABLE network_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_connections INT,
  category_counts JSONB,
  company_counts JSONB,
  strength_breakdown JSONB,
  dormant_count INT,
  years_building INT,
  engagement_rate DECIMAL(5,2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE network_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own analysis" ON network_analysis
  FOR ALL USING (auth.uid() = user_id);


-- =============================================
-- 9. PLATFORM CONFIG TABLE (admin-only)
-- =============================================
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — accessed via service role only

INSERT INTO platform_config (key, value) VALUES
  ('ai_model', '"claude-haiku-4-5-20251001"'),
  ('max_connections', '1500'),
  ('max_shares', '100'),
  ('max_tokens', '8192')
ON CONFLICT (key) DO NOTHING;


-- =============================================
-- 10. ANALYSIS ARCHIVES TABLE
-- =============================================
CREATE TABLE analysis_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_count INT,
  ai_analysis JSONB,
  analytics_summary JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_archives_user ON analysis_archives(user_id);

ALTER TABLE analysis_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own archives" ON analysis_archives
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own archives" ON analysis_archives
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 11. ENGAGEMENT TRACKER TABLE
-- =============================================
CREATE TABLE engagement_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  contact_position TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified','contacted','replied','meeting','closed','parked')),
  notes TEXT,
  engagement_log JSONB DEFAULT '[]',
  last_action_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE engagement_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tracker" ON engagement_tracker
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tracker_user ON engagement_tracker(user_id);


-- =============================================
-- 12. FEEDBACK TABLE
-- =============================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_own" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);


-- =============================================
-- 13. HELPER FUNCTIONS
-- =============================================

-- Get or create monthly quota
CREATE OR REPLACE FUNCTION get_or_create_quota(p_user_id UUID)
RETURNS usage_quotas AS $$
DECLARE
  v_month_year TEXT;
  v_quota usage_quotas;
  v_limit INT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');

  SELECT * INTO v_quota FROM usage_quotas
  WHERE user_id = p_user_id AND month_year = v_month_year;

  IF FOUND THEN
    RETURN v_quota;
  END IF;

  SELECT CASE
    WHEN subscription_status = 'active' THEN 100
    WHEN subscription_status = 'trial' THEN 10
    ELSE 0
  END INTO v_limit
  FROM users WHERE id = p_user_id;

  INSERT INTO usage_quotas (user_id, month_year, ai_calls_limit)
  VALUES (p_user_id, v_month_year, COALESCE(v_limit, 10))
  RETURNING * INTO v_quota;

  RETURN v_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_tokens_in INT DEFAULT 0,
  p_tokens_out INT DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota usage_quotas;
  v_cost_cents INT;
BEGIN
  v_quota := get_or_create_quota(p_user_id);

  IF v_quota.ai_calls_used >= v_quota.ai_calls_limit THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = p_user_id AND api_key_encrypted IS NOT NULL
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  v_cost_cents := (p_tokens_in * 15 / 10000) + (p_tokens_out * 75 / 10000);

  INSERT INTO usage_logs (user_id, feature, tokens_in, tokens_out, cost_cents)
  VALUES (p_user_id, p_feature, p_tokens_in, p_tokens_out, v_cost_cents);

  UPDATE usage_quotas
  SET ai_calls_used = ai_calls_used + 1
  WHERE user_id = p_user_id AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic invite code redemption
CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code invite_codes%ROWTYPE;
  v_bonus INTEGER;
BEGIN
  SELECT * INTO v_code FROM invite_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF v_code.use_count >= v_code.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Invite code fully redeemed');
  END IF;

  IF v_code.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code expired');
  END IF;

  UPDATE invite_codes
  SET use_count = use_count + 1,
      redeemed_by = p_user_id,
      redeemed_at = NOW()
  WHERE code = p_code;

  v_bonus := COALESCE(v_code.bonus_analyses, 0);
  IF v_bonus > 0 THEN
    UPDATE users SET analysis_limit_override = v_bonus WHERE id = p_user_id;
  END IF;

  RETURN json_build_object('success', true, 'bonus_analyses', v_bonus);
END;
$$;


-- =============================================
-- 14. TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 15. ADMIN VIEWS
-- =============================================

CREATE OR REPLACE VIEW admin_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW admin_usage AS
SELECT
  DATE(created_at) as date,
  feature,
  COUNT(*) as call_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(cost_cents) as total_cost_cents
FROM usage_logs
GROUP BY DATE(created_at), feature
ORDER BY date DESC;


-- =============================================
-- DONE. Now go to Authentication > Providers
-- and enable Email + (optionally) Google OAuth.
-- =============================================
