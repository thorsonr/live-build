-- Migration: Token Optimization + Admin AI Dashboard
-- Run this in Supabase SQL Editor
-- Date: 2026-02-05

-- =============================================
-- 1. Fix ai_insights CHECK constraint to include 'full_analysis'
-- =============================================
ALTER TABLE ai_insights DROP CONSTRAINT ai_insights_insight_type_check;
ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_insight_type_check
  CHECK (insight_type IN ('outreach_draft', 'network_strategy', 'content_coach', 'full_analysis'));

-- =============================================
-- 2. Update default model in usage_logs
-- =============================================
ALTER TABLE usage_logs ALTER COLUMN model SET DEFAULT 'claude-sonnet-4-20250514';

-- =============================================
-- 3. Add 'cost' column to usage_logs (decimal, not cents)
-- =============================================
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0;

-- =============================================
-- 4. Create platform_config table for admin-controlled settings
-- =============================================
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Seed default config values
INSERT INTO platform_config (key, value) VALUES
  ('ai_model', '"claude-sonnet-4-20250514"'),
  ('max_connections', '1500'),
  ('max_shares', '100'),
  ('max_tokens', '8192')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 5. RLS for platform_config (admin-only via service role)
-- =============================================
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — platform_config is only accessed
-- via supabaseAdmin (service role) in backend admin routes.
