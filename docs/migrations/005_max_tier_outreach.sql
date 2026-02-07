-- Migration 005: Max tier + outreach message generator
-- Adds 'max' and 'suspended' to allowed subscription statuses
-- Adds outreach quota columns to usage_quotas

-- Update subscription_status CHECK constraint to include 'max' and 'suspended'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'max', 'past_due', 'cancelled', 'suspended'));

-- Add outreach quota columns
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS outreach_calls_used INT DEFAULT 0;
ALTER TABLE usage_quotas ADD COLUMN IF NOT EXISTS outreach_calls_limit INT DEFAULT 0;
