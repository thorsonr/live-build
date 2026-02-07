-- LiVE Pro Database Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  storage_mode TEXT DEFAULT 'cloud' CHECK (storage_mode IN ('cloud', 'local')),
  api_key_encrypted TEXT,            -- BYOK: encrypted Claude API key
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'max', 'past_due', 'cancelled', 'suspended')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days'),
  is_admin BOOLEAN DEFAULT FALSE,
  analysis_limit_override INT DEFAULT NULL,   -- Admin override for analysis quota
  chat_limit_override INT DEFAULT NULL,       -- Admin override for chat quota
  forced_model TEXT DEFAULT NULL,             -- Admin-forced AI model
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVITE CODES TABLE
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
  bonus_analyses INT DEFAULT 0,              -- Extra AI analyses granted to redeemer
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick code lookup
CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- =============================================
-- CONNECTIONS TABLE (stored for cloud sync users)
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
  email_encrypted TEXT,              -- Encrypted if stored
  connected_on DATE,
  message_count INT DEFAULT 0,
  last_contact DATE,
  rel_strength TEXT CHECK (rel_strength IN ('strong', 'warm', 'cold', 'new')),
  is_dormant BOOLEAN DEFAULT FALSE,
  endorsement_count INT DEFAULT 0,
  categories JSONB DEFAULT '{}',     -- {"Recruiters": true, "Executives": false}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_company ON connections(user_id, company);
CREATE INDEX idx_connections_strength ON connections(user_id, rel_strength);
CREATE INDEX idx_connections_dormant ON connections(user_id, is_dormant) WHERE is_dormant = TRUE;

-- =============================================
-- AI INSIGHTS TABLE (cached AI responses)
-- =============================================
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('outreach_draft', 'network_strategy', 'content_coach')),
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  prompt_used TEXT,                  -- For debugging/improvement
  metadata JSONB DEFAULT '{}',       -- Tone, template used, etc.
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_connection ON ai_insights(connection_id);

-- =============================================
-- USAGE LOGS TABLE (track AI usage for billing)
-- =============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,             -- 'outreach_draft', 'network_strategy', etc.
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  model TEXT DEFAULT 'claude-3-opus',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_date ON usage_logs(created_at);

-- =============================================
-- USAGE QUOTAS TABLE (monthly limits)
-- =============================================
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,          -- "2026-02"
  ai_calls_used INT DEFAULT 0,
  ai_calls_limit INT DEFAULT 100,    -- Based on subscription tier (legacy)
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

-- =============================================
-- CUSTOM CATEGORIES TABLE
-- =============================================
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,          -- Array of keywords
  color TEXT,                        -- Optional UI color
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user ON custom_categories(user_id);

-- =============================================
-- NETWORK ANALYSIS TABLE (cached analytics)
-- =============================================
CREATE TABLE network_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_connections INT,
  category_counts JSONB,             -- {"Recruiters": 45, "Executives": 120}
  company_counts JSONB,              -- Top companies
  strength_breakdown JSONB,          -- {"strong": 10, "warm": 50, ...}
  dormant_count INT,
  years_building INT,
  engagement_rate DECIMAL(5,2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all user-data tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users see own connections" ON connections
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own AI insights
CREATE POLICY "Users see own insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own usage
CREATE POLICY "Users see own usage" ON usage_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own quotas" ON usage_quotas
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own categories
CREATE POLICY "Users see own categories" ON custom_categories
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see their own analysis
CREATE POLICY "Users see own analysis" ON network_analysis
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get or create monthly quota
CREATE OR REPLACE FUNCTION get_or_create_quota(p_user_id UUID)
RETURNS usage_quotas AS $$
DECLARE
  v_month_year TEXT;
  v_quota usage_quotas;
  v_limit INT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');

  -- Try to get existing quota
  SELECT * INTO v_quota FROM usage_quotas
  WHERE user_id = p_user_id AND month_year = v_month_year;

  IF FOUND THEN
    RETURN v_quota;
  END IF;

  -- Get user's subscription to determine limit
  SELECT CASE
    WHEN subscription_status = 'active' THEN 100
    WHEN subscription_status = 'trial' THEN 10
    ELSE 0
  END INTO v_limit
  FROM users WHERE id = p_user_id;

  -- Create new quota
  INSERT INTO usage_quotas (user_id, month_year, ai_calls_limit)
  VALUES (p_user_id, v_month_year, COALESCE(v_limit, 10))
  RETURNING * INTO v_quota;

  RETURN v_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
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
  -- Get or create quota
  v_quota := get_or_create_quota(p_user_id);

  -- Check if over limit (unless BYOK)
  IF v_quota.ai_calls_used >= v_quota.ai_calls_limit THEN
    -- Check if user has BYOK
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = p_user_id AND api_key_encrypted IS NOT NULL
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Calculate cost (rough estimate: $15/M input, $75/M output for Opus)
  v_cost_cents := (p_tokens_in * 15 / 10000) + (p_tokens_out * 75 / 10000);

  -- Log usage
  INSERT INTO usage_logs (user_id, feature, tokens_in, tokens_out, cost_cents)
  VALUES (p_user_id, p_feature, p_tokens_in, p_tokens_out, v_cost_cents);

  -- Update quota
  UPDATE usage_quotas
  SET ai_calls_used = ai_calls_used + 1
  WHERE user_id = p_user_id AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at on users
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
-- ADMIN VIEWS (for dashboard)
-- =============================================

-- View for admin analytics (no PII)
CREATE OR REPLACE VIEW admin_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for usage analytics
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
-- SEED DATA
-- =============================================

-- Create admin user (update with real credentials)
-- INSERT INTO users (email, password_hash, name, is_admin, subscription_status)
-- VALUES ('admin@live-pro.com', 'HASH_HERE', 'Admin', TRUE, 'active');

-- Create initial invite codes
-- INSERT INTO invite_codes (code, max_uses, expires_at)
-- VALUES
--   ('BETA2026', 100, NOW() + INTERVAL '90 days'),
--   ('VIP-ACCESS', 10, NOW() + INTERVAL '30 days');
