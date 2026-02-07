-- Migration 004: Tiered Subscriptions, Chat Quotas, Admin Overrides
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. New columns on usage_quotas for per-feature tracking
-- =============================================
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS analysis_calls_used INT DEFAULT 0;
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS analysis_calls_limit INT DEFAULT 1;
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS chat_calls_used INT DEFAULT 0;
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS chat_calls_limit INT DEFAULT 0;

-- Backfill existing data: copy ai_calls_used → analysis_calls_used
UPDATE usage_quotas SET analysis_calls_used = ai_calls_used WHERE analysis_calls_used = 0 AND ai_calls_used > 0;

-- =============================================
-- 2. User-level quota overrides and forced model (admin-configurable)
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS analysis_limit_override INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_limit_override INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS forced_model TEXT DEFAULT NULL;

-- =============================================
-- 3. Invite code bonus analyses
-- =============================================
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS bonus_analyses INT DEFAULT 0;

-- =============================================
-- 4. Update default trial period from 14 days to 5 days
-- =============================================
ALTER TABLE users ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '5 days');
