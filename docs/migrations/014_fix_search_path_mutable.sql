-- Migration 014: Fix mutable search_path on functions
-- Supabase linter warns that functions without SET search_path are vulnerable to
-- search_path injection attacks. Pin search_path to 'public' on all functions.

-- Fix get_or_create_quota
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix increment_usage
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix redeem_invite_code
CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
