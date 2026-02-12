-- Migration 006: Security Hardening
-- RLS policies for users and invite_codes tables
-- Atomic invite code redemption function

-- ============================================
-- Enable RLS on users table
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own row (field restrictions enforced by backend API)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own row (on signup via backend)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Enable RLS on invite_codes table
-- ============================================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- No direct user access — all operations go through backend service role

-- ============================================
-- Atomic invite code redemption function
-- Prevents race condition on use_count
-- ============================================
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
  -- Lock and validate the invite code atomically
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

  -- Atomically increment use count
  UPDATE invite_codes
  SET use_count = use_count + 1,
      redeemed_by = p_user_id,
      redeemed_at = NOW()
  WHERE code = p_code;

  -- Apply bonus analyses to user if any
  v_bonus := COALESCE(v_code.bonus_analyses, 0);
  IF v_bonus > 0 THEN
    UPDATE users SET analysis_limit_override = v_bonus WHERE id = p_user_id;
  END IF;

  RETURN json_build_object('success', true, 'bonus_analyses', v_bonus);
END;
$$;
